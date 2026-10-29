import {describe,it,expect} from 'vitest'
import {initialColumn,columnField,segmentField,segmentStudy,segmentGcode,segmentIssues,offsetAt,readColumn,type Column} from './column'
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
  const p={...short,segments:[{...short.segments[0],height:302}]};expect(segmentIssues(p,0).join()).toContain('300 mm');expect(()=>segmentGcode(p,0)).toThrow()
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

it('retains treatment and wall controls through column import and generation',()=>{
 for(const treatment of ['relief','beads','loops'] as const)for(const passes of [1,2,3]){
  const p=readColumn({...short,app:'iz-column-lab',config:{...short.config,treatment,passes}});
  expect(segmentConfig(p,0).treatment).toBe(treatment);expect(segmentConfig(p,0).passes).toBe(passes);
  const study=segmentStudy(p,0);
  expect(study.paths.length).toBe(passes===1?13:12*passes);
  if(passes>1)expect(study.paths.every(path=>!path.continuous)).toBe(true);
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
