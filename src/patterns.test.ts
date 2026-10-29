import {describe,it,expect} from 'vitest'
import {palette,initialColumn,columnField,segmentStudy,type Column} from './column'
import {patternAt} from './engine'
import {construction,motifDistance} from './patterns'
describe('eight source abstractions',()=>{
 it('contains seven historic constructions and one connector',()=>{expect(palette).toHaveLength(8);expect(new Set(palette.map(m=>m.id)).size).toBe(8);expect(palette.filter(m=>m.source)).toHaveLength(7);expect(palette.at(-1)!.id).toBe('vertical')})
 it('keeps vertical ribs invariant with height',()=>{for(let x=0;x<1;x+=.017)for(let y=0;y<4;y+=.19)expect(motifDistance('vertical',x,y)).toBeCloseTo(motifDistance('vertical',x,0),8)})
 it('uses a plus polygon with exactly one tile area in its periodic lattice',()=>{const edges=construction('weave').edges;const area=Math.abs(edges.reduce((a,[x,y,xx,yy])=>a+x*yy-xx*y,0))/2;expect(area).toBeCloseTo(1,9)})
 it('shares hexagon edges and square corners',()=>{for(const [x,y] of [[.25,0],[.75,0],[0,.25],[.25,.5],[0,.75]])expect(motifDistance('cells',x,y)).toBeLessThan(.004)})
 for(const m of palette)it(`${m.id} is periodic around the seam and continuous across row boundaries`,()=>{
  const c={...initialColumn.config,motif:m.id,margin:-100,height:200}
  for(let z=0;z<120;z+=1.7)expect(patternAt(c,0,z)).toBeCloseTo(patternAt(c,2*Math.PI,z),7)
  for(let row=1;row<4;row++)for(let a=0;a<6.2;a+=.09)expect(Math.abs(patternAt(c,a,row*c.pitch-1e-6)-patternAt(c,a,row*c.pitch+1e-6))).toBeLessThan(.001)
 })
 it('matches printed rim XY coordinates for all 64 ordered pattern pairs',()=>{
  for(const a of palette)for(const b of palette){
   const p:Column={...initialColumn,config:{...initialColumn.config,layer:2,diameter:60,repeats:5},transition:0,segments:[{id:'a',motif:a.id,height:20,rotation:15},{id:'b',motif:b.id,height:20,rotation:65}]}
   const top=segmentStudy(p,0).paths.at(-1)!.points,bottom=segmentStudy(p,1).paths[0].points
   expect(top.length).toBe(bottom.length)
   for(let i=0;i<top.length;i++){expect(top[i].x).toBeCloseTo(bottom[i].x,8);expect(top[i].y).toBeCloseTo(bottom[i].y,8)}
   for(let theta=0;theta<6.2;theta+=.3)expect(columnField(p,theta,20-1e-6)).toBeCloseTo(columnField(p,theta,20+1e-6),4)
  }
 },20000)
})

it('connects floral octagons to cardinal plus cells with diagonal hexagons',()=>{
 const edges=construction('rosettes').edges;
 // The octagon and cardinal cross share each of the four flat sides.
 for(const edge of [[.4,.26,.6,.26],[.74,.4,.74,.6],[.6,.74,.4,.74],[.26,.6,.26,.4]]){
  const matches=edges.filter(e=>e.every((v,i)=>Math.abs(v-edge[i])<1e-9)||e.every((v,i)=>Math.abs(v-edge[(i+2)%4])<1e-9));
  expect(matches.length).toBeGreaterThanOrEqual(2);
 }
 expect(edges.slice(-24)).toHaveLength(24);
 for(let k=0;k<4;k++){
  const hex=edges.slice(-24+k*6,-24+(k+1)*6||undefined);
  expect(hex.length).toBe(6);
  const x=hex.reduce((sum,e)=>sum+e[0],0)/6,y=hex.reduce((sum,e)=>sum+e[1],0)/6;
  expect(Math.abs(x-.5)).toBeCloseTo(.5);expect(Math.abs(y-.5)).toBeCloseTo(.5);
 }
});
