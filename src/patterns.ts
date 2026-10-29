// Periodic construction drawings, not image-derived textures.
export type Edge = [number,number,number,number]
export type PatternName = 'rosettes'|'floralmeander'|'cells'|'arches'|'leafchevron'|'weave'|'meander'|'vertical'
export type Construction = {edges:Edge[];parts:{kind:string;count:number}[]}
const line=(edges:Edge[],points:number[][],closed=false)=>{for(let i=1;i<points.length;i++)edges.push([points[i-1][0],points[i-1][1],points[i][0],points[i][1]]);if(closed)edges.push([points.at(-1)![0],points.at(-1)![1],points[0][0],points[0][1]])}
const shift=(points:number[][],x:number,y:number)=>points.map(([a,b])=>[a+x,b+y])
const floret=(edges:Edge[],x:number,y:number,r=.115)=>line(edges,Array.from({length:65},(_,i)=>{const t=i/64*Math.PI*2,rr=r*(1+.24*Math.cos(8*t));return [x+rr*Math.cos(t),y+rr*Math.sin(t)]}))
export function construction(id:PatternName):Construction {
 const edges:Edge[]=[],parts:Construction['parts']=[]
 if(id==='vertical'){line(edges,[[.5,-1],[.5,2]]);parts.push({kind:'vertical rib',count:1})}
 if(id==='rosettes'){
  line(edges,[[.4,.26],[.6,.26],[.74,.4],[.74,.6],[.6,.74],[.4,.74],[.26,.6],[.26,.4]],true);floret(edges,.5,.5)
  // Plus cells occupy the cardinal neighbors and touch the octagon's flat sides.
  const cross=[[-.1,-.26],[.1,-.26],[.1,-.1],[.26,-.1],[.26,.1],[.1,.1],[.1,.26],[-.1,.26],[-.1,.1],[-.26,.1],[-.26,-.1],[-.1,-.1]]
  for(const [x,y] of [[.5,0],[1,.5],[.5,1],[0,.5]])line(edges,shift(cross,x,y),true)
  // Hexagonal cells are diagonal to each floret-bearing octagon.
  const hex=[[-.12,-.24],[.12,-.24],[.26,0],[.12,.24],[-.12,.24],[-.26,0]]
  for(const [x,y] of [[0,0],[1,0],[0,1],[1,1]])line(edges,shift(hex,x,y),true)
  parts.push({kind:'floret in octagon',count:1},{kind:'cardinal plus cell',count:4},{kind:'diagonal hexagon',count:4})
 }
 if(id==='floralmeander'||id==='leafchevron'){
  // Four bent arms weave around a square ornament cell.
  const arm=[[.18,-.18],[.5,-.18],[.5,.18],[.82,.18]]
  for(let n=0;n<4;n++){const a=n*Math.PI/2;line(edges,arm.map(([x,y])=>[.5+x*Math.cos(a)-y*Math.sin(a),.5+x*Math.sin(a)+y*Math.cos(a)]))}
  line(edges,[[.32,.32],[.68,.32],[.68,.68],[.32,.68]],true)
  if(id==='floralmeander')floret(edges,.5,.5,.115)
  else {line(edges,[[.5,.34],[.61,.43],[.63,.54],[.5,.66],[.37,.54],[.39,.43]],true);line(edges,[[.5,.34],[.5,.66]]);for(const y of [.43,.51,.59]){line(edges,[[.5,y],[.42,y-.06]]);line(edges,[[.5,y],[.58,y-.06]])}
   // Integer shear preserves both periodic seams while distorting the hooked cross.
   for(const e of edges){e[0]+=e[1]-.5;e[2]+=e[3]-.5}
  }
  parts.push({kind:'bent cross arm',count:4},{kind:id==='floralmeander'?'square floret':'leaf in sheared square',count:1})
 }
 if(id==='cells'){
  for(const y of [0,.5])line(edges,[[0,y+.25],[.25,y],[.75,y],[1,y+.25],[.75,y+.5],[.25,y+.5]],true)
  parts.push({kind:'hexagon',count:2},{kind:'square between hexagons',count:2})
 }
 if(id==='arches'){
  for(const [x,y] of [[.5,0],[0,.5],[1,.5]])line(edges,Array.from({length:25},(_,i)=>{const t=i/24*Math.PI;return[x+.5*Math.cos(t),y+.5*Math.sin(t)]}))
  parts.push({kind:'touching semicircle rows',count:2})
 }
 if(id==='weave'){
  // Plus pentomino fundamental tile: lattice (2,1),(-1,2), determinant 5.
  // This rotation/scale produces a gap-free diagrid tessellation.
  const plus=[[-.5,-1.5],[.5,-1.5],[.5,-.5],[1.5,-.5],[1.5,.5],[.5,.5],[.5,1.5],[-.5,1.5],[-.5,.5],[-1.5,.5],[-1.5,-.5],[-.5,-.5]]
  line(edges,plus.map(([x,y])=>[.5+(2*x+y)/5,.5+(-x+2*y)/5]),true)
  parts.push({kind:'tessellating plus outline',count:1})
 }
 if(id==='meander'){
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const x=.25+col*.5,y=.25+row*.5,rotate=(row+col)%2
   for(const pts of [[[0,-.25],[0,.25]],[[-.25,-.25],[.25,-.25]],[[-.25,.25],[.25,.25]]])line(edges,pts.map(([a,b])=>[x+(rotate?b:a),y+(rotate?a:b)]))
  }
  parts.push({kind:'vertical I',count:2},{kind:'horizontal I',count:2})
 }
 return {edges,parts}
}
const cache=new Map<PatternName,Float32Array>(),N=192
function bake(id:PatternName){const result=new Float32Array(N*N),edges:Edge[]=[]
 for(const e of construction(id).edges){const mx=(e[0]+e[2])/2,my=(e[1]+e[3])/2,ox=Math.floor(mx),oy=Math.floor(my)
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)edges.push([e[0]-ox+dx,e[1]-oy+dy,e[2]-ox+dx,e[3]-oy+dy])
 }
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=i/N,y=j/N;let best=1
  for(const [a,b,c,d] of edges){const vx=c-a,vy=d-b,t=Math.max(0,Math.min(1,((x-a)*vx+(y-b)*vy)/(vx*vx+vy*vy||1))),xx=x-a-vx*t,yy=y-b-vy*t;best=Math.min(best,xx*xx+yy*yy)}result[j*N+i]=Math.sqrt(best)
 }cache.set(id,result);return result
}
export function motifDistance(id:PatternName,u:number,v:number){const g=cache.get(id)||bake(id),x=((u%1+1)%1)*N,y=((v%1+1)%1)*N,i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j
 return (g[j*N+i]*(1-a)+g[j*N+(i+1)%N]*a)*(1-b)+(g[((j+1)%N)*N+i]*(1-a)+g[((j+1)%N)*N+(i+1)%N]*a)*b
}
