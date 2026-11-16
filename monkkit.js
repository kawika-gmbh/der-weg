/* Der Weg – MonkKit: 3D-Mönch laden, einfärben (Robe, Haut, Haar), Vorschau & Porträt */
(function(){
'use strict';
const TH=window.THREE;if(!TH)return;
const U={robe:{value:new TH.Color('#e7e0d1')},skin:{value:new TH.Color(1,1,1)},hair:{value:new TH.Color('#161413')},maskMap:{value:null}};
const BASE_SKIN=new TH.Color('#a37d52').convertSRGBToLinear(); // Hautton der Textur
let gltf=null,loading=false,waiters=[];
function prep(gl){
  const m=gl.scene;m.scale.setScalar(.92);
  const mask=new TH.TextureLoader().load('tex/monk_mask.png');mask.flipY=false;U.maskMap.value=mask;
  m.traverse(o=>{if(!(o.isMesh||o.isSkinnedMesh))return;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const mt=o.material;if(!mt)return;mt.roughness=Math.max(.55,mt.roughness||0);
    mt.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{robeTint:U.robe,skinRatio:U.skin,hairTint:U.hair,maskMap:U.maskMap});
      sh.fragmentShader='uniform vec3 robeTint;uniform vec3 skinRatio;uniform vec3 hairTint;uniform sampler2D maskMap;\n'+sh.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\n{vec3 c=diffuseColor.rgb;vec3 mk=texture2D(maskMap,vUv).rgb;float mx=max(c.r,max(c.g,c.b));float lum=dot(c,vec3(.299,.587,.114));'+
      'c=mix(c,robeTint*clamp(lum/.62,.3,1.1),mk.r);c=mix(c,c*skinRatio,mk.g);c=mix(c,hairTint*(.55+lum*12.),mk.b*(1.-smoothstep(.06,.16,mx)));diffuseColor.rgb=c;}');};
    mt.needsUpdate=true;});
  return gl;
}
function load(cb){
  if(gltf){cb&&cb(gltf);return;}if(cb)waiters.push(cb);if(loading||!TH.GLTFLoader)return;loading=true;
  const L=new TH.GLTFLoader(),ok=gl=>{gltf=prep(gl);window.__monk=gltf;const w=waiters;waiters=[];w.forEach(f=>f(gltf));};
  const fromB64=()=>{const parse=()=>{const b=atob(window.__monkB64),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);L.parse(u.buffer,'',ok,()=>{loading=false;});};
    if(window.__monkB64)return parse();const sc=document.createElement('script');sc.src='monk.js';sc.onload=parse;sc.onerror=()=>{loading=false;};document.head.appendChild(sc);};
  L.load('monk.glb',ok,undefined,fromB64);
}
function setLook(robeHex,skinHex,hairHex){
  U.robe.value.set(robeHex).convertSRGBToLinear();
  const s=new TH.Color(skinHex).convertSRGBToLinear();U.skin.value.setRGB(s.r/BASE_SKIN.r,s.g/BASE_SKIN.g,s.b/BASE_SKIN.b);
  U.hair.value.set(hairHex).convertSRGBToLinear();
}
/* Gemeinsamer kleiner Renderer für Vorschau und Porträt */
let R=null;
function rig(){
  if(R)return R;const cv=document.createElement('canvas');const r=new TH.WebGLRenderer({canvas:cv,alpha:true,antialias:true,preserveDrawingBuffer:true});
  r.outputEncoding=TH.sRGBEncoding;r.toneMapping=TH.ACESFilmicToneMapping;r.toneMappingExposure=1.1;r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  const sc=new TH.Scene();sc.add(new TH.HemisphereLight(0xfff1e0,0x3a2a22,.9));
  const k=new TH.DirectionalLight(0xffe2c4,2.2);k.position.set(2.5,3.5,4);sc.add(k);
  const rim=new TH.DirectionalLight(0xff9a5a,1.6);rim.position.set(-3,2.5,-3);sc.add(rim);
  const f=new TH.DirectionalLight(0x9fb4ff,.5);f.position.set(-3,1,3);sc.add(f);
  const cam=new TH.PerspectiveCamera(28,1,.1,50);R={r,sc,cam,cv};return R;
}
function borrow(){const m=gltf.scene;const st={par:m.parent,pos:m.position.clone(),rot:m.rotation.clone()};rig().sc.add(m);m.position.set(0,0,0);m.rotation.set(0,0,0);return st;}
function giveBack(st){const m=gltf.scene;if(st.par&&st.par!==R.sc){st.par.add(m);m.position.copy(st.pos);m.rotation.copy(st.rot);}else{R.sc.remove(m);}}
function idlePose(mx,A){Object.values(A).forEach(a=>a.stop());if(A.Idle){A.Idle.play();A.Idle.setEffectiveWeight(1);}mx.update(0);}
/* Porträt (Kopf & Schultern) als Bild */
function portrait(size){
  if(!gltf)return null;const g=rig(),st=borrow();g.r.setSize(size,size,false);g.cam.aspect=1;g.cam.fov=22;g.cam.updateProjectionMatrix();
  g.cam.position.set(.22,1.66,1.3);g.cam.lookAt(0,1.6,0);
  const mx=new TH.AnimationMixer(gltf.scene),A={};gltf.animations.forEach(c=>A[c.name]=mx.clipAction(c));idlePose(mx,A);
  g.r.render(g.sc,g.cam);const url=g.cv.toDataURL('image/png');mx.stopAllAction();mx.uncacheRoot(gltf.scene);giveBack(st);return url;
}
/* Live-Vorschau im Editor: drehbar */
let PV=null;
function preview(box){
  stopPreview();if(!gltf){load(()=>{if(box.isConnected&&!box.closest('[hidden]'))preview(box);});return;}
  const g=rig(),st=borrow();box.innerHTML='';box.appendChild(g.cv);g.cv.style.cssText='width:100%;height:100%;display:block;touch-action:none;cursor:grab';
  const sz=()=>{const w=box.clientWidth||220,h=box.clientHeight||260;g.r.setSize(w,h,false);g.cam.aspect=w/h;g.cam.fov=26;g.cam.updateProjectionMatrix();};sz();
  g.cam.position.set(0,1.05,4.3);g.cam.lookAt(0,.95,0);
  const mx=new TH.AnimationMixer(gltf.scene),A={};gltf.animations.forEach(c=>A[c.name]=mx.clipAction(c));idlePose(mx,A);
  let yaw=.35,vy=0,drag=null;const clock=new TH.Clock();
  const dn=e=>{drag=e.clientX;g.cv.setPointerCapture&&g.cv.setPointerCapture(e.pointerId);},mv=e=>{if(drag==null)return;vy=(e.clientX-drag)*.012;yaw+=vy;drag=e.clientX;},up=()=>{drag=null;};
  g.cv.addEventListener('pointerdown',dn);g.cv.addEventListener('pointermove',mv);g.cv.addEventListener('pointerup',up);g.cv.addEventListener('pointercancel',up);
  PV={st,mx,box,raf:0,off:()=>{g.cv.removeEventListener('pointerdown',dn);g.cv.removeEventListener('pointermove',mv);g.cv.removeEventListener('pointerup',up);g.cv.removeEventListener('pointercancel',up);}};
  const loop=()=>{if(!PV)return;if(!box.isConnected||box.closest('[hidden]')){stopPreview();return;}PV.raf=requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta());
    if(drag==null){vy*=.92;yaw+=vy+dt*.25;}gltf.scene.rotation.y=yaw;mx.update(dt);g.r.render(g.sc,g.cam);};loop();
}
function stopPreview(){if(!PV)return;cancelAnimationFrame(PV.raf);PV.off();PV.mx.stopAllAction();PV.mx.uncacheRoot(gltf.scene);giveBack(PV.st);if(R&&R.cv.parentNode)R.cv.parentNode.removeChild(R.cv);PV=null;}
window.MonkKit={load,setLook,portrait,preview,stopPreview,get gltf(){return gltf;}};
})();
