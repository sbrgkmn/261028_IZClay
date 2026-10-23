import { useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Bounds, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { type Study, type Config, planExtrusion } from './engine'
function Geometry({study,c,mode,layer,only}:{study:Study;c:Config;mode:string;layer:number;only:boolean}){
 const geometry=useMemo(()=>{
  const positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const paths=study.paths.filter(p=>p.layer<=layer&&(!only||p.layer===layer))
  const clay=new THREE.Color('#c9a78b'),decor=new THREE.Color('#aa7656'),line=new THREE.Color('#657e78'),active=new THREE.Color('#ae482f')
  if(mode==='toolpath'){
   const planned=planExtrusion(c,study).filter(p=>p.path.layer<=layer&&(!only||p.path.layer===layer))
   const phaseColors={coast:new THREE.Color('#b77919'),retract:new THREE.Color('#8848b3'),recovery:new THREE.Color('#247bb3')}
   for(const {path,moves} of planned)for(const move of moves){const a=move.from,b=move.to;const col=move.phase==='print'?(path.layer===layer?active:line):phaseColors[move.phase];positions.push(a.x,a.z,a.y,b.x,b.z,b.y);colors.push(...col.toArray(),...col.toArray())}
  }else{
   const sides=6
   for(const path of paths){const offset=positions.length/3;for(let i=0;i<path.points.length;i++){
    const p=path.points[i],next=path.points[Math.min(i+1,path.points.length-1)],prev=path.points[Math.max(0,i-1)]
    let dx=next.x-prev.x,dy=next.y-prev.y,mag=Math.hypot(dx,dy)||1;dx/=mag;dy/=mag
    const col=clay.clone().lerp(decor,p.strength*.2)
    for(let k=0;k<sides;k++){const angle=k/sides*Math.PI*2;const w=c.bead/2*Math.cos(angle);positions.push(p.x-dy*w,p.z+c.layer*.48*Math.sin(angle),p.y+dx*w);colors.push(...col.toArray())}
    if(i)for(let k=0;k<sides;k++){const a=offset+(i-1)*sides+k,b=offset+(i-1)*sides+(k+1)%sides,d=offset+i*sides+k,e=offset+i*sides+(k+1)%sides;indices.push(a,d,b,b,d,e)}
   }}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));if(mode!=='toolpath'){g.setIndex(indices);g.computeVertexNormals()}return g
 },[study,c,mode,layer,only])
 useEffect(()=>()=>geometry.dispose(),[geometry])
 return mode==='toolpath'?<lineSegments geometry={geometry}><lineBasicMaterial vertexColors transparent opacity={.85}/></lineSegments>:<mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.87} side={THREE.DoubleSide}/></mesh>
}
export function Scene(props:{study:Study;c:Config;mode:string;layer:number;only:boolean;reset:number}){
 return <Canvas shadows camera={{position:[230,180,250],fov:38}} dpr={[1,1.5]} gl={{preserveDrawingBuffer:true}}>
  <color attach="background" args={['#eae7df']}/><ambientLight intensity={1.1}/><hemisphereLight args={['#fff9ed','#a18d7a',1.4]}/><directionalLight position={[-140,240,160]} intensity={3} castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[160,90,-140]} intensity={1.2}/>
  <Bounds key={`${props.reset}-${props.c.height}-${props.c.diameter}`} fit clip margin={1.25}><group position={[0,-props.c.height/2,0]}><Geometry {...props}/></group></Bounds>
  <ContactShadows position={[0,-props.c.height/2,0]} opacity={.28} scale={500} blur={2.6} far={260} resolution={256} frames={1}/>
  <OrbitControls makeDefault minDistance={30} maxDistance={900}/>
 </Canvas>
}
