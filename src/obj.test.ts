import {it,expect} from 'vitest'
import {shellMesh,columnObj} from './obj'
import {initialColumn,addTerminals,readColumn,segmentConfig,segmentIssues} from './column'
import {radiusAt} from './engine'
const small={...initialColumn,segments:initialColumn.segments.slice(0,2).map(s=>({...s,height:12}))}
it('exports closed oriented manifold shells with exact height and positive volume',()=>{
 const mesh=shellMesh(small,0),edges=new Map<string,number[]>();let vol=0
 for(const f of mesh.faces){expect(new Set(f).size).toBe(3);for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');const q=edges.get(key)??[];q.push(a<b?1:-1);edges.set(key,q)}const [a,b,c]=f.map(j=>mesh.vertices[j]);vol+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6}
 for(const e of edges.values())expect(e).toHaveLength(2);expect([...edges.values()].every(e=>e[0]+e[1]===0)).toBe(true);expect(vol).toBeGreaterThan(0)
 expect(Math.min(...mesh.vertices.map(v=>v[2]))).toBe(0);expect(Math.max(...mesh.vertices.map(v=>v[2]))).toBe(12)
})
it('exports all named parts at assembly offsets and selected parts at local zero',()=>{
 const obj=columnObj(small),local=columnObj(small,1);expect(obj.match(/^o /gm)).toHaveLength(2);expect(local.match(/^o /gm)).toHaveLength(1)
 const zs=(s:string)=>s.split('\n').filter(l=>l.startsWith('v ')).map(l=>Number(l.split(' ')[3]));expect(Math.max(...zs(obj))).toBe(24);expect(Math.min(...zs(local))).toBe(0);expect(Math.max(...zs(local))).toBe(12)
 const n=obj.split('\n').filter(l=>l.startsWith('v ')).length;expect(obj.split('\n').filter(l=>l.startsWith('f ')).every(l=>l.slice(2).split(' ').every(v=>+v>=1&&+v<=n))).toBe(true)
})
it('preserves editable bands and reflects them in geometry and fit checks',()=>{
 const p=addTerminals(initialColumn);p.segments[0]={...p.segments[0],bands:[{position:50,width:20,depth:4,shape:'rounded'}],terminalProfile:'rounded'}
 const restored=readColumn({...p,app:'iz-column-lab'}),c=segmentConfig(restored,0);expect(c.bands).toEqual(p.segments[0].bands);expect(c.terminalProfile).toBe('rounded');expect(radiusAt(c,30)-radiusAt({...c,bands:[]},30)).toBeCloseTo(4)
 expect(segmentIssues(restored,0).join()).toContain('too quickly');const mesh=shellMesh(restored,0);expect(Math.max(...mesh.vertices.filter(v=>v[2]===30).map(v=>Math.hypot(v[0],v[1])))).toBeCloseTo(radiusAt(c,30)+c.bead/2)
})
it('builds finite hollow envelopes for beads and loops',()=>{for(const treatment of ['beads','loops'] as const){const m=shellMesh({...small,config:{...small.config,treatment}},0);expect(m.vertices.every(v=>v.every(Number.isFinite))).toBe(true);expect(m.faces.length).toBeGreaterThan(0)}})
