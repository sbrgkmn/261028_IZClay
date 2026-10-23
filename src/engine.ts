import { PRINTER_PROFILES } from './clayflow/profiles'
export type Motif = 'arches' | 'rosettes' | 'meander' | 'chevron' | 'weave' | 'blend'
export type Config = { motif: Motif; treatment: 'relief' | 'beads' | 'loops'; profile: 'cylinder' | 'barrel' | 'taper'; seamMode:'auto'|'stepped'; coast:number; retractLead:number; restart:number; recoveryDistance:number; nozzle:number; diameter:number; height:number; shape:number; repeats:number; pitch:number; ridge:number; projection:number; phase:number; twist:number; margin:number; spacing:number; every:number; layer:number; bead:number; passes:number; speed:number; flow:number; textureFlow:number; retraction:number; lift:number }
export const defaults: Config = { motif:'arches', treatment:'beads', profile:'cylinder', nozzle:3,diameter:100,height:140,shape:12,repeats:10,pitch:24,ridge:2.4,projection:3.5,phase:0,twist:0,margin:8,spacing:5,every:2,layer:1.4,bead:3,passes:1,speed:22,flow:100,textureFlow:115,retraction:8,lift:1,seamMode:'auto',coast:2,retractLead:1,restart:100,recoveryDistance:24 }
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
export type Path={points:Point[];kind:'wall'|'texture';layer:number;continuous?:boolean;layerHeight?:number;startLayerHeight?:number}
export type Study={paths:Path[];layers:number;length:number;excursions:number;maxStep:number;maxRadius:number;points:number;minutes:number}
export const distance=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)
export const usesSpiral=(c:Config)=>c.seamMode==='auto'&&c.passes===1
export function generate(c:Config):Study {
 if(usesSpiral(c))return generateSpiral(c)
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
     const a=(j===count?0:j/count*TAU);const zz=usesSpiral(c)&&l>0?l*c.layer+(z-l*c.layer)*j/count:z;let strength=inner?0:patternAt(c,a,zz)
     if(c.treatment==='beads'){const pulse=Math.max(0,Math.cos(a*sites+(Math.floor(l/c.every)%2)*Math.PI))**6;strength*=pulse*(l%c.every===0?1:.1)}
     points.push(point(a,radiusAt(c,zz)-pass*c.bead*.85+c.projection*strength,zz,strength))
    }
   }
   for(let k=1;k<points.length;k++)length+=distance(points[k-1],points[k])
   for(const p of points)maxRadius=Math.max(maxRadius,Math.hypot(p.x,p.y))
   totalPoints+=points.length;paths.push({points,kind:inner?'wall':'texture',layer:l,continuous:usesSpiral(c)&&l>0,layerHeight:z-l*c.layer,startLayerHeight:usesSpiral(c)&&l>0?(l===1?0:c.layer):z-l*c.layer})
  }
 }
 return {paths,layers,length,excursions,maxStep,maxRadius,points:totalPoints,minutes:length/c.speed/60}
}
// A flat anchor ring followed by rising revolutions for every texture gesture.
// Turn records are preview markers only: adjacent records share one endpoint.
function generateSpiral(c:Config):Study {
 const layers=Math.ceil(c.height/c.layer-1e-9),paths:Path[]=[]
 const sites=Math.max(c.repeats*6,Math.round(TAU*c.diameter/2/c.spacing))
 const count=Math.min(1440,Math.max(240,Math.ceil(TAU*(c.diameter/2+c.shape+c.projection)/.9),sites*8))
 let length=0,excursions=0,maxRadius=0,totalPoints=0
 const point=(a:number,r:number,z:number,strength:number):Point=>({x:r*Math.cos(a),y:r*Math.sin(a),z,strength})
 for(let l=0;l<layers;l++){
  const startZ=l===0?c.layer:l*c.layer,endZ=Math.min(c.height,(l+1)*c.layer),points:Point[]=[]
  for(let j=0;j<=count;j++){
   const a=j===count?0:j/count*TAU,z=startZ+(endZ-startZ)*j/count
   let strength=patternAt(c,a,z)
   if(c.treatment==='beads'){
    // Phase and cadence vary continuously with height, including at 0° / 360°.
    const turn=(z/c.layer-1)/c.every
    strength*=Math.max(0,Math.cos(a*sites+Math.PI*turn))**6*(.1+.9*(.5+.5*Math.cos(TAU*turn))**4)
   }
   const r=radiusAt(c,z)
   points.push(point(a,r+(c.treatment==='loops'?0:c.projection*strength),z,c.treatment==='loops'?0:strength))
   if(c.treatment==='loops'&&j<count&&l%c.every===0&&strength>.35&&c.projection>0&&Math.floor(j/count*sites)!==Math.floor((j-1)/count*sites)){
    const root=points.at(-1)!,depth=c.projection*strength,span=Math.min(c.spacing*.65,Math.max(c.bead,depth))
    for(let k=1;k<=16;k++){const t=k/16*TAU,out=depth*(1-Math.cos(t))/2,side=span*Math.sin(t)/2;points.push({x:root.x+out*Math.cos(a)-side*Math.sin(a),y:root.y+out*Math.sin(a)+side*Math.cos(a),z,strength:Math.sin(t/2)**2*strength})}
    excursions++
   }
  }
  if(c.treatment==='loops'&&l>0){
   // Spread the rise across the complete looped path, not just its circular portions.
   const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0)
   let walked=0
   for(let i=0;i<points.length;i++){if(i)walked+=lengths[i-1];const p=points[i],z=startZ+(endZ-startZ)*walked/total;const radius=Math.hypot(p.x,p.y),dr=radiusAt(c,z)-radiusAt(c,p.z);p.x*=1+dr/radius;p.y*=1+dr/radius;p.z=z}
   points[points.length-1]=point(0,radiusAt(c,endZ),endZ,0)
  }
  if(l>0)points[0]={...paths[l-1].points.at(-1)!}
  for(let i=1;i<points.length;i++)length+=distance(points[i-1],points[i])
  for(const p of points)maxRadius=Math.max(maxRadius,Math.hypot(p.x,p.y))
  totalPoints+=points.length
  paths.push({points,kind:'texture',layer:l,continuous:l>0,layerHeight:endZ-l*c.layer,startLayerHeight:l===1?0:l===0?c.layer:c.layer})
 }
 return {paths,layers,length,excursions,maxStep:0,maxRadius,points:totalPoints,minutes:length/c.speed/60}
}
const ranges:Record<string,[number,number]>={nozzle:[2,8],diameter:[40,250],height:[20,300],shape:[0,25],repeats:[3,24],pitch:[8,60],ridge:[1,8],projection:[0,15],phase:[0,360],twist:[-180,180],margin:[0,30],spacing:[3,16],every:[1,6],layer:[.6,3],bead:[2,12],passes:[1,3],speed:[5,60],flow:[30,160],textureFlow:[50,200],retraction:[0,80],lift:[0,8],coast:[0,8],retractLead:[0,5],restart:[0,100],recoveryDistance:[5,60]}
export function normalize(input:unknown):Config {
 if(!input||typeof input!=='object')throw Error('This is not a study file.')
 const c={...defaults},raw=input as Record<string,unknown>
 for(const [key,[min,max]] of Object.entries(ranges)){const v=raw[key];if(typeof v==='number'&&Number.isFinite(v))(c as unknown as Record<string,unknown>)[key]=clamp(v,min,max)}
 if(raw.bead===undefined&&typeof raw.nozzle==='number'&&Number.isFinite(raw.nozzle))c.bead=c.nozzle
 for(const k of ['repeats','every','passes'] as const)c[k]=Math.round(c[k])
 if(raw.seamMode==='stepped'||raw.seamMode==='auto')c.seamMode=raw.seamMode
 // Preserve legacy multi-wall studies explicitly as stepped rather than silently labelling them spiral.
 if(c.passes>1)c.seamMode='stepped'
 if(motifs.some(m=>m.id===raw.motif))c.motif=raw.motif as Motif
 if(['relief','beads','loops'].includes(String(raw.treatment)))c.treatment=raw.treatment as Config['treatment']
 if(['cylinder','barrel','taper'].includes(String(raw.profile)))c.profile=raw.profile as Config['profile']
 if(c.passes>1)c.bead=Math.min(c.bead,(c.diameter/2-5)/((c.passes-1)*.85))
 if(c.diameter/2-c.shape-c.bead*(c.passes-1)*.85<5)c.shape=Math.max(0,c.diameter/2-c.bead*(c.passes-1)*.85-5)
 return c
}
export type ExtrusionMove={from:Point;to:Point;deltaE:number;phase:'print'|'recovery'|'coast'|'retract'}
export type PlannedPath={path:Path;moves:ExtrusionMove[];connected:boolean;stationaryRetraction:number}
// Split only along existing path segments, preserving the preview geometry.
// Integrate linear flow taper and linear motif strength exactly over each piece.
export function planExtrusion(c:Config,study:Study):PlannedPath[]{
 const result:PlannedPath[]=[]
 const base=3.426*(c.bead*c.layer/(5*1.5))*c.flow/100
 for(let index=0;index<study.paths.length;index++){
  const path=study.paths[index],previous=study.paths[index-1],next=study.paths[index+1]
  const connected=!!previous&&!!path.continuous
  if(connected&&distance(previous.points.at(-1)!,path.points[0])>1e-6)throw Error('Spiral paths must meet exactly.')
  const lengths=path.points.slice(1).map((b,i)=>distance(path.points[i],b))
  const total=lengths.reduce((a,b)=>a+b,0),ending=!next?.continuous
  const lead=ending&&c.retraction>0?Math.min(c.retractLead,total*.1):0
  const coast=ending?Math.min(c.coast,total*.1):0
  const retractStart=total-lead,coastStart=retractStart-coast
  const recovery=index>0&&!connected?c.retraction*c.restart/100:0
  const recoverOver=Math.min(c.recoveryDistance,Math.max(.001,coastStart))
  const endHeight=path.layerHeight??c.layer,startHeight=path.startLayerHeight??endHeight
  const moves:ExtrusionMove[]=[];let walked=0
  const mix=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,strength:a.strength+(b.strength-a.strength)*t})
  for(let i=1;i<path.points.length;i++){
   const len=lengths[i-1];if(len<1e-9)continue
   const a=path.points[i-1],b=path.points[i],end=walked+len
   const cuts=[walked,...[coastStart,retractStart,recoverOver].filter(t=>t>walked+1e-9&&t<end-1e-9),end].sort((a,b)=>a-b)
   for(let k=1;k<cuts.length;k++){
    const lo=cuts[k-1],hi=cuts[k],length=hi-lo
    if(length<1e-9)continue
    const from=mix(a,b,(lo-walked)/len),to=mix(a,b,(hi-walked)/len)
    let deltaE:number,phase:ExtrusionMove['phase']='print'
    if(lead>0&&lo>=retractStart-1e-8){deltaE=-c.retraction*length/lead;phase='retract'}
    else{
     const flowA=1+from.strength*(c.textureFlow/100-1),flowB=1+to.strength*(c.textureFlow/100-1)
     const taper=(d:number)=>coast>0?clamp((retractStart-d)/coast,0,1):1
     const ta=taper(lo),tb=taper(hi)
     const thickness=(d:number)=>(startHeight+(endHeight-startHeight)*(i-1+(d-walked)/len)/(path.points.length-1))/c.layer
     const ha=thickness(lo),hb=thickness(hi)
     deltaE=base*length*(flowA*ta*ha+4*(flowA+flowB)/2*(ta+tb)/2*(ha+hb)/2+flowB*tb*hb)/6
     if(ta<1||tb<1)phase='coast'
     if(recovery>0&&lo<recoverOver-1e-8){deltaE+=recovery*length/recoverOver;phase='recovery'}
    }
    moves.push({from,to,deltaE,phase})
   }
   walked=end
  }
  result.push({path,moves,connected,stationaryRetraction:ending&&lead===0?c.retraction:0})
 }
 return result
}
export function exportGcode(c:Config,study:Study){
 const printer=PRINTER_PROFILES[0],ox=printer.buildVolume.x/2,oy=printer.buildVolume.y/2
 if(c.height+150>printer.buildVolume.z||study.maxRadius+c.bead/2>Math.min(ox,oy))throw Error('The form or end lift exceeds the Super 10 envelope.')
 const all=study.paths.flatMap(p=>p.points)
 if(!all.length||all.some(p=>![p.x,p.y,p.z,p.strength].every(Number.isFinite)))throw Error('Invalid toolpath coordinates.')
 const lines=['; IZ / BIENNALE PATTERN STUDY — EXPERIMENTAL',`; Motif: ${c.motif}; treatment: ${c.treatment}`,`; Nozzle ${c.nozzle} mm; bead width ${c.bead} mm; wall flow ${c.flow}%`,`; Diameter ${c.diameter} mm; height ${c.height} mm; layer ${c.layer} mm; wall passes ${c.passes}`,`; Path mode: ${usesSpiral(c)?'continuous spiral':'stepped layers'}`,`; Coast ${c.coast} mm; early retract ${c.retractLead} mm; retract ${c.retraction} E; restart ${c.restart}% over ${c.recoveryDistance} mm`,`; Projection ${c.projection} mm; patterned flow ${c.textureFlow}%`,'; Intentional outward excursions are NOT certified self-supporting.','; Open-bottom coupon. Preview is nominal bead geometry, not sag or pressure simulation.',...printer.startScript,'G90','M82','G92 E0',';BEGIN_PRINT']
 const f=(v:number)=>v.toFixed(4);let e=0,layer=-1
 const plan=planExtrusion(c,study)
 for(let index=0;index<plan.length;index++){
  const {path,moves,connected,stationaryRetraction}=plan[index]
  if(path.layer!==layer){layer=path.layer;lines.push(`;LAYER:${layer}`)}
  const a=path.points[0]
  if(!connected){
   const lift=a.z+(index>0?c.lift:0)
   if(index>0&&c.lift>0)lines.push(`G0 Z${f(lift)} F2400`)
   lines.push(`G0 X${f(a.x+ox)} Y${f(a.y+oy)} Z${f(lift)} F2880`)
   if(index>0&&c.lift>0)lines.push(`G0 Z${f(a.z)} F2400`)
  }else lines.push('; Continuous rise — no travel, retract or restart at this turn')
  for(const move of moves){const b=move.to;e+=move.deltaE;lines.push(`G1 X${f(b.x+ox)} Y${f(b.y+oy)} Z${f(b.z)} E${f(e)} F${Math.round(c.speed*60)} ; ${move.phase}`)}
  if(stationaryRetraction>0){e-=stationaryRetraction;lines.push(`G1 E${f(e)} F60000 ; Stationary pressure relief (early retract disabled)`)}
  // Reset only where motion is already interrupted, never between spiral turns.
  if(e>10000&&plan[index+1]&&!plan[index+1].connected){lines.push('G92 E0');e=0}
 }
 return [...lines,';END_PRINT',...printer.endScript,'; End IZ study'].join('\n')+'\n'
}
export function exportCsv(study:Study){return 'layer,path,point,x_mm,y_mm,z_mm,pattern_strength\n'+study.paths.flatMap((path,i)=>path.points.map((p,j)=>`${path.layer+1},${i+1},${j},${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)},${p.strength.toFixed(3)}`)).join('\n')}
