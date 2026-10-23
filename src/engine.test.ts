import {describe,it,expect} from 'vitest'
import {defaults,normalize,generate,patternAt,radiusAt,exportGcode,motifs,type Config} from './engine'
describe('periodic patterns',()=>{
 for(const {id} of motifs)it(`${id} meets across the cylinder seam`,()=>{
  const c={...defaults,motif:id,margin:0,phase:37,twist:65}
  for(let z=5;z<140;z+=3){expect(patternAt(c,0,z)).toBeCloseTo(patternAt(c,2*Math.PI,z),9);expect(Math.abs(patternAt(c,-1e-7,z)-patternAt(c,1e-7,z))).toBeLessThan(.0001)}
 })
})
describe('fabrication paths',()=>{
 for(const treatment of ['relief','beads','loops'] as const)it(`${treatment} closes every path and preserves the inner wall`,()=>{
  for(const {id} of motifs)for(const profile of ['cylinder','barrel','taper'] as const){
   const c=normalize({...defaults,treatment,motif:id,profile,height:20,margin:0,pitch:8,layer:2})
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
  const c=normalize({diameter:1,height:Infinity,passes:99,shape:100,bead:8,repeats:4.4,motif:'invalid'})
  expect(c.height).toBe(defaults.height);expect(c.diameter).toBe(40);expect(c.motif).toBe(defaults.motif);expect(c.repeats).toBe(4)
  expect(c.diameter/2-c.shape-c.bead*(c.passes-1)*.85).toBeGreaterThanOrEqual(5)
 })
 it('exports retract before every disconnected transition, with no extrusion on travel',()=>{
  const c={...defaults,height:20,layer:2};const study=generate(c),gcode=exportGcode(c,study)
  const print=gcode.split('G92 E0').slice(2).join('G92 E0').split(';END_PRINT')[0]
  expect((gcode.match(/Pressure relief before travel/g)||[]).length).toBe(study.paths.length-1)
  for(const line of print.split('\n'))if(line.startsWith('G0 '))expect(line).not.toMatch(/ E/)
  let e=0,retracts=0
  for(const line of print.split('\n')){if(line==='G92 E0'){e=0;continue}const match=line.match(/ E(-?[\d.]+)/);if(!match)continue;const next=Number(match[1]);if(line.includes('Pressure relief')){expect(e-next).toBeCloseTo(c.retraction,3);retracts++}else if(line.startsWith('G1'))expect(next).toBeGreaterThanOrEqual(e);e=next}
  expect(retracts).toBe(study.paths.length-1)
 })
 it('rejects a path outside the build envelope or with invalid coordinates',()=>{
  const study=generate({...defaults,height:20})
  expect(()=>exportGcode(defaults,{...study,maxRadius:300})).toThrow('envelope')
  study.paths[0].points[0].x=NaN
  expect(()=>exportGcode(defaults,study)).toThrow('coordinates')
 })
})
