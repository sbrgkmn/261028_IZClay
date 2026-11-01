import {describe,it,expect} from 'vitest'
import {initialColumn,addTerminals,totalHeight,columnField,segmentField,segmentStudy,segmentGcode,segmentIssues,offsetAt,readColumn,type Column} from './column'
import {zip} from './files'
import {planExtrusion} from './engine'
import {segmentConfig} from './column'
const short:Column={...initialColumn,finish:'collar',config:{...initialColumn.config,layer:2},segments:initialColumn.segments.map(s=>({...s,height:24})),transition:6}
describe('independently printed column',()=>{
 it('blends continuously on both sides of a motif change and around 360 degrees',()=>{
  for(let i=1;i<short.segments.length;i++)for(let a=0;a<6.2;a+=.15){const z=offsetAt(short,i);expect(columnField(short,a,z-1e-6)).toBeCloseTo(columnField(short,a,z+1e-6),4)}
  for(let z=0;z<72;z+=.9)expect(columnField(short,0,z)).toBeCloseTo(columnField(short,Math.PI*2,z),8)
 })
 it('makes connected spirals with flat anchor and leveling finish on every part',()=>{
  for(let i=0;i<3;i++){
   for(let a=0;a<6.2;a+=.2){expect(segmentField(short,i,a,0)).toBe(0);expect(segmentField(short,i,a,24)).toBe(0)}
   const study=segmentStudy(short,i);expect(study.layers).toBe(13)
   for(let k=1;k<study.paths.length;k++){expect(study.paths[k].continuous).toBe(true);expect(study.paths[k].points[0]).toEqual(study.paths[k-1].points.at(-1));for(let j=1;j<study.paths[k].points.length;j++)expect(study.paths[k].points[j].z).toBeGreaterThanOrEqual(study.paths[k].points[j-1].z)}
   for(const path of [study.paths[0],study.paths.at(-1)!])expect(new Set(path.points.map(p=>p.z)).size).toBe(1)
   const plan=planExtrusion(segmentConfig(short,i),study);for(const path of plan.slice(0,-1)){expect(path.stationaryRetraction).toBe(0);expect(path.moves.some(m=>m.phase==='retract'||m.phase==='recovery')).toBe(false)}
   expect(plan.at(-1)!.path.startLayerHeight).toBe(2);expect(plan.at(-1)!.path.layerHeight).toBe(0)
   for(const path of [study.paths[0],study.paths.at(-1)!])for(const p of path.points)expect(Math.hypot(p.x,p.y)).toBeCloseTo(60,8)
   expect(study.paths.flatMap(p=>p.points).some(p=>p.strength>.5)).toBe(true)
  }
 })
 it('matches the actual first and last printed rim outlines in continuous mode',()=>{
  const p={...short,finish:'continuous' as const}
  for(let i=0;i<2;i++){
   const top=segmentStudy(p,i).paths.at(-1)!.points,bottom=segmentStudy(p,i+1).paths[0].points
   expect(top.length).toBe(bottom.length)
   for(let j=0;j<top.length;j++){expect(top[j].x).toBeCloseTo(bottom[j].x,8);expect(top[j].y).toBeCloseTo(bottom[j].y,8)}
  }
 })
 it('exports each part from a local bed, not its assembled height',()=>{
  const code=segmentGcode(short,2),body=code.split(';BEGIN_PRINT')[1].split(';END_PRINT')[0],z=[...body.matchAll(/\bZ([\d.]+)/g)].map(m=>Number(m[1]))
  expect(Math.min(...z)).toBe(2);expect(Math.max(...z)).toBeLessThanOrEqual(25);expect(code).toContain('assembly bottom Z 48 mm');expect(body.match(/G0 /g)).toHaveLength(1);expect(body).not.toContain('G92');expect(body).toContain('Continuous rise')
 })
 it('blocks oversized and fractional-layer prints',()=>{
  const p={...short,segments:[{...short.segments[0],height:352}]};expect(segmentIssues(p,0).join()).toContain('500 mm');expect(()=>segmentGcode(p,0)).toThrow()
  expect(segmentIssues({...short,segments:[{...short.segments[0],height:23}]},0).join()).toContain('whole number')
 })
 it('preserves composition on file round trip and imports older studies',()=>{
  const restored=readColumn(JSON.parse(JSON.stringify({...short,app:'iz-column-lab'})));expect(restored.segments.map(s=>[s.motif,s.height,s.rotation])).toEqual(short.segments.map(s=>[s.motif,s.height,s.rotation]))
  expect(readColumn({app:'iz-pattern-lab',config:initialColumn.config}).segments).toHaveLength(1)
  expect(()=>readColumn({app:'iz-column-lab',segments:[]})).toThrow()
 })
 it('creates a ZIP with correct local and central directory records',()=>{
  const data=zip([{name:'one.gcode',data:'G90\n'},{name:'two.gcode',data:'G91\n'}]),v=new DataView(data.buffer)
  expect(v.getUint32(0,true)).toBe(0x04034b50);expect(v.getUint32(data.length-22,true)).toBe(0x06054b50);expect(v.getUint16(data.length-12,true)).toBe(2)
  const start=v.getUint32(data.length-6,true);expect(v.getUint32(start,true)).toBe(0x02014b50)
 })
})

it('preserves U/V repetition through save and height changes',()=>{
 const p={...initialColumn,vRepeats:12};
 expect(p.config.repeats).toBe(8);
 const restored=readColumn({...p,app:'iz-column-lab'});
 expect(segmentConfig(restored,0).pitch).toBe(390/12);
 const taller={...restored,segments:restored.segments.map(s=>({...s,height:s.height*2}))};
 expect(segmentConfig(taller,0).pitch).toBe(780/12);
 expect(columnField(p,.31,85)).toBeCloseTo(columnField(taller,.31,170),8);
});

it('retains treatment and migrates all wall settings to continuous spiral',()=>{
 for(const treatment of ['relief','beads','loops'] as const)for(const passes of [1,2,3]){
  const p=readColumn({...short,app:'iz-column-lab',config:{...short.config,treatment,passes}});
  expect(segmentConfig(p,0).treatment).toBe(treatment);expect(segmentConfig(p,0).passes).toBe(1);
  const study=segmentStudy(p,0);
  expect(study.paths.length).toBe(13);
  expect(study.paths.slice(1).every(path=>path.continuous)).toBe(true);
  for(const point of study.paths.at(-1)!.points)expect(Math.hypot(point.x,point.y)).toBeCloseTo(p.config.diameter/2,8);
 }
});

it('extends beads and loops to both ends without an implicit collar',()=>{
 for(const treatment of ['beads','loops'] as const){
 const p:Column={...short,finish:'continuous',config:{...short.config,treatment,every:6},segments:[{id:'v',motif:'vertical',height:24,rotation:0}]};
 const study=segmentStudy(p,0),r=p.config.diameter/2;
 for(const path of [study.paths[0],study.paths.at(-2)!,study.paths.at(-1)!])expect(Math.max(...path.points.map(q=>Math.hypot(q.x,q.y)))).toBeGreaterThan(r+.1);
 expect(study.paths.at(-1)!.points.map(q=>[q.x,q.y])).toEqual(study.paths.at(-2)!.points.map(q=>[q.x,q.y]));
 }
});

it('exports one uninterrupted chain for every deposition treatment even from stepped settings',()=>{
 for(const treatment of ['relief','beads','loops'] as const){
 const p:Column={...short,config:{...short.config,treatment,passes:3,seamMode:'stepped'}};
 const study=segmentStudy(p,0),plan=planExtrusion(segmentConfig(p,0),study);
 for(let i=1;i<study.paths.length;i++)expect(study.paths[i].points[0]).toEqual(study.paths[i-1].points.at(-1));

 expect(segmentGcode(p,0)).toContain('continuous');
 }
});

it('keeps bead peaks uniform and matching rims across unequal parts',()=>{
 const p:Column={...initialColumn,config:{...initialColumn.config,treatment:'beads',diameter:150,projection:5,spacing:3,every:2},segments:[{id:'a',motif:'meander',height:120,rotation:0},{id:'b',motif:'arches',height:99,rotation:0},{id:'c',motif:'arches',height:120,rotation:0}]}
 const studies=p.segments.map((_,i)=>segmentStudy(p,i))
 for(const study of studies){
  const peaks=study.paths.flatMap(path=>path.points.filter(q=>q.strength>1-1e-9))
  expect(peaks.length).toBeGreaterThan(0)
  for(const q of peaks)expect(Math.hypot(q.x,q.y)-75).toBeCloseTo(5,9)
 }
 for(let i=0;i<2;i++){
  const top=studies[i].paths.at(-1)!.points,bottom=studies[i+1].paths[0].points
  expect(top.map(q=>[q.x,q.y])).toEqual(bottom.map(q=>[q.x,q.y]))
 }
 const collar=segmentStudy({...p,finish:'collar'},1)
 for(const path of [collar.paths[0],collar.paths.at(-1)!])for(const q of path.points)expect(Math.hypot(q.x,q.y)).toBeCloseTo(75,9)
})

it('persists independent pattern thickness and migrates the previous shared width',()=>{
 const p={...short,app:'iz-column-lab',config:{...short.config,ridge:4},segments:short.segments.map((s,i)=>({...s,...(i===1?{strokeWidth:7}:{})}))}
 const restored=readColumn(JSON.parse(JSON.stringify(p)))
 expect(restored.segments.map(s=>s.strokeWidth)).toEqual([4,7,4])
 expect(segmentConfig(restored,1).ridge).toBe(7)
 expect(readColumn({...p,segments:[{...p.segments[0],strokeWidth:0},{...p.segments[0],strokeWidth:99},{...p.segments[0],strokeWidth:'bad'}]}).segments.map(s=>s.strokeWidth)).toEqual([.5,12,4])
})

it('thicker motif bands select more full-depth beads without changing other segment interiors',()=>{
 const p:Column={...initialColumn,config:{...initialColumn.config,treatment:'beads',projection:5,spacing:3,every:1},segments:initialColumn.segments.map(s=>({...s,motif:'arches',height:60,strokeWidth:1}))}
 const thick:Column={...p,segments:p.segments.map((s,i)=>({...s,strokeWidth:i===1?8:1}))}
 const narrowStudy=segmentStudy(p,1),wideStudy=segmentStudy(thick,1)
 const peaks=(study:ReturnType<typeof segmentStudy>)=>study.paths.flatMap(path=>path.points.filter(q=>q.strength>1-1e-9))
 expect(peaks(wideStudy).length).toBeGreaterThan(peaks(narrowStudy).length)
 for(const q of peaks(wideStudy))expect(Math.hypot(q.x,q.y)-60).toBeCloseTo(5,9)
 for(let a=0;a<6.2;a+=.1)expect(columnField(p,a,25)).toBe(columnField(thick,a,25))
 for(let i=0;i<2;i++){
  const top=segmentStudy(thick,i).paths.at(-1)!.points,bottom=segmentStudy(thick,i+1).paths[0].points
  expect(top.map(q=>[q.x,q.y])).toEqual(bottom.map(q=>[q.x,q.y]))
 }
 expect(segmentGcode(thick,1)).toContain('Pattern line thickness 8 mm')
})

 it('preserves tall designs and checks each piece independently against its machine',()=>{
 const p=readColumn({...initialColumn,app:'iz-column-lab',segments:initialColumn.segments.map(s=>({...s,height:600,layer:2,pitch:45,repeats:12}))});
 expect(totalHeight(p)).toBe(1800);expect(segmentConfig(p,2).height).toBe(600);expect(segmentConfig(p,2).pitch).toBe(45);
 expect(segmentIssues(p,2).join()).toContain('500 mm');
 expect(segmentIssues({...p,printerId:'potterbot-10-xl'},2)).toEqual([]);
 expect(readColumn({...p,app:'iz-column-lab'}).segments[2].height).toBe(600);
 const study=segmentStudy(p,2);expect(study.paths.at(-1)!.points[0].z).toBe(600);
 });
 it('creates plain printable terminal spirals with preserved settings',()=>{
 const p=addTerminals(initialColumn);expect(addTerminals(p).segments.length).toBe(5);
 for(const i of [0,4]){const c=segmentConfig(p,i),study=segmentStudy(p,i);expect(segmentIssues(p,i)).toEqual([]);expect(c.projection).toBe(0);
 expect(study.paths.at(-1)!.points[0].z).toBe(60);for(let j=1;j<study.paths.length;j++)expect(study.paths[j].points[0]).toEqual(study.paths[j-1].points.at(-1));
 expect(segmentGcode(p,i)).toContain(';BEGIN_PRINT');
 const first=Math.hypot(study.paths[0].points[0].x,study.paths[0].points[0].y),last=Math.hypot(study.paths.at(-1)!.points[0].x,study.paths.at(-1)!.points[0].y);
 expect(i===0?first:last).toBe(72);expect(i===0?last:first).toBe(60);
 }
 expect(readColumn({...p,app:'iz-column-lab'}).segments[4].kind).toBe('capital');
 expect(segmentIssues({...p,segments:p.segments.map(s=>({...s,flare:100}))},4).join()).toContain('too quickly');
 });
