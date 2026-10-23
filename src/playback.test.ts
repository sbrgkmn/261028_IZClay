import {describe,it,expect} from 'vitest'
import {normalize,generate,exportGcode} from './engine'
import {createTimeline,sampleTimeline} from './playback'
describe('print animation',()=>{
 it('uses exactly the exported moves, including stepped travel and stationary retraction',()=>{
  for(const seamMode of ['auto','stepped'] as const)for(const retractLead of [0,1]){
   const c=normalize({height:20,layer:2,diameter:80,seamMode,retractLead})
   const study=generate(c),timeline=createTimeline(c,study)
   const body=exportGcode(c,study).split(';BEGIN_PRINT')[1].split(';END_PRINT')[0]
   let e=0,initial=true,index=0,x=0,y=0,z=0
   for(const line of body.split('\n')){
    if(line.startsWith('G92')){e=0;continue}
    if(!/^G[01] /.test(line))continue
    const values=Object.fromEntries([...line.split(';')[0].matchAll(/([XYZE])(-?[\d.]+)/g)].map(m=>[m[1],Number(m[2])]))
    const next={x:values.X===undefined?x:values.X-207.5,y:values.Y===undefined?y:values.Y-202.5,z:values.Z??z},nextE=values.E??e
    if(initial){initial=false;x=next.x;y=next.y;z=next.z;e=nextE;continue}
    if(Math.hypot(next.x-x,next.y-y,next.z-z)<1e-7&&Math.abs(nextE-e)<1e-7)continue
    const move=timeline.moves[index++]
    expect(move).toBeDefined()
    expect(move.to.x).toBeCloseTo(next.x,3);expect(move.to.y).toBeCloseTo(next.y,3);expect(move.to.z).toBeCloseTo(next.z,3)
    expect(move.deltaE).toBeCloseTo(nextE-e,3)
    x=next.x;y=next.y;z=next.z;e=nextE
   }
   expect(index).toBe(timeline.moves.length)
   expect(timeline.chains).toBe(seamMode==='auto'?1:study.layers)
  }
 })
 it('scrubs through time in order and clamps to start/end',()=>{
  const c=normalize({height:20,layer:2}),timeline=createTimeline(c,generate(c))
  expect(sampleTimeline(timeline,-10).time).toBe(0)
  expect(sampleTimeline(timeline,timeline.duration+100).fraction).toBe(1)
  let last=-1
  for(let i=0;i<=100;i++){const sample=sampleTimeline(timeline,timeline.duration*i/100);expect(sample.index).toBeGreaterThanOrEqual(last);expect(Number.isFinite(sample.position.z)).toBe(true);last=sample.index}
  const first=timeline.moves[0],half=sampleTimeline(timeline,first.end/2)
  expect(half.fraction).toBeCloseTo(.5,8)
  expect(half.position.x).toBeCloseTo((first.from.x+first.to.x)/2,8)
 })
})
