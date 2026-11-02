import {getPrinter} from './clayflow/profiles'
import { defaults, normalize, generate, patternAt, exportGcode, radiusAt, type ProfileBand, type Config, type Motif } from './engine'

export const partId=()=>globalThis.crypto?.randomUUID?.()??`part-${Date.now()}-${Math.random().toString(36).slice(2)}`
export type Segment = { id:string; motif:Motif; height:number; rotation:number; strokeWidth?:number; kind?:'shaft'|'base'|'capital'; flare?:number; terminalProfile?:'smooth'|'rounded'|'stepped'; bands?:ProfileBand[]; layer?:number; pitch?:number; repeats?:number }
export type Column = { name:string; printerId?:string; vRepeats?:number; config:Config; segments:Segment[]; maxHeight:number; transition:number; rim:number; finish:'continuous'|'collar'; joint:{bore:number; outside:number; clearance:number} }
export const palette = [
 {id:'rosettes',name:'01 · Floral medallions',source:'column-floral.jpg',note:'Floret inside an octagon; plus cells connect vertically and horizontally, with hexagonal cells at the four diagonal neighbors.'},
 {id:'floralmeander',name:'02 · Flower & key',source:'column-flower-key.jpg',note:'Interlocking bent-cross ribbons around a square filled with a floret.'},
 {id:'cells',name:'03 · Square & hexagon',source:'column-cells.jpg',note:'Hexagonal cells with square interstices, sharing their boundaries.'},
 {id:'arches',name:'04 · Scalloped scales',source:'column-scales.jpg',note:'Rounded scale voids end in a downward cusp. Alternate rows shift by half a repeat.'},
 {id:'leafchevron',name:'05 · Leaf & key',source:'column-leaf.jpg',note:'The diagonal column in photos 2988 and 2989: sheared bent-cross ribbons with a leaf replacing the floret.'},
 {id:'weave',name:'06 · Plus tessellation',source:'column-cross.jpg',note:'Gap-free plus-shaped tiles on a diagonal lattice; shared edges form the ornament.'},
 {id:'meander',name:'07 · Alternating I',source:'column-key.jpg',note:'Upright and sideways I-shaped recesses alternate on a checkerboard grid.'},
 {id:'vertical',name:'08 · Vertical ribs',source:'',note:'Straight vertical lines connect the lower and upper motifs through the same transition field.'},
 {id:'pluses',name:'09 · Intersecting pluses',source:'pluses.svg',note:'Plus-shaped voids interlock on an offset grid, five per square repeat.'},
 {id:'spiral',name:'10 · Spiral',source:'spiral.svg',note:'Parallel diagonal grooves wrap into helices around the column.'},
] as const
export const initialColumn:Column={name:'Ulu Cami / Column 01',config:{...defaults,treatment:'relief',diameter:120,projection:3,repeats:8,pitch:30,ridge:3,layer:1.5,seamMode:'auto',passes:1,margin:0},maxHeight:300,transition:18,rim:3,finish:'continuous',joint:{bore:0,outside:0,clearance:.8},segments:[{id:'base',motif:'meander',height:120,rotation:0},{id:'middle',motif:'rosettes',height:150,rotation:0},{id:'top',motif:'arches',height:120,rotation:0}]}
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)}
export const totalHeight=(p:Column)=>p.segments.reduce((h,s)=>h+s.height,0)
export const offsetAt=(p:Column,i:number)=>p.segments.slice(0,i).reduce((h,s)=>h+s.height,0)
export const verticalRepeats=(p:Column)=>p.vRepeats??totalHeight(p)/p.config.pitch
export const patternPitch=(p:Column)=>totalHeight(p)/verticalRepeats(p)
export const patternThickness=(p:Column,i:number)=>p.segments[i].strokeWidth??p.config.ridge
export function segmentConfig(p:Column,i:number):Config {const s=p.segments[i],terminal=s.kind==='base'||s.kind==='capital'?s.kind:undefined;return {...p.config,layer:s.layer??p.config.layer,repeats:s.repeats??p.config.repeats,ridge:patternThickness(p,i),pitch:s.pitch??patternPitch(p),motif:s.motif,height:s.height,profile:'cylinder',shape:0,twist:0,margin:0,levelTop:true,seamMode:'auto',passes:1,terminal,flare:s.flare??12,terminalProfile:s.terminalProfile,bands:s.bands,...(terminal?{treatment:'relief',projection:0}: {})}}
export function addTerminals(p:Column):Column {return {...p,segments:[...(p.segments.some(s=>s.kind==='base')?[]:[{id:partId(),kind:'base' as const,motif:'vertical' as const,height:60,rotation:0,flare:12}]),...p.segments,...(p.segments.some(s=>s.kind==='capital')?[]:[{id:partId(),kind:'capital' as const,motif:'vertical' as const,height:60,rotation:0,flare:12}])]}}
export const partName=(p:Column,i:number)=>p.segments[i].kind==='base'?'Plain Doric base':p.segments[i].kind==='capital'?'Plain Doric capital':palette.find(m=>m.id===p.segments[i].motif)?.name??'Shaft segment'
// A common world-height field keeps row phase intact across separately printed pieces.
export function columnField(p:Column,a:number,z:number):number {
 let index=0,start=0
 while(index<p.segments.length-1&&z>start+p.segments[index].height){start+=p.segments[index++].height}
 const value=(i:number)=>p.segments[i].kind==='base'||p.segments[i].kind==='capital'?0:patternAt({...p.config,repeats:p.segments[i].repeats??p.config.repeats,ridge:patternThickness(p,i),pitch:p.segments[i].pitch??patternPitch(p),motif:p.segments[i].motif,phase:p.segments[i].rotation,twist:0,margin:-100,height:totalHeight(p)+200},a,z+0)
 let result=value(index)
 for(const boundaryIndex of [index-1,index]){
  if(boundaryIndex<0||boundaryIndex>=p.segments.length-1)continue
  const cut=offsetAt(p,boundaryIndex+1),width=Math.min(Math.max(p.transition,p.config.layer*4),p.segments[boundaryIndex].height/3,p.segments[boundaryIndex+1].height/3)
  if(width>0&&Math.abs(z-cut)<=width){const t=smooth((z-cut+width)/(2*width));result=value(boundaryIndex)*(1-t)+value(boundaryIndex+1)*t}
 }
 return result
}
export function segmentField(p:Column,i:number,a:number,z:number):number {
 if(p.segments[i].kind==='base'||p.segments[i].kind==='capital')return 0
 const terminal=(j:number)=>p.segments[j]?.kind==='base'||p.segments[j]?.kind==='capital'
 const endFade=Math.max(p.transition,(p.segments[i].layer??p.config.layer)*4)
 const mating=(terminal(i-1)?smooth(z/endFade):1)*(terminal(i+1)?smooth((p.segments[i].height-z)/endFade):1)
 if(p.finish==='continuous')return columnField(p,a,offsetAt(p,i)+z)*mating
 const s=p.segments[i],rim=Math.max(p.rim,p.config.layer*2),fade=Math.max(p.config.layer*2,p.transition/2)
 // Optional collar: two or more plain layers give circular, level mating rims.
 const edge=smooth((z-rim)/fade)*smooth((s.height-rim-z)/fade)
 return columnField(p,a,offsetAt(p,i)+z)*edge*mating
}
export function segmentStudy(p:Column,i:number){const c=segmentConfig(p,i)
 // Hold boundary outlines through the anchor/landing turns. Stretch the shared
 // pattern field only over the rising body, then fill the helical top with a
 // connected, level revolution whose deposited thickness tapers to zero.
 return generate(c,(a,z)=>segmentField(p,i,a,Math.max(0,Math.min(1,(z-(c.passes===1&&c.seamMode==='auto'?2:1)*c.layer)/(c.height-(c.passes===1&&c.seamMode==='auto'?3:1)*c.layer)))*c.height))
}
export function segmentIssues(p:Column,i:number):string[]{const s=p.segments[i],c=segmentConfig(p,i),printer=getPrinter(p.printerId??'potterbot-super-10'),issues:string[]=[]
 const lift=printer.id==='potterbot-super-10'?150:0
 if(s.height+lift>printer.buildVolume.z)issues.push(`Height ${s.height} mm + ${lift} mm end lift exceeds ${printer.buildVolume.z} mm machine Z. Design is unchanged.`)
 const radii=c.terminal?Array.from({length:1001},(_,j)=>radiusAt(c,j*c.height/1000)):[]
 const width=c.terminal?Math.max(...radii)*2+c.bead:c.diameter+2*c.projection+c.bead
 if(width>Math.min(printer.bed.x,printer.bed.y,printer.buildVolume.x,printer.buildVolume.y))issues.push(`Footprint ${width.toFixed(1)} mm exceeds the usable bed.`)
 if(c.terminal&&radii.some((r,j)=>j>0&&Math.abs(r-radii[j-1])/(c.height/1000)*c.layer>c.bead*.4))issues.push('Profile changes too quickly per layer: increase transition widths, reduce band depth / flare or reduce layer height.')
 if(s.height<4*c.layer)issues.push('Segment needs at least four layers for level mating rims.')
 if(Math.abs(s.height/c.layer-Math.round(s.height/c.layer))>1e-6)issues.push('Height must be a whole number of layers. Use Snap height.')
 return issues
}
export function segmentGcode(p:Column,i:number){const issues=segmentIssues(p,i);if(issues.length)throw Error(issues.join(' '));return `; Column: ${p.name.replace(/[\r\n]/g,' ')}\n; Segment ${i+1} of ${p.segments.length}; assembly bottom Z ${offsetAt(p,i)} mm\n; Pattern line thickness ${patternThickness(p,i)} mm\n; Assemble bottom to top; nominal dimensions before firing.\n`+exportGcode(segmentConfig(p,i),segmentStudy(p,i),getPrinter(p.printerId??'potterbot-super-10'))}
export function readColumn(raw:any):Column {
 if(raw?.app==='iz-pattern-lab'){const c=normalize(raw.config);return {...initialColumn,name:String(raw.title||'Imported study'),config:{...c,seamMode:'auto',passes:1,profile:'cylinder',twist:0},segments:[{id:partId(),motif:c.motif==='blend'?'meander':c.motif==='chevron'?'leafchevron':c.motif,height:Math.round(c.height/c.layer)*c.layer,rotation:c.phase}]}}
 if(raw?.app!=='iz-column-lab'||!Array.isArray(raw.segments)||raw.segments.length<1||raw.segments.length>14)throw Error('Choose a column JSON or a legacy IZ study.')
 const n=(v:unknown,lo:number,hi:number,f:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):f
 return {printerId:getPrinter(raw.printerId).id,vRepeats:typeof raw.vRepeats==='number'&&Number.isFinite(raw.vRepeats)?n(raw.vRepeats,1,200,13):undefined,name:String(raw.name||'Untitled column').slice(0,100),config:{...normalize(raw.config),seamMode:'auto',passes:1,profile:'cylinder',twist:0},maxHeight:n(raw.maxHeight,20,350,300),transition:n(raw.transition,0,40,18),rim:n(raw.rim,0,12,3),finish:raw.finish==='collar'?'collar':'continuous',joint:{bore:n(raw.joint?.bore,0,250,0),outside:n(raw.joint?.outside,0,280,0),clearance:n(raw.joint?.clearance,.3,2,.8)},segments:raw.segments.map((s:any)=>({id:partId(),motif:normalize(s).motif==='blend'?'meander':normalize(s).motif==='chevron'?'leafchevron':normalize(s).motif,height:n(s.height,.1,Number.MAX_VALUE,120),kind:['base','capital'].includes(s.kind)?s.kind:'shaft',flare:n(s.flare,0,100,12),terminalProfile:['rounded','stepped'].includes(s.terminalProfile)?s.terminalProfile:'smooth',bands:Array.isArray(s.bands)?s.bands.slice(0,8).map((b:any)=>({position:n(b.position,0,100,50),width:n(b.width,1,1000,12),depth:n(b.depth,0,100,3),shape:b.shape==='flat'?'flat':'rounded'})):[],layer:typeof s.layer==='number'?n(s.layer,.6,3,1.5):undefined,pitch:typeof s.pitch==='number'?n(s.pitch,1,1000,30):undefined,repeats:typeof s.repeats==='number'?n(s.repeats,3,24,8):undefined,rotation:n(s.rotation,0,360,0),strokeWidth:n(s.strokeWidth,.5,12,normalize(raw.config).ridge)}))}
}
