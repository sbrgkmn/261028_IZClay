import {distance,planExtrusion,type Config,type Point,type Study,type ExtrusionMove} from './engine'
export type PrintMove={from:Point;to:Point;deltaE:number;phase:ExtrusionMove['phase']|'travel';layer:number;feed:number;start:number;end:number}
export type PrintTimeline={moves:PrintMove[];duration:number;chains:number}
// Same planned extrusion moves and travel ordering as exportGcode, in model coordinates.
// Startup/ending machine scripts and acceleration are intentionally excluded.
export function createTimeline(c:Config,study:Study):PrintTimeline {
 const plan=planExtrusion(c,study),moves:PrintMove[]=[];let time=0,chains=0,last:Point|undefined
 const add=(from:Point,to:Point,deltaE:number,phase:PrintMove['phase'],layer:number,feed:number)=>{
  const seconds=phase==='retract'&&distance(from,to)<1e-9?Math.abs(deltaE)/1000:distance(from,to)/feed
  if(seconds<=1e-9)return
  moves.push({from,to,deltaE,phase,layer,feed,start:time,end:time+seconds});time+=seconds
 }
 for(const p of plan){
  const a=p.path.points[0],layer=p.path.layer
  if(!p.connected){chains++;if(last){const lifted={...last,z:a.z+c.lift},across={...a,z:a.z+c.lift};if(c.lift>0){add(last,lifted,0,'travel',layer,40);last=lifted}add(last,across,0,'travel',layer,48);if(c.lift>0)add(across,a,0,'travel',layer,40)}}
  for(const m of p.moves)add(m.from,m.to,m.deltaE,m.phase,layer,c.speed)
  last=p.path.points.at(-1)!
  if(p.stationaryRetraction)add(last,last,-p.stationaryRetraction,'retract',layer,1000)
 }
 return {moves,duration:time,chains}
}
export function sampleTimeline(timeline:PrintTimeline,seconds:number){
 const time=Math.max(0,Math.min(timeline.duration,seconds));let lo=0,hi=timeline.moves.length-1
 while(lo<hi){const mid=(lo+hi)>>1;if(timeline.moves[mid].end<=time)lo=mid+1;else hi=mid}
 const move=timeline.moves[lo],fraction=move?Math.max(0,Math.min(1,(time-move.start)/(move.end-move.start))):0
 const position=move?{x:move.from.x+(move.to.x-move.from.x)*fraction,y:move.from.y+(move.to.y-move.from.y)*fraction,z:move.from.z+(move.to.z-move.from.z)*fraction}:{x:0,y:0,z:0}
 return {index:lo,fraction,position,phase:move?.phase??'print',layer:move?.layer??0,time}
}
