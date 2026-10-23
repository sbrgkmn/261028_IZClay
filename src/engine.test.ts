import {describe,it,expect} from 'vitest'
import {defaults,normalize,generate,patternAt,radiusAt,exportGcode,motifs,planExtrusion,usesSpiral,type Config} from './engine'
describe('periodic patterns',()=>{
 for(const {id} of motifs)it(`${id} meets across the cylinder seam`,()=>{
  const c={...defaults,motif:id,margin:0,phase:37,twist:65}
  for(let z=5;z<140;z+=3){expect(patternAt(c,0,z)).toBeCloseTo(patternAt(c,2*Math.PI,z),9);expect(Math.abs(patternAt(c,-1e-7,z)-patternAt(c,1e-7,z))).toBeLessThan(.0001)}
 })
})
describe('fabrication paths',()=>{
 for(const treatment of ['relief','beads','loops'] as const)it(`${treatment} closes every path and preserves the inner wall`,()=>{
  for(const {id} of motifs)for(const profile of ['cylinder','barrel','taper'] as const){
   const c=normalize({...defaults,passes:2,seamMode:'stepped',treatment,motif:id,profile,height:20,margin:0,pitch:8,layer:2})
   const study=generate(c)
   expect(study.layers).toBe(10)
   expect(study.paths.length).toBe(20)
   for(const path of study.paths){expect(path.points[0]).toEqual(path.points.at(-1));for(const p of path.points){expect([p.x,p.y,p.z,p.strength].every(Number.isFinite)).toBe(true);const r=Math.hypot(p.x,p.y);if(path.kind==='wall')expect(r).toBeCloseTo(radiusAt(c,p.z)-c.bead*.85,8);else expect(r).toBeGreaterThanOrEqual(radiusAt(c,p.z)-1e-8)}}
   expect(study.maxRadius).toBeGreaterThan(c.diameter/2)
  }
 })
 it('zero projection returns a plain circular coupon',()=>{
  const c={...defaults,projection:0,height:20};const study=generate(c)
  expect(study.maxRadius).toBeCloseTo(c.diameter/2,9)
 })
 it('normalizes imported settings and keeps the inner radius positive',()=>{
  const c=normalize({diameter:1,height:Infinity,passes:99,shape:100,bead:12,repeats:4.4,motif:'invalid'})
  expect(c.height).toBe(defaults.height);expect(c.diameter).toBe(40);expect(c.motif).toBe(defaults.motif);expect(c.repeats).toBe(4)
  expect(c.diameter/2-c.shape-c.bead*(c.passes-1)*.85).toBeGreaterThanOrEqual(5)
 })
 it('moves while retracting before each disconnected travel, with exact E withdrawal',()=>{
  const c:Config={...defaults,seamMode:'stepped',height:20,layer:2},study=generate(c),plan=planExtrusion(c,study)
  for(const p of plan){
   expect(p.stationaryRetraction).toBe(0)
   expect(p.moves.filter(m=>m.phase==='retract').reduce((sum,m)=>sum+m.deltaE,0)).toBeCloseTo(-c.retraction,7)
   expect(p.moves.some(m=>m.phase==='coast')).toBe(true)
  }
  const body=exportGcode(c,study).split(';BEGIN_PRINT')[1].split(';END_PRINT')[0]
  expect(body).not.toMatch(/G1 E/)
  for(const line of body.split('\n'))if(line.startsWith('G0 '))expect(line).not.toMatch(/ E/)
 })
 it('rejects a path outside the build envelope or with invalid coordinates',()=>{
  const study=generate({...defaults,height:20})
  expect(()=>exportGcode(defaults,{...study,maxRadius:300})).toThrow('envelope')
  study.paths[0].points[0].x=NaN
  expect(()=>exportGcode(defaults,study)).toThrow('coordinates')
 })
})

describe('seam control and nozzle calibration',()=>{
 it('allows a 250 mm nominal diameter and exports within the Super 10 envelope',()=>{
  const c=normalize({diameter:999,height:20,profile:'barrel',shape:25,projection:15,bead:12})
  expect(c.diameter).toBe(250)
  expect(()=>exportGcode(c,generate(c))).not.toThrow()
 })
 it('defaults to a 3 mm nozzle and scales E with its matching bead width',()=>{
  const small=normalize({nozzle:3,passes:1,treatment:'relief',seamMode:'stepped',height:20,projection:0,coast:0,retractLead:0,retraction:0})
  const large=normalize({...small,nozzle:6,bead:undefined})
  expect(defaults.nozzle).toBe(3);expect(small.bead).toBe(3);expect(large.bead).toBe(6)
  const sum=(c:Config)=>planExtrusion(c,generate(c)).flatMap(p=>p.moves).reduce((s,m)=>s+m.deltaE,0)
  expect(sum(large)/sum(small)).toBeCloseTo(2,8)
  expect(exportGcode(small,generate(small))).toContain('Nozzle 3 mm; bead width 3 mm')
  expect(normalize({bead:4.6}).bead).toBe(4.6)
 })
 it('keeps all relief motifs continuous across spiral turns on each profile',()=>{
  for(const {id} of motifs)for(const profile of ['cylinder','barrel','taper'] as const){
   const c=normalize({motif:id,profile,treatment:'relief',passes:1,height:21,layer:2,margin:0,phase:27,twist:45})
   const study=generate(c);expect(usesSpiral(c)).toBe(true)
   let z=0,maxZ=0,maxGap=0
   for(let i=0;i<study.paths.length;i++){
    const p=study.paths[i]
    if(i){const prev=study.paths[i-1].points.at(-1)!;maxGap=Math.max(maxGap,Math.hypot(prev.x-p.points[0].x,prev.y-p.points[0].y,prev.z-p.points[0].z));expect(p.continuous).toBe(true)}
    for(const point of p.points){if(point.z<z-1e-8)throw Error('Z moved downward');z=point.z;maxZ=Math.max(maxZ,z)}
   }
   expect(maxGap).toBeLessThan(1e-8);expect(maxZ).toBe(21)
   expect(study.paths[0].startLayerHeight).toBe(2);expect(study.paths[1].startLayerHeight).toBe(0)
   expect(study.paths.at(-1)?.layerHeight).toBe(1)
  }
 })
 it('removes 57 layer restarts from the uploaded single-wall chevron configuration',()=>{
  const c=normalize({diameter:80,height:81,bead:4.6,layer:1.4,motif:'chevron',treatment:'relief',passes:1,projection:3})
  const study=generate(c),plan=planExtrusion(c,study),body=exportGcode(c,study).split(';BEGIN_PRINT')[1].split(';END_PRINT')[0]
  expect(study.layers).toBe(58)
  expect(plan.filter(p=>!p.connected)).toHaveLength(1)
  expect(plan.slice(0,-1).flatMap(p=>p.moves).every(m=>m.phase==='print'&&m.deltaE>=0)).toBe(true)
  expect(plan.flatMap(p=>p.moves).some(m=>m.phase==='recovery')).toBe(false)
  expect((body.match(/G0 /g)||[])).toHaveLength(1)
  expect(body.includes('G92')).toBe(false);expect(/G1 E/.test(body)).toBe(false)
  expect(study.paths.at(-1)?.points.at(-1)?.z).toBe(81)
  const exact80=generate({...c,height:80});expect(exact80.paths.at(-1)?.points.at(-1)?.z).toBe(80)
 })
 it('preserves separate layers for multiple walls and explicit stepped mode',()=>{
  for(const c of [normalize({passes:2,treatment:'relief'}),normalize({passes:1,treatment:'relief',seamMode:'stepped'})]){
   expect(usesSpiral(c)).toBe(false);expect(generate({...c,height:20}).paths.every(p=>!p.continuous)).toBe(true)
  }
 })
 it('supports turning off early retraction and reducing restart recovery independently',()=>{
  const c=normalize({seamMode:'stepped',height:20,layer:2,retractLead:0,coast:0,restart:50})
  const plan=planExtrusion(c,generate(c))
  expect(plan.every(p=>p.stationaryRetraction===8)).toBe(true)
  const noRecovery=planExtrusion({...c,restart:0},generate(c))
  const total=(p:typeof plan[number])=>p.moves.reduce((s,m)=>s+m.deltaE,0)
  expect(total(plan[1])-total(noRecovery[1])).toBeCloseTo(4,8)
  expect(total(plan[0])-total(noRecovery[0])).toBe(0)
 })
 it('scales the last stepped layer extrusion to its actual height',()=>{
  const c=normalize({height:21,layer:2,passes:1,treatment:'relief',projection:0,seamMode:'stepped',coast:0,retractLead:0,retraction:0})
  const plan=planExtrusion(c,generate(c)),total=(p:typeof plan[number])=>p.moves.reduce((s,m)=>s+m.deltaE,0)
  expect(total(plan.at(-1)!)/total(plan[0])).toBeCloseTo(.5,8)
 })
})

describe('vase mode for every texture',()=>{
 for(const treatment of ['relief','beads','loops'] as const)it(`${treatment} has one rising path and no per-turn pressure event`,()=>{
  for(const profile of ['cylinder','barrel','taper'] as const){
   const c=normalize({treatment,profile,height:24,layer:2,margin:0,projection:4,pitch:8,every:2,motif:'chevron'})
   const study=generate(c),plan=planExtrusion(c,study)
   expect(usesSpiral(c)).toBe(true)
   for(let l=1;l<study.paths.length;l++){
    const p=study.paths[l],prev=study.paths[l-1]
    expect(p.points[0]).toEqual(prev.points.at(-1))
    for(let i=1;i<p.points.length;i++)if(p.points[i].z<=p.points[i-1].z)throw Error(`Flat or descending spiral segment ${l}:${i}`)
   }
   expect(plan.filter(p=>!p.connected).length).toBe(1)
   expect(plan.slice(0,-1).flatMap(p=>p.moves).every(m=>m.phase==='print'&&m.deltaE>=0)).toBe(true)
   expect(plan.flatMap(p=>p.moves).some(m=>m.phase==='recovery')).toBe(false)
   const body=exportGcode(c,study).split(';BEGIN_PRINT')[1].split(';END_PRINT')[0]
   expect((body.match(/G0 /g)||[]).length).toBe(1)
   if(treatment==='loops')expect(study.excursions).toBeGreaterThan(0)
  }
 })
 it('starts new studies in spiral and marks old multi-wall studies as stepped',()=>{
  expect(usesSpiral(defaults)).toBe(true)
  expect(normalize({passes:2,seamMode:'auto'}).seamMode).toBe('stepped')
 })
})
