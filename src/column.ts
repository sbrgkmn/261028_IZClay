import { defaults, normalize, generate, patternAt, exportGcode, type Config, type Motif } from './engine'

export type Segment = { id:string; motif:Motif; height:number; rotation:number }
export type Column = { name:string; vRepeats?:number; config:Config; segments:Segment[]; maxHeight:number; transition:number; rim:number; finish:'continuous'|'collar'; joint:{bore:number; outside:number; clearance:number} }
export const palette = [
 {id:'rosettes',name:'01 · Floral medallions',source:'column-floral.jpg',note:'Floret inside an octagon; plus cells connect vertically and horizontally, with hexagonal cells at the four diagonal neighbors.'},
 {id:'floralmeander',name:'02 · Flower & key',source:'column-flower-key.jpg',note:'Interlocking bent-cross ribbons around a square filled with a floret.'},
 {id:'cells',name:'03 · Square & hexagon',source:'column-cells.jpg',note:'Hexagonal cells with square interstices, sharing their boundaries.'},
 {id:'arches',name:'04 · Scalloped scales',source:'column-scales.jpg',note:'Staggered semicircles meet at endpoints and crests; no crossing arcs.'},
 {id:'leafchevron',name:'05 · Leaf & key',source:'column-leaf.jpg',note:'The diagonal column in photos 2988 and 2989: sheared bent-cross ribbons with a leaf replacing the floret.'},
 {id:'weave',name:'06 · Plus tessellation',source:'column-cross.jpg',note:'Gap-free plus-shaped tiles on a diagonal lattice; shared edges form the ornament.'},
 {id:'meander',name:'07 · Alternating I',source:'column-key.jpg',note:'Vertical and horizontal I figures alternate: each vertical I has four horizontal neighbors.'},
 {id:'vertical',name:'08 · Vertical ribs',source:'',note:'Straight vertical lines connect the lower and upper motifs through the same transition field.'},
] as const
export const initialColumn:Column={name:'Ulu Cami / Column 01',config:{...defaults,treatment:'relief',diameter:120,projection:3,repeats:8,pitch:30,ridge:3,layer:1.5,seamMode:'auto',passes:1,margin:0},maxHeight:300,transition:18,rim:3,finish:'continuous',joint:{bore:0,outside:0,clearance:.8},segments:[{id:'base',motif:'meander',height:120,rotation:0},{id:'middle',motif:'rosettes',height:150,rotation:0},{id:'top',motif:'arches',height:120,rotation:0}]}
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)}
export const totalHeight=(p:Column)=>p.segments.reduce((h,s)=>h+s.height,0)
export const offsetAt=(p:Column,i:number)=>p.segments.slice(0,i).reduce((h,s)=>h+s.height,0)
export const verticalRepeats=(p:Column)=>p.vRepeats??totalHeight(p)/p.config.pitch
export const patternPitch=(p:Column)=>totalHeight(p)/verticalRepeats(p)
export function segmentConfig(p:Column,i:number):Config {return {...p.config,pitch:patternPitch(p),motif:p.segments[i].motif,height:p.segments[i].height,profile:'cylinder',shape:0,twist:0,margin:0,levelTop:true}}
// A common world-height field keeps row phase intact across separately printed pieces.
export function columnField(p:Column,a:number,z:number):number {
 let index=0,start=0
 while(index<p.segments.length-1&&z>start+p.segments[index].height){start+=p.segments[index++].height}
 const value=(i:number)=>patternAt({...p.config,pitch:patternPitch(p),motif:p.segments[i].motif,phase:p.segments[i].rotation,twist:0,margin:-100,height:totalHeight(p)+200},a,z+0)
 let result=value(index)
 for(const boundaryIndex of [index-1,index]){
  if(boundaryIndex<0||boundaryIndex>=p.segments.length-1)continue
  const cut=offsetAt(p,boundaryIndex+1),width=Math.min(Math.max(p.transition,p.config.layer*4),p.segments[boundaryIndex].height/3,p.segments[boundaryIndex+1].height/3)
  if(width>0&&Math.abs(z-cut)<=width){const t=smooth((z-cut+width)/(2*width));result=value(boundaryIndex)*(1-t)+value(boundaryIndex+1)*t}
 }
 return result
}
export function segmentField(p:Column,i:number,a:number,z:number):number {
 if(p.finish==='continuous')return columnField(p,a,offsetAt(p,i)+z)
 const s=p.segments[i],rim=Math.max(p.rim,p.config.layer*2),fade=Math.max(p.config.layer*2,p.transition/2)
 // Optional collar: two or more plain layers give circular, level mating rims.
 const edge=smooth((z-rim)/fade)*smooth((s.height-rim-z)/fade)
 return columnField(p,a,offsetAt(p,i)+z)*edge
}
export function segmentStudy(p:Column,i:number){const c=segmentConfig(p,i)
 // Hold boundary outlines through the anchor/landing turns. Stretch the shared
 // pattern field only over the rising body, then fill the helical top with a
 // connected, level revolution whose deposited thickness tapers to zero.
 return generate(c,(a,z)=>segmentField(p,i,a,Math.max(0,Math.min(1,(z-(c.passes===1&&c.seamMode==='auto'?2:1)*c.layer)/(c.height-(c.passes===1&&c.seamMode==='auto'?3:1)*c.layer)))*c.height))
}
export function segmentIssues(p:Column,i:number):string[]{const s=p.segments[i],issues:string[]=[]
 if(s.height>p.maxHeight+1e-6)issues.push(`Height ${s.height} mm exceeds the ${p.maxHeight} mm segment limit.`)
 if(s.height+150>500)issues.push('Height plus the 150 mm end lift exceeds the Super 10 envelope.')
 if(s.height<4*p.config.layer)issues.push('Segment needs at least four layers for level mating rims.')
 if(Math.abs(s.height/p.config.layer-Math.round(s.height/p.config.layer))>1e-6)issues.push('Height must be a whole number of layers. Use Snap height.')
 return issues
}
export function segmentGcode(p:Column,i:number){const issues=segmentIssues(p,i);if(issues.length)throw Error(issues.join(' '));return `; Column: ${p.name.replace(/[\r\n]/g,' ')}\n; Segment ${i+1} of ${p.segments.length}; assembly bottom Z ${offsetAt(p,i)} mm\n; Assemble bottom to top; nominal dimensions before firing.\n`+exportGcode(segmentConfig(p,i),segmentStudy(p,i))}
export function readColumn(raw:any):Column {
 if(raw?.app==='iz-pattern-lab'){const c=normalize(raw.config);return {...initialColumn,name:String(raw.title||'Imported study'),config:{...c,profile:'cylinder',twist:0},segments:[{id:crypto.randomUUID(),motif:c.motif==='blend'?'meander':c.motif==='chevron'?'leafchevron':c.motif,height:Math.round(c.height/c.layer)*c.layer,rotation:c.phase}]}}
 if(raw?.app!=='iz-column-lab'||!Array.isArray(raw.segments)||raw.segments.length<1||raw.segments.length>12)throw Error('Choose a column JSON or a legacy IZ study.')
 const n=(v:unknown,lo:number,hi:number,f:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):f
 return {vRepeats:typeof raw.vRepeats==='number'&&Number.isFinite(raw.vRepeats)?n(raw.vRepeats,1,200,13):undefined,name:String(raw.name||'Untitled column').slice(0,100),config:{...normalize(raw.config),profile:'cylinder',twist:0},maxHeight:n(raw.maxHeight,20,350,300),transition:n(raw.transition,0,40,18),rim:n(raw.rim,0,12,3),finish:raw.finish==='collar'?'collar':'continuous',joint:{bore:n(raw.joint?.bore,0,250,0),outside:n(raw.joint?.outside,0,280,0),clearance:n(raw.joint?.clearance,.3,2,.8)},segments:raw.segments.map((s:any)=>({id:crypto.randomUUID(),motif:normalize(s).motif==='blend'?'meander':normalize(s).motif==='chevron'?'leafchevron':normalize(s).motif,height:n(s.height,20,350,120),rotation:n(s.rotation,0,360,0)}))}
}
