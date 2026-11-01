import {radiusAt,type Study} from './engine'
import {segmentConfig,segmentStudy,segmentField,offsetAt,type Column} from './column'
export type ShellMesh={vertices:number[][];faces:number[][]}
// A closed hollow radial envelope, deliberately distinct from swept extrusion beads.
export function shellMesh(p:Column,i:number,study?:Study):ShellMesh {
 const c=segmentConfig(p,i),n=360,rows=Math.max(2,Math.ceil(c.height/Math.min(c.layer,1))),vertices:number[][]=[],faces:number[][]=[]
 if(rows*n>2500000)throw Error('Mesh is too large. Export shorter segments or use a larger layer height.')
 const paths=c.treatment==='relief'?undefined:(study??segmentStudy(p,i)).paths
 const envelopes=paths?.map(path=>{const bins=Array<number>(n).fill(0);for(const q of path.points){const a=(Math.atan2(q.y,q.x)+Math.PI*2)%(Math.PI*2),j=Math.round(a/(Math.PI*2)*n)%n;bins[j]=Math.max(bins[j],Math.hypot(q.x,q.y))}for(let j=0;j<n;j++)if(!bins[j]){let l=1,r=1;while(l<n&&!bins[(j-l+n)%n])l++;while(r<n&&!bins[(j+r)%n])r++;bins[j]=(bins[(j-l+n)%n]*r+bins[(j+r)%n]*l)/(l+r)}return bins})
 for(let k=0;k<=rows;k++){const z=k/rows*c.height;for(let side=0;side<2;side++)for(let j=0;j<n;j++){const a=j/n*Math.PI*2;let r:number
 if(envelopes){const u=k/rows*(envelopes.length-1),lo=Math.floor(u),hi=Math.min(lo+1,envelopes.length-1);r=envelopes[lo][j]*(1-(u-lo))+envelopes[hi][j]*(u-lo)}else r=radiusAt(c,z)+c.projection*segmentField(p,i,a,z)
 r+=(side===0?1:-1)*c.bead/2;if(!(r>0))throw Error('Wall thickness closes the central bore. Reduce bead width.');vertices.push([r*Math.cos(a),r*Math.sin(a),z])}}
 const v=(k:number,s:number,j:number)=>k*2*n+s*n+(j+n)%n
 const quad=(a:number,b:number,c:number,d:number)=>{faces.push([a,b,c],[a,c,d])}
 for(let k=0;k<rows;k++)for(let j=0;j<n;j++){quad(v(k,0,j),v(k,0,j+1),v(k+1,0,j+1),v(k+1,0,j));quad(v(k,1,j+1),v(k,1,j),v(k+1,1,j),v(k+1,1,j+1))}
 for(let j=0;j<n;j++){quad(v(0,0,j+1),v(0,0,j),v(0,1,j),v(0,1,j+1));quad(v(rows,0,j),v(rows,0,j+1),v(rows,1,j+1),v(rows,1,j))}
 return {vertices,faces}
}
export function columnObj(p:Column,selected?:number){const lines=['# IZ Clay Pattern Lab | units: millimeters | Z up','# Closed hollow slicer shells; wall thickness = bead width. Not swept beads.','# Beads/loops use a continuous radial envelope; loop cavities are filled.','# Assembly retains separate named objects; print parts separately.'];let offset=1
 for(const i of selected===undefined?p.segments.map((_,j)=>j):[selected]){const mesh=shellMesh(p,i),z=selected===undefined?offsetAt(p,i):0;lines.push(`o part_${String(i+1).padStart(2,'0')}_${p.segments[i].kind??'shaft'}`);for(const q of mesh.vertices)lines.push(`v ${q[0].toFixed(5)} ${q[1].toFixed(5)} ${(q[2]+z).toFixed(5)}`);for(const f of mesh.faces)lines.push(`f ${f.map(j=>j+offset).join(' ')}`);offset+=mesh.vertices.length}return lines.join('\n')+'\n'
}
