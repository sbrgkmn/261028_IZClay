import {download} from './files'
import type {Column} from './column'
export function drillingTemplate(outside:number){const circumference=Math.PI*outside,width=circumference+20
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="75mm" viewBox="0 0 ${width} 75"><rect width="100%" height="100%" fill="white"/><g stroke="black" fill="none" stroke-width=".25"><path d="M10 35H${width-10}" stroke-dasharray="2 2"/>${[0,1,2].map(i=>{const x=10+i*circumference/3;return [23,47].map(y=>`<circle cx="${x}" cy="${y}" r="3"/><path d="M${x-4} ${y}h8M${x} ${y-4}v8"/>`).join('')}).join('')}<path d="M10 65h50m-50 -2v4m50 -4v4"/></g><g font-family="sans-serif" font-size="3"><text x="10" y="7">PROTOTYPE · M4 bolts / Ø6 clearance · 3 holes per side, 120° apart</text><text x="10" y="13">Wrap at measured fired outside diameter ${outside.toFixed(1)} mm. Dashed line = joint. Hole centers ±12 mm.</text><text x="10" y="19">Print at 100%, no fit-to-page. Confirm dimensions and test a sacrificial coupon.</text><text x="12" y="71">50 mm scale check · template only; holes are NOT in ceramic G-code</text></g></svg>`
}
export function JointDetail({p,onChange}:{p:Column;onChange:(joint:Column['joint'])=>void}){
 const nominal=p.config.diameter-2*p.config.bead*(1+(p.config.passes-1)*.85),{bore,outside,clearance}=p.joint
 const actual=bore||nominal,od=actual-2*clearance
 return <div className="joint-content"><div className="eyebrow">CONNECTION STUDY / 01</div><h2>Internal alignment sleeve</h2><p>A removable sleeve bridges two flat rims. Three M4 bolts on each side connect through the ceramic into captive nuts in the sleeve.</p>
 <svg className="joint-drawing" viewBox="0 0 360 280" role="img" aria-label="Section through two ceramic segments, internal sleeve spanning the joint, and bolts 12 millimeters above and below the seam">
 <defs><pattern id="clayHatch" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#ba9678" strokeWidth="1"/></pattern></defs>
 <path d="M70 35h22v100H70zM70 139h22v100H70zM268 35h22v100h-22zM268 139h22v100h-22z" fill="url(#clayHatch)" stroke="#95765e"/>
 <path d="M96 78h13v118H96zM251 78h13v118h-13z" fill="#73847b" stroke="#4b6256"/>
 <path d="M48 101h61M48 173h61M251 101h61M251 173h61" stroke="#3e4540" strokeWidth="5"/>
 <path d="M64 91v20M64 163v20M296 91v20M296 163v20" stroke="#3e4540" strokeWidth="4"/>
 <path d="M32 137H327" stroke="#9c4936" strokeDasharray="5 4"/>
 <path d="M129 78v118m-5-118h10m-10 118h10" stroke="#73847b"/><text x="138" y="123">40 mm sleeve</text><text x="138" y="151">20 mm insertion</text><text x="138" y="169">each side</text>
 <text x="37" y="25">CERAMIC WALL</text><text x="97" y="259">OPEN CENTRAL BORE</text><text x="300" y="130">joint</text>
 </svg>
 <dl className="joint-spec"><div><dt>Sleeve wall</dt><dd>3 mm + nut bosses</dd></div><div><dt>Fasteners</dt><dd>6 × M4 per joint</dd></div><div><dt>Hole layout</dt><dd>120° apart · ±12 mm from joint</dd></div><div><dt>Ceramic clearance hole</dt><dd>Ø6 mm · padded washers</dd></div></dl>
 <label className="number-control">Measured fired bore <span><input aria-label="Measured fired bore" type="number" min="25" max="250" step=".1" value={bore||''} placeholder={nominal.toFixed(1)} onChange={e=>onChange({...p.joint,bore:Math.max(0,Math.min(250,Number(e.target.value)))})}/> mm</span></label><label className="number-control">Radial clearance <span><input aria-label="Radial clearance" type="number" min=".3" max="2" step=".1" value={clearance} onChange={e=>onChange({...p.joint,clearance:Math.max(.3,Math.min(2,Number(e.target.value)))})}/> mm</span></label>
 <label className="number-control">Measured fired outside Ø <span><input aria-label="Measured fired outside diameter" type="number" min="30" max="280" step=".1" value={outside||''} placeholder={p.config.diameter.toFixed(1)} onChange={e=>onChange({...p.joint,outside:Math.max(0,Math.min(280,Number(e.target.value)))})}/> mm</span></label>
 <div className="joint-result">Sleeve outside Ø <strong>{od.toFixed(1)} mm</strong><small>{bore?'Based on measured fired bore':'Nominal estimate — measure after firing'}</small></div>
 <button className="outline wide" disabled={!bore||outside<=bore} onClick={()=>download('iz-joint-drilling-template.svg',drillingTemplate(outside),'image/svg+xml')}>Download 1:1 drilling template</button>
 <p className="help">Prototype detail, not a load-rated connection. Print the sleeve separately in a tough polymer; fit to the fired bore and confirm bolt length, washer bearing and nut retention on two short coupons. Drill ceramic with a suitable diamond tool. The template uses the measured fired outside diameter. Verify its printed scale before marking. Light hand tightening only.</p><p className="help">Bolted joints lock rotation at 120° increments. Free rotation needs a separate bearing or central support; it is not provided by this detail. Sleeve fabrication and holes are not included in the ceramic toolpaths.</p>
 </div>
}
