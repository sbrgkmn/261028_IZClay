import { PRINTER_PROFILES } from './clayflow/profiles'
export type Motif = 'arches' | 'rosettes' | 'meander' | 'chevron' | 'weave' | 'blend'
export type Config = { motif: Motif; treatment: 'relief' | 'beads' | 'loops'; profile: 'cylinder' | 'barrel' | 'taper'; diameter:number; height:number; shape:number; repeats:number; pitch:number; ridge:number; projection:number; phase:number; twist:number; margin:number; spacing:number; every:number; layer:number; bead:number; passes:number; speed:number; flow:number; textureFlow:number; retraction:number; lift:number }
export const defaults: Config = { motif:'arches', treatment:'beads', profile:'cylinder', diameter:100,height:140,shape:12,repeats:10,pitch:24,ridge:2.4,projection:3.5,phase:0,twist:0,margin:8,spacing:5,every:2,layer:1.4,bead:4.6,passes:2,speed:22,flow:100,textureFlow:115,retraction:8,lift:1 }
export const motifs: Array<{id:Motif;title:string;note:string;ref:string}> = [
 {id:'arches',title:'Scalloped arches',note:'Overlapping vaults · concept study',ref:'concept-relief.jpg'},
 {id:'rosettes',title:'Floral lattice',note:'Rosettes & interlocking frames',ref:'column-floral.jpg'},
 {id:'meander',title:'Stepped meander',note:'Angular bands · column study',ref:'column-key.jpg'},
 {id:'chevron',title:'Branching chevrons',note:'Diagonal rhythm · column study',ref:'column-chevron.jpg'},
 {id:'weave',title:'Woven grid',note:'Crossing bands · interpretation',ref:'column-key.jpg'},
 {id:'blend',title:'Layered collection',note:'Meander → floral → arches',ref:'concept-beads.jpg'},
]
const TAU=Math.PI*2
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
const fract=(v:number)=>v-Math.floor(v)
const smooth=(v:number)=>{const t=clamp(v,0,1); return t*t*(3-2*t)}
const segment=(x:number,y:number,a:number,b:number,c:number,d:number)=>{const dx=c-a,dy=d-b; const t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1),0,1); return Math.hypot(x-a-dx*t,y-b-dy*t)}
export function radiusAt(c:Config,z:number){const t=clamp(z/c.height,0,1);return c.diameter/2+(c.profile==='barrel'?Math.sin(Math.PI*t)*c.shape:c.profile==='taper'?c.shape*(2*t-1):0)}
function motifDistance(m:Motif,u:number,v:number):number {
 const x=fract(u),y=fract(v)
 if(m==='arches') {let d=10; for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){const yy=v-(Math.floor(v)+j),xx=u-(Math.floor(u)+k+.5*((Math.floor(v)+j)%2));if(yy>=-.02)d=Math.min(d,Math.abs(Math.hypot(xx,yy)-.72))}return d}
 if(m==='rosettes'){const a=x-.5,b=y-.5,r=Math.hypot(a,b),ang=Math.atan2(b,a);return Math.min(Math.abs(r-(.19+.055*Math.cos(6*ang))),Math.abs(Math.max(Math.abs(a),Math.abs(b))+.4142*Math.min(Math.abs(a),Math.abs(b))-.46))}
 if(m==='meander'){const points=[[0,.15],[.7,.15],[.7,.5],[.3,.5],[.3,.85],[1,.85],[1,.15]];let d=10;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let i=1;i<points.length;i++)d=Math.min(d,segment(x+dx,y+dy,points[i-1][0],points[i-1][1],points[i][0],points[i][1]));return d}
 if(m==='chevron')return Math.min(Math.abs(fract(v+Math.abs(x-.5)*1.6)-.5),Math.abs(fract(v+Math.abs(x-.5)*1.6)-1.5))
 return Math.min(Math.abs(fract(u+v*.5)-.5),Math.abs(fract(u-v*.5)-.5))
}
export function patternAt(c:Config,theta:number,z:number):number {
 const edge=smooth((z-c.margin)/Math.max(c.layer*2,2))*smooth((c.height-c.margin-z)/Math.max(c.layer*2,2))
 const u=(theta/TAU+c.phase/360+c.twist/360*z/c.height)*c.repeats, v=z/c.pitch
 const cellWidth=TAU*c.diameter/2/c.repeats
 const width=c.ridge/Math.min(cellWidth,c.pitch)
 const value=(m:Motif)=>1-smooth((motifDistance(m,u,v)-width*.35)/Math.max(.005,width*.65))
 let mask:number
 if(c.motif==='blend') {const h=z/c.height;const blend1=smooth((h-.28)/.12),blend2=smooth((h-.62)/.12);mask=(value('meander')*(1-blend1)+value('rosettes')*blend1)*(1-blend2)+value('arches')*blend2}
 else mask=value(c.motif)
 return mask*edge
}
export type Point={x:number;y:number;z:number;strength:number}
export type Path={points:Point[];kind:'wall'|'texture';layer:number}
export type Study={paths:Path[];layers:number;length:number;excursions:number;maxStep:number;maxRadius:number;points:number;minutes:number}
export const distance=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)
export function generate(c:Config):Study {
 const paths:Path[]=[], layers=Math.ceil(c.height/c.layer)
 let length=0,excursions=0,maxStep=0,maxRadius=0,totalPoints=0
 const sites=Math.max(c.repeats*6,Math.round(TAU*c.diameter/2/c.spacing))
 const samples=Math.max(240,Math.ceil(TAU*(c.diameter/2+Math.abs(c.shape)+c.projection)/.9),sites*8)
 const count=Math.min(1440,samples)
 const point=(a:number,r:number,z:number,strength:number):Point=>({x:r*Math.cos(a),y:r*Math.sin(a),z,strength})
 for(let l=0;l<layers;l++){
  const z=Math.min(c.height,(l+1)*c.layer),r=radiusAt(c,z)
  if(l)maxStep=Math.max(maxStep,Math.abs(r-radiusAt(c,Math.min(c.height,l*c.layer))))
  for(let pass=c.passes-1;pass>=0;pass--){
   const points:Point[]=[];const inner=pass>0;const rr=r-pass*c.bead*.85
   if(c.treatment==='loops'&&!inner){
    for(let j=0;j<count;j++){
     const a=j/count*TAU;points.push(point(a,rr,z,0))
     const site=Math.floor(j/count*sites),prev=Math.floor((j-1)/count*sites)
     const strength=patternAt(c,a,z)
     if(site!==prev&&l%c.every===0&&strength>.35&&c.projection>0){
      const root=points.at(-1)!;const depth=c.projection*strength;const span=Math.min(c.spacing*.65,Math.max(c.bead,depth))
      for(let k=1;k<=16;k++){const t=k/16*TAU,out=depth*(1-Math.cos(t))/2,side=span*Math.sin(t)/2;points.push({x:root.x+out*Math.cos(a)-side*Math.sin(a),y:root.y+out*Math.sin(a)+side*Math.cos(a),z,strength:Math.sin(t/2)**2*strength})}excursions++
     }
    }
    points.push({...points[0]})
   } else {
    for(let j=0;j<=count;j++){
     const a=(j===count?0:j/count*TAU);let strength=inner?0:patternAt(c,a,z)
     if(c.treatment==='beads'){const pulse=Math.max(0,Math.cos(a*sites+(Math.floor(l/c.every)%2)*Math.PI))**6;strength*=pulse*(l%c.every===0?1:.1)}
     points.push(point(a,rr+c.projection*strength,z,strength))
    }
   }
   for(let k=1;k<points.length;k++)length+=distance(points[k-1],points[k])
   for(const p of points)maxRadius=Math.max(maxRadius,Math.hypot(p.x,p.y))
   totalPoints+=points.length;paths.push({points,kind:inner?'wall':'texture',layer:l})
  }
 }
 return {paths,layers,length,excursions,maxStep,maxRadius,points:totalPoints,minutes:length/c.speed/60}
}
const ranges:Record<string,[number,number]>={diameter:[40,200],height:[20,300],shape:[0,25],repeats:[3,24],pitch:[8,60],ridge:[1,8],projection:[0,15],phase:[0,360],twist:[-180,180],margin:[0,30],spacing:[3,16],every:[1,6],layer:[.6,3],bead:[2,8],passes:[1,3],speed:[5,60],flow:[30,160],textureFlow:[50,200],retraction:[0,80],lift:[0,8]}
export function normalize(input:unknown):Config {
 if(!input||typeof input!=='object')throw Error('This is not a study file.')
 const c={...defaults},raw=input as Record<string,unknown>
 for(const [key,[min,max]] of Object.entries(ranges)){const v=raw[key];if(typeof v==='number'&&Number.isFinite(v))(c as unknown as Record<string,unknown>)[key]=clamp(v,min,max)}
 for(const k of ['repeats','every','passes'] as const)c[k]=Math.round(c[k])
 if(motifs.some(m=>m.id===raw.motif))c.motif=raw.motif as Motif
 if(['relief','beads','loops'].includes(String(raw.treatment)))c.treatment=raw.treatment as Config['treatment']
 if(['cylinder','barrel','taper'].includes(String(raw.profile)))c.profile=raw.profile as Config['profile']
 if(c.diameter/2-c.shape-c.bead*(c.passes-1)*.85<5)c.shape=Math.max(0,c.diameter/2-c.bead*(c.passes-1)*.85-5)
 return c
}
export function exportGcode(c:Config,study:Study){
 const printer=PRINTER_PROFILES[0], ox=printer.buildVolume.x/2,oy=printer.buildVolume.y/2
 if(c.height+150>printer.buildVolume.z||study.maxRadius+c.bead/2>Math.min(ox,oy))throw Error('The form or end lift exceeds the Super 10 envelope.')
 const all=study.paths.flatMap(p=>p.points)
 if(!all.length||all.some(p=>![p.x,p.y,p.z,p.strength].every(Number.isFinite)))throw Error('Invalid toolpath coordinates.')
 const lines=['; IZ / BIENNALE PATTERN STUDY — EXPERIMENTAL',`; Motif: ${c.motif}; treatment: ${c.treatment}`,`; Projection ${c.projection} mm; patterned flow ${c.textureFlow}%`, '; Intentional outward excursions are NOT certified self-supporting.', '; Open-bottom wall coupon. Preview shows commanded geometry, not sag or ooze.', '; Super 10 scripts and empirical extrusion calibration inherited from ClayFlow.',...printer.startScript,'G90','M82','G92 E0']
 const f=(v:number)=>v.toFixed(4);let e=0,started=false,layer=-1
 const empirical=3.426*(c.bead*c.layer/(5*1.5))*c.flow/100
 for(const path of study.paths){
  if(path.layer!==layer){layer=path.layer;lines.push(`;LAYER:${layer}`)}
  const a=path.points[0]
  if(started){e-=c.retraction;lines.push(`G1 E${f(e)} F60000 ; Pressure relief before travel`)}
  const lift=Math.min(printer.buildVolume.z,a.z+c.lift)
  if(started&&c.lift>0)lines.push(`G0 Z${f(lift)} F2400`)
  lines.push(`G0 X${f(a.x+ox)} Y${f(a.y+oy)} Z${f(started?lift:a.z)} F2880`)
  if(started&&c.lift>0)lines.push(`G0 Z${f(a.z)} F2400`)
  let recovery=started?c.retraction:0
  for(let i=1;i<path.points.length;i++){
   const b=path.points[i],a=path.points[i-1],len=distance(a,b)
   if(len<1e-8)continue
   const strength=(a.strength+b.strength)/2,extra=Math.min(recovery,c.retraction*len/12);recovery-=extra
   e+=len*empirical*(1+strength*(c.textureFlow/100-1))+extra
   lines.push(`G1 X${f(b.x+ox)} Y${f(b.y+oy)} Z${f(b.z)} E${f(e)} F${Math.round(c.speed*60)}${strength>.1?' ; Pattern excursion':''}`)
  }
  started=true
  if(e>10000){lines.push('G92 E0');e=0}
 }
 return [...lines,';END_PRINT',...printer.endScript,'; End IZ study'].join('\n')+'\n'
}
export function exportCsv(study:Study){return 'layer,path,point,x_mm,y_mm,z_mm,pattern_strength\n'+study.paths.flatMap((path,i)=>path.points.map((p,j)=>`${path.layer+1},${i+1},${j},${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)},${p.strength.toFixed(3)}`)).join('\n')}
