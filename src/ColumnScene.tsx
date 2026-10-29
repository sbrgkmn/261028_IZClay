import {useMemo} from 'react'
import {Canvas} from '@react-three/fiber'
import {Bounds,OrbitControls,Html} from '@react-three/drei'
import {type Column,segmentStudy,segmentConfig,offsetAt,totalHeight} from './column'
import {Geometry} from './Scene'
function Piece({p,index,selected,gap,mode,fraction,onSelect}:{p:Column;index:number;selected:number;gap:number;mode:string;fraction:number;onSelect:(i:number)=>void}){
 const s=p.segments[index],c=useMemo(()=>segmentConfig(p,index),[p,index]),study=useMemo(()=>segmentStudy(p,index),[p,index])
 const visible=totalHeight(p)*fraction-offsetAt(p,index),layer=study.paths.findLast(path=>path.points.at(-1)!.z<=visible+1e-6)?.layer??-1
 return <group position={[0,offsetAt(p,index)+index*gap,0]} onClick={e=>{e.stopPropagation();onSelect(index)}}>
 {layer>=0&&<Geometry study={study} c={c} mode={mode} layer={layer} only={false} tint={selected===index?'#bd906e':'#cfb89c'}/>}
 <Html position={[p.config.diameter/2+p.config.projection+28,s.height/2,0]} center><button className={'part-marker '+(selected===index?'selected':'')} onClick={()=>onSelect(index)}>{String(index+1).padStart(2,'0')}</button></Html></group>
}
export function ColumnScene({p,selected,exploded,reset,onSelect,mode,fraction}:{p:Column;selected:number;exploded:boolean;reset:number;onSelect:(i:number)=>void;mode:string;fraction:number}){
 const gap=exploded?28:0,h=totalHeight(p)+(p.segments.length-1)*gap
 return <Canvas camera={{position:[350,300,600],fov:35}} dpr={[1,1.5]}><color attach="background" args={['#eae7df']}/><ambientLight intensity={1.1}/><hemisphereLight args={['#fff9ed','#a18d7a',1.2]}/><directionalLight position={[-200,400,300]} intensity={2.5}/><directionalLight position={[200,100,-150]} intensity={1.2}/><Bounds key={`${reset}-${h}-${p.config.diameter}`} fit clip margin={1.25}><group position={[0,-h/2,0]}>{p.segments.map((s,i)=><Piece key={s.id} p={p} index={i} selected={selected} gap={gap} mode={mode} fraction={fraction} onSelect={onSelect}/>)}</group></Bounds><OrbitControls makeDefault maxDistance={4000} minDistance={40}/></Canvas>
}
