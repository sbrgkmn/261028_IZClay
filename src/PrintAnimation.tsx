import {useMemo,useEffect,useRef,useLayoutEffect} from 'react'
import * as THREE from 'three'
import {sampleTimeline,type PrintTimeline} from './playback'
export function PrintAnimation({timeline,seconds,nozzle}:{timeline:PrintTimeline;seconds:number;nozzle:number}){
 const head=sampleTimeline(timeline,seconds),active=useRef<THREE.BufferGeometry>(null)
 const {ghost,history}=useMemo(()=>{
  const positions=new Float32Array(timeline.moves.length*6),colors=new Float32Array(timeline.moves.length*6)
  const palette={print:new THREE.Color('#996447'),coast:new THREE.Color('#b77919'),retract:new THREE.Color('#8848b3'),recovery:new THREE.Color('#247bb3'),travel:new THREE.Color('#9099a6')}
  timeline.moves.forEach((move,i)=>{positions.set([move.from.x,move.from.z,move.from.y,move.to.x,move.to.z,move.to.y],i*6);colors.set([...palette[move.phase].toArray(),...palette[move.phase].toArray()],i*6)})
  const ghost=new THREE.BufferGeometry();ghost.setAttribute('position',new THREE.BufferAttribute(positions,3))
  const history=new THREE.BufferGeometry();history.setAttribute('position',new THREE.BufferAttribute(positions,3));history.setAttribute('color',new THREE.BufferAttribute(colors,3))
  return {ghost,history}
 },[timeline])
 useEffect(()=>()=>{ghost.dispose();history.dispose()},[ghost,history])
 useLayoutEffect(()=>{
  history.setDrawRange(0,head.index*2)
  const move=timeline.moves[head.index],g=active.current
  if(move&&g){const attr=g.getAttribute('position') as THREE.BufferAttribute;attr.setXYZ(0,move.from.x,move.from.z,move.from.y);attr.setXYZ(1,head.position.x,head.position.z,head.position.y);attr.needsUpdate=true;g.computeBoundingSphere()}
 },[head.index,head.position.x,head.position.y,head.position.z,history,timeline])
 const color=head.phase==='travel'?'#9099a6':head.phase==='retract'?'#8848b3':'#b24b32'
 return <group>
  <lineSegments geometry={ghost}><lineBasicMaterial color="#8e9b8a" transparent opacity={.12} depthWrite={false}/></lineSegments>
  <lineSegments geometry={history}><lineBasicMaterial vertexColors/></lineSegments>
  <lineSegments frustumCulled={false}><bufferGeometry ref={active}><bufferAttribute attach="attributes-position" args={[new Float32Array(6),3]}/></bufferGeometry><lineBasicMaterial color={color}/></lineSegments>
  <group position={[head.position.x,head.position.z,head.position.y]}>
   <mesh position={[0,6,0]}><cylinderGeometry args={[Math.max(3,nozzle),nozzle/2,12,12]}/><meshStandardMaterial color="#5e655c" metalness={.3} roughness={.5}/></mesh>
   <mesh><sphereGeometry args={[Math.max(.9,nozzle*.35),12,8]}/><meshBasicMaterial color={color}/></mesh>
  </group>
 </group>
}
