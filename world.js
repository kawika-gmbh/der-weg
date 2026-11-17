/* Der Weg – Spielmodus: begehbare Welt + Minispiel Pflaumenblüten-Pfähle */
(function(){
'use strict';
const TH=window.THREE;
const $=s=>document.querySelector(s);
const FINE=window.matchMedia&&matchMedia('(pointer:fine)').matches;
const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let W=null;

function sst(a,b,x){const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}
function nz(x,z){return Math.sin(x*.11+1.3)*Math.cos(z*.09+.7)*.6+Math.sin(x*.23+z*.17+2)*.3+Math.sin(x*.51-z*.43)*.12;}
function rng(seed){seed=Math.floor(Math.abs(seed))%2147483646+1;return()=>(seed=(seed*16807)%2147483647)/2147483647;}
function groundH(x,z){const r=Math.hypot(x,z),vf=(W&&W.pilgrim)?0:sst(35,41,z)*(1-sst(28,36,Math.abs(x)))*(1-sst(80,88,z));return (W&&W.pilgrim?0:-sst(27,38,z)*28)+sst(24,60,r)*(nz(x,z)+1.2)*1.6*(1-.8*vf)-sst(60,110,r)*2*(1-vf)+(r>24?0:nz(x*3,z*3)*.04)-vf*.75*Math.exp(-Math.pow((z-64)/1.15,2));}

/* ---------- Texturen & Materialien ---------- */
function loadTex(name,srgb,rep){const t=new TH.TextureLoader().load('tex/'+name);t.wrapS=t.wrapT=TH.RepeatWrapping;if(srgb)t.encoding=TH.sRGBEncoding;t.anisotropy=8;if(rep)t.repeat.set(rep,rep);return t;}
function mats(){
  const T={stoneD:loadTex('stone_d.webp',1),stoneN:loadTex('stone_n.webp'),roofD:loadTex('roof_d.webp',1),roofN:loadTex('roof_n.webp'),woodD:loadTex('wood_d.webp',1),groundD:loadTex('ground_d.webp',1),groundN:loadTex('ground_n.webp'),bark:loadTex('bark_d.webp',1),trunk:loadTex('trunk_d.webp',1),maple:loadTex('maple.webp',1),fir:loadTex('fir.webp',1),grass:loadTex('grass.webp',1)};
  W.tex=T;
  const S=(o)=>new TH.MeshStandardMaterial(o);
  return{
    stone:S({map:T.stoneD,normalMap:T.stoneN,roughness:.92,color:'#b8b0a2'}),
    roof:S({map:T.roofD,normalMap:T.roofN,roughness:.7,color:'#5a5e66',side:TH.DoubleSide}),
    red:S({map:T.woodD,roughness:.5,color:'#d0402c'}),
    wood:S({map:T.woodD,roughness:.8,color:'#7a5038'}),
    plaster:S({map:shoji(),color:'#ffffff',roughness:.9,emissive:new TH.Color('#ffb46a'),emissiveIntensity:0}),
    gold:S({color:'#d4a94e',metalness:.8,roughness:.3}),
    glow:new TH.MeshBasicMaterial({color:new TH.Color(2.2,1.1,.45)}),
    paper:new TH.MeshStandardMaterial({color:'#f2dcb0',emissive:new TH.Color('#ff9a40'),emissiveIntensity:1.6,roughness:.9}),
    bark:S({map:T.bark,roughness:.95,color:'#8a7a6a'}),
    trunk:S({map:T.trunk,roughness:.95,color:'#7a6a5a'}),
    maple:S({map:T.maple,alphaTest:.45,side:TH.DoubleSide,roughness:.85}),
    fir:S({map:T.fir,alphaTest:.45,side:TH.DoubleSide,roughness:.9,color:'#9aa890'}),
    grass:new TH.MeshLambertMaterial({map:T.grass,alphaTest:.5,side:TH.DoubleSide,color:'#b8a77e'}),
  };
}
function shoji(){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#e6d9bf');g.addColorStop(1,'#d8c8a8');x.fillStyle=g;x.fillRect(0,0,512,512);
  const im=x.getImageData(0,0,512,512),d=im.data;for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*14;d[i]+=n;d[i+1]+=n;d[i+2]+=n*.8;}x.putImageData(im,0,0);
  x.strokeStyle='rgba(120,90,60,.12)';x.lineWidth=1;for(let i=0;i<60;i++){x.beginPath();const y=Math.random()*512;x.moveTo(0,y);x.bezierCurveTo(170,y+8,340,y-8,512,y+3);x.stroke();}
  x.fillStyle='#3b2416';for(let i=0;i<=4;i++){x.fillRect(i*128-5,0,10,512);}for(let j=0;j<=4;j++){x.fillRect(0,j*128-5,512,10);}
  x.fillStyle='#2a180e';x.fillRect(0,0,512,14);x.fillRect(0,498,512,14);x.fillRect(0,0,14,512);x.fillRect(498,0,14,512);
  const t=new TH.CanvasTexture(c);t.wrapS=t.wrapT=TH.RepeatWrapping;t.encoding=TH.sRGBEncoding;t.anisotropy=8;return t;
}
function uvBox(geo,w,h,d,ts){const uv=geo.attributes.uv;const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/ts,uv.getY(i)*dims[f][1]/ts);}uv.needsUpdate=true;return geo;}
function add(m,p){m.castShadow=true;m.receiveShadow=true;(p||W.root).add(m);return m;}
function box(w,h,d,mat,x,y,z,ts){const g=uvBox(new TH.BoxGeometry(w,h,d),w,h,d,ts||2);const m=new TH.Mesh(g,mat);m.position.set(x,y+h/2,z);return add(m);}
function cyl(r,h,mat,x,y,z,seg,r2){const g=new TH.CylinderGeometry(r,r2==null?r:r2,h,seg||16);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*2*r/1.8,uv.getY(i)*h/1.8);const m=new TH.Mesh(g,mat);m.position.set(x,y+h/2,z);return add(m);}
function roofGeo(w,d,h){
  const g=new TH.PlaneGeometry(2,2,40,40);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){const u=p.getX(i),v=p.getZ(i),r=Math.max(Math.abs(u),Math.abs(v));const y=h*Math.pow(1-r,1.55)+h*.42*Math.pow(Math.abs(u*v),5)*Math.pow(r,3)+h*.06*(1-r);p.setXYZ(i,u*w/2,y,v*d/2);uv.setXY(i,u*w/4.4,v*d/4.4);}
  g.computeVertexNormals();return g;
}
function roof(w,d,h,x,y,z){const m=new TH.Mesh(roofGeo(w,d,h),W.M.roof);m.position.set(x,y,z);add(m);const u=new TH.Mesh(roofGeo(w,d,h),W.M.wood);u.position.set(x,y-.2,z);u.receiveShadow=true;W.root.add(u);m.userData.under=u;return m;}

/* ---------- Vegetation ---------- */
function cardsGeo(n,rad,yMin,yMax,size,seed,down){
  const r=rng(seed),pos=[],uv=[],idx=[];let v=0;
  for(let i=0;i<n;i++){
    const a=r()*6.28,el=(r()-.3)*1.2,d=rad*(.35+.65*Math.sqrt(r()));const cx=Math.cos(a)*d,cz=Math.sin(a)*d,cy=yMin+(yMax-yMin)*r();
    const s=size*(.7+r()*.6),rot=r()*6.28,tilt=down?-.5:(r()-.5)*1.4;
    const ux=Math.cos(rot)*s/2,uz=Math.sin(rot)*s/2,vy=Math.cos(tilt)*s/2,vh=Math.sin(tilt)*s/2;
    const nx=-Math.sin(rot)*vh,nz2=Math.cos(rot)*vh;
    const P=[[cx-ux+nx,cy-vy,cz-uz+nz2],[cx+ux+nx,cy-vy,cz+uz+nz2],[cx+ux-nx,cy+vy,cz+uz-nz2],[cx-ux-nx,cy+vy,cz-uz-nz2]];
    P.forEach(q=>pos.push(...q));uv.push(0,0,1,0,1,1,0,1);idx.push(v,v+1,v+2,v,v+2,v+3);v+=4;
  }
  const g=new TH.BufferGeometry();g.setAttribute('position',new TH.Float32BufferAttribute(pos,3));g.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const nrm=g.attributes.normal;for(let i=0;i<nrm.count;i++){nrm.setXYZ(i,nrm.getX(i)*.3,.9,nrm.getZ(i)*.3);}return g;
}
const IMP={maple:[512,320],fir_a:[256,736],fir_b:[256,592],fir_c:[256,584],bush_a:[512,480],bush_b:[512,576],bush_c:[384,464],gtree:[512,320],btree:[448,448]};
function impTex(k){W.impT=W.impT||{};if(!W.impT[k]){const t=new TH.TextureLoader().load('tex/imp_'+k+'.webp',()=>{if(!W)return;W.imps.forEach(it=>{if(it.k===k){it.t.image=t.image;it.t.needsUpdate=true;}});});t.encoding=TH.sRGBEncoding;t.anisotropy=4;W.impT[k]=t;}return W.impT[k];}
function imp(k,x,z,h,seed,solidR){
  const [tw,th]=IMP[k],w=h*tw/th,base=impTex(k),t=base.clone();t.needsUpdate=true;t.repeat.set(.25,.5);
  const tint=new TH.Color(W.se.light).lerp(new TH.Color('#ffffff'),.45).multiplyScalar(.82*W.tod.imp);if(W.tod.night)tint.lerp(new TH.Color('#6f86c8'),.35).multiplyScalar(.9);
  const m=new TH.Mesh(new TH.PlaneGeometry(w,h),new TH.MeshBasicMaterial({map:t,alphaTest:.45,side:TH.DoubleSide,color:tint,toneMapped:false}));
  m.geometry.translate(0,h/2,0);m.position.set(x,groundH(x,z)-.05,z);m.castShadow=true;
  m.customDepthMaterial=new TH.MeshDepthMaterial({depthPacking:TH.RGBADepthPacking,map:t,alphaTest:.45});
  W.root.add(m);W.imps.push({k,m,t,x,z,off:Math.floor(seed*8)%8,cur:-1});if(solidR)W.solids.push([x,z,solidR]);
}
function maple(x,z,s,seed){imp('maple',x,z,5.6*s,seed,.45*s);}
function pine(x,z,s,seed){const r=Math.floor(seed*97)%3;imp(['fir_a','fir_b','fir_c'][r],x,z,(r===0?16:12.5)*s,seed,.4*s);}
function impUpdate(){const c=W.cam.position;for(const it of W.imps){const dx=c.x-it.x,dz=c.z-it.z;it.m.rotation.y=Math.atan2(dx,dz);let i=(Math.round(Math.atan2(dx,dz)/(Math.PI/4))+it.off)%8;if(i<0)i+=8;if(i!==it.cur){it.cur=i;it.t.offset.set((i%4)*.25,i<4?.5:0);}}}
function grassField(){
  const base=new TH.TextureLoader().load('tex/imp_grass.webp',()=>{if(!W)return;(W.grassT||[]).forEach(t=>{t.image=base.image;t.needsUpdate=true;});});base.encoding=TH.sRGBEncoding;W.grassT=[];W.impT=W.impT||{};W.impT.grass=base;
  const tint=new TH.Color(W.se.light).lerp(new TH.Color('#ffffff'),.5).multiplyScalar(.8*W.tod.imp);if(W.tod.night)tint.lerp(new TH.Color('#6f86c8'),.35);
  const g1=new TH.PlaneGeometry(.9,.675);g1.translate(0,.3,0);const g2=g1.clone();g2.rotateY(Math.PI/2);const geo=mergeGeos([g1,g2]);
  const r=rng(4),m=new TH.Matrix4(),q=new TH.Quaternion(),sc=new TH.Vector3(),p=new TH.Vector3(),Y=new TH.Vector3(0,1,0);
  for(let k=0;k<3;k++){const t=base.clone();t.repeat.set(1/3,1);t.offset.set(k/3,0);W.grassT.push(t);
    const mat=new TH.MeshBasicMaterial({map:t,alphaTest:.5,side:TH.DoubleSide,color:tint,toneMapped:false});
    const N=900,inst=new TH.InstancedMesh(geo,mat,N);let c=0;
    for(let i=0;i<N*4&&c<N;i++){const a=r()*6.28,d=6.5+Math.pow(r(),1.3)*30,x=Math.cos(a)*d,z=Math.sin(a)*d;
      if(Math.abs(x)<1.6&&z>4)continue;if(Math.abs(x)<6.5&&Math.abs(z)<5.5)continue;if(Math.hypot(x-9,z-7)<2.8)continue;if(W.solids.some(s=>Math.hypot(x-s[0],z-s[1])<s[2]+.2))continue;if(W.noGo.some(n=>Math.hypot(x-n[0],z-n[1])<n[2]))continue;if(W.ch>0&&W.rects.some(q=>x>q.x0-.3&&x<q.x1+.3&&z>q.z0-.3&&z<q.z1+.3))continue;if(W.edgeZ&&z>W.edgeZ-1)continue;if(W.ch===2&&Math.abs(x)<1.6&&z>-6)continue;
      const sz=1.1+r()*1.1;p.set(x,groundH(x,z)-.03,z);q.setFromAxisAngle(Y,r()*6.28);sc.set(sz,sz*(.85+r()*.35),sz);m.compose(p,q,sc);inst.setMatrixAt(c++,m);}
    inst.count=c;W.root.add(inst);}
}
function mergeGeos(gs){const pos=[],uv=[],nrm=[],idx=[];let o=0;gs.forEach(g=>{const P=g.attributes.position,U=g.attributes.uv,Nn=g.attributes.normal;for(let i=0;i<P.count;i++){pos.push(P.getX(i),P.getY(i),P.getZ(i));uv.push(U.getX(i),U.getY(i));nrm.push(Nn.getX(i),Nn.getY(i),Nn.getZ(i));}const I=g.index.array;for(let i=0;i<I.length;i++)idx.push(I[i]+o);o+=P.count;});const g=new TH.BufferGeometry();g.setAttribute('position',new TH.Float32BufferAttribute(pos,3));g.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));g.setAttribute('normal',new TH.Float32BufferAttribute(nrm,3));g.setIndex(idx);return g;}

/* ---------- Tempel (nach Baustufe) ---------- */
function temple(st){
  const M=W.M;W.platform=st>=1;W.walls=st>=3;
  if(st===0){const r=rng(5);for(let i=0;i<14;i++){const s=.4+r()*.7;const b=box(s*1.4,s*.6,s,M.stone,(r()-.5)*11,-.1,(r()-.5)*8,1.5);b.rotation.set(r()*.3,r()*3,r()*.3);W.solids.push([b.position.x,b.position.z,s*.8]);}
    [[-2.5,-1.5,1.1],[1.8,-2.4,.6],[3.4,1.2,1.5]].forEach(([x,z,h])=>{cyl(.24,h,M.red,x,0,z,14);W.solids.push([x,z,.4]);});return;}
  box(11,.7,8,M.stone,0,0,0,2);[0,1,2].forEach(i=>box(4.2,.23,.5,M.stone,0,.7-(i+1)*.23,4.25+i*.5,2));
  [[-4.2,6.2],[4.2,6.2]].forEach(([x,z])=>{box(.6,.7,.6,M.stone,x,0,z,1);box(.9,.15,.9,M.stone,x,.7,z,1);box(.5,.45,.5,M.stone,x,.85,z,1);box(.95,.2,.95,M.stone,x,1.3,z,1);W.solids.push([x,z,.6]);
    if(st>=5){const g=new TH.Mesh(new TH.BoxGeometry(.3,.3,.3),M.glow);g.position.set(x,1.07,z);W.root.add(g);}});
  if(st<2)return;
  const ph=3.4,b=.7,xs=[-4.2,-1.4,1.4,4.2];
  xs.forEach(x=>[-2.8,2.8].forEach(z=>{cyl(.22,ph,M.red,x,b,z,16);W.solids.push([x,z,.35]);}));
  [-2.8,2.8].forEach(z=>box(9.2,.35,.4,M.wood,0,b+ph,z,1.8));[-4.2,4.2].forEach(x=>box(.4,.35,6,M.wood,x,b+ph,0,1.8));
  if(st===2){[[-5,3.4],[5,3.4],[-5,-3.4],[5,-3.4]].forEach(([x,z])=>cyl(.07,5.2,M.wood,x,b,z,6));return;}
  box(8.4,ph,.25,M.plaster,0,b,-2.6,1.7);box(.25,ph,5,M.plaster,-4.1,b,0,1.7);box(.25,ph,5,M.plaster,4.1,b,0,1.7);
  box(8.5,.7,.3,M.wood,0,b,-2.62,1.4);box(.3,.7,5.1,M.wood,-4.12,b,0,1.4);box(.3,.7,5.1,M.wood,4.12,b,0,1.4);
  if(st>=5){const L=new TH.PointLight(0xffa860,1.4,12,2);L.position.set(0,2.4,0);W.root.add(L);const a=new TH.Mesh(new TH.PlaneGeometry(2.2,2.4),M.glow);a.position.set(0,b+1.4,-2.44);W.root.add(a);}
  roof(13.4,10.4,2.5,0,b+ph+.3,0);
  // Innenraum: Altar, Buddha, Kerzen, Matten
  box(3.2,.9,.9,M.red,0,b,-2.0,1.2);box(3.5,.08,1.1,M.wood,0,b+.9,-2.0,1.2);W.solids.push([0,-2.0,1.4],[-1.1,-2.0,.8],[1.1,-2.0,.8]);
  {const g=new TH.Group();g.position.set(0,b+.98,-2.1);W.root.add(g);const S=(r,y,sx,sy,sz,par)=>{const m=new TH.Mesh(new TH.SphereGeometry(r,24,18),M.gold);m.position.y=y;m.scale.set(sx,sy,sz);add(m,par||g);return m;};
    S(.55,.18,1.25,.4,1);S(.36,.62,1,1.25,.85);S(.2,1.08,1,1.1,1);S(.07,1.3,1,1,1);
    const halo=new TH.Mesh(new TH.TorusGeometry(.42,.025,8,40),M.gold);halo.position.set(0,1.05,-.25);add(halo,g);
    if(TH.GLTFLoader){const put=gl=>{if(!W)return;while(g.children.length)g.remove(g.children[0]);const o=gl.scene.clone();o.scale.setScalar(.72);o.position.set(0,-.02,-.05);o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;c.material=M.gold;}});g.add(o);const L=new TH.PointLight(0xffd59a,.7,4,2);L.position.set(0,1.2,1.2);g.add(L);};
      if(window._buddhaGL)put(window._buddhaGL);else new TH.GLTFLoader().load('buddha.glb',gl=>{window._buddhaGL=gl;put(gl);},undefined,()=>{});}}
  [-1.2,-.8,.8,1.2].forEach((x,i)=>{const c=new TH.Mesh(new TH.CylinderGeometry(.04,.04,.22,10),new TH.MeshStandardMaterial({color:'#efe6d2',roughness:.6}));c.position.set(x,b+1.05,-1.75);add(c);
    const f=new TH.Mesh(new TH.SphereGeometry(.03,8,6),M.glow);f.position.set(x,b+1.2,-1.75);f.scale.y=1.8;W.root.add(f);W.flames=(W.flames||[]).concat(f);});
  {const L=new TH.PointLight(0xffb066,1.6,7,2);L.position.set(0,b+1.5,-1.3);W.root.add(L);W.flick.push(L);}
  [-1.6,0,1.6].forEach(x=>{const m=new TH.Mesh(new TH.CylinderGeometry(.32,.32,.06,20),new TH.MeshStandardMaterial({color:'#6e2a1c',roughness:1}));m.position.set(x,b+.03,0);m.receiveShadow=true;W.root.add(m);});
  W.inter.push({x:0,z:-.6,r:1.3,label:'Meditationshalle',btn:'Betreten',act:()=>roomDialog('halle')});
  if(st<4)return;
  const y2=b+ph+.3+1.25;box(6,1.8,4.4,M.plaster,0,y2,0);[-2.9,-1,1,2.9].forEach(x=>cyl(.1,1.8,M.red,x,y2,2.25,8));
  roof(9,7.4,2.1,0,y2+1.8,0);const ft=y2+3.9;cyl(.06,1.2,M.gold,0,ft-.1,0,6);[0,1,2].forEach(i=>{const s=new TH.Mesh(new TH.SphereGeometry(.2-i*.04,12,10),M.gold);s.position.set(0,ft+.2+i*.3,0);add(s);});
  const pts=[[0,0],[.32,0],[.3,.08],[.22,.32],[.14,.48],[0,.5]].map(p=>new TH.Vector2(p[0]*1.1,p[1]*1.1));const bell=new TH.Mesh(new TH.LatheGeometry(pts,18),M.gold);bell.position.set(0,b+ph-.65,3.3);add(bell);W.bell=bell;
  if(st>=5){[-4.2,-1.4,1.4,4.2].forEach((x,i)=>{const l=new TH.Mesh(new TH.SphereGeometry(.22,14,10),M.paper);l.scale.y=1.3;l.position.set(x,b+ph-.55,3.2);W.root.add(l);if(i===0||i===3){const L=new TH.PointLight(0xff9a50,1.2,9,2);L.position.copy(l.position);W.root.add(L);W.flick.push(L);}});}
}
function poles(){
  const r=rng(9);W.poles=[];for(let i=0;i<9;i++){const x=9+((i%3)-1)*1.15,z=7+(Math.floor(i/3)-1)*1.15,h=.9+r()*.8;cyl(.17,h,W.M.wood,x,0,z,10);W.poles.push([x,z,h]);}
  const sign=new TH.Group();sign.position.set(11.4,0,5.2);W.root.add(sign);
  const post=new TH.Mesh(new TH.BoxGeometry(.12,1.6,.12),W.M.wood);post.position.y=.8;add(post,sign);
  const board=new TH.Mesh(new TH.BoxGeometry(.9,.5,.06),W.M.red);board.position.y=1.5;add(board,sign);
  W.solids.push([9,7,2.1]);
}
function path(){const r=rng(3);let z=5.8;while(z<26){const w=1.5+r()*.6,d=.8+r()*.4;const s=box(w,.16,d,W.M.stone,(r()-.5)*.4,groundH(0,z)-.06,z,1.5);s.rotation.y=(r()-.5)*.3;z+=d+.3+r()*.3;}}

/* ---------- Kapitel 2–4: Bergkloster, Wasserfall, Gipfel ---------- */
function rockWall(x,z,w,h,d,seed){const g=new TH.IcosahedronGeometry(1,3),p=g.attributes.position,r=rng(seed||7),o1=r()*10;for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i);const n=1+.22*Math.sin(vx*3.1+o1)*Math.cos(vz*2.7)+.12*Math.sin(vy*7+vx*5)+.06*Math.sin(vz*13+vy*9);p.setXYZ(i,vx*n,vy*n,vz*n);}g.computeVertexNormals();
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/2,uv.getY(i)*h/2);const m=new TH.Mesh(g,W.rockM||(W.rockM=new TH.MeshStandardMaterial({map:W.tex.stoneD,normalMap:W.tex.stoneN,color:W.ch===3?'#9aa0a8':'#8a8073',roughness:.95})));m.scale.set(w/2,h/2,d/2);m.position.set(x,h/2-1,z);m.rotation.y=r()*3;m.castShadow=m.receiveShadow=true;W.root.add(m);return m;}
function noGo(x,z,r){W.noGo.push([x,z,r]);}
function rect(x0,x1,z0,z1,h){W.rects.push({x0,x1,z0,z1,h});}
function wallLine(x0,z0,x1,z1,r){const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/(r*1.2));for(let i=0;i<=n;i++){const t=i/n;W.solids.push([x0+(x1-x0)*t,z0+(z1-z0)*t,r]);}}
function lantern(x,y,z,pl){const l=new TH.Mesh(new TH.SphereGeometry(.2,14,10),W.M.paper);l.scale.y=1.3;l.position.set(x,y,z);W.root.add(l);if(pl){const L=new TH.PointLight(0xff9a50,1.1,8,2);L.position.set(x,y,z);W.root.add(L);W.flick.push(L);}}
function stoneLantern(x,z,lit){box(.45,.6,.45,W.M.stone,x,0,z,1);box(.65,.12,.65,W.M.stone,x,.6,z,1);box(.36,.36,.36,lit?W.M.glow:W.M.stone,x,.72,z,1);box(.75,.16,.75,W.M.stone,x,1.08,z,1);W.solids.push([x,z,.5]);if(lit){const L=new TH.PointLight(0xffa050,1,7,2);L.position.set(x,.95,z);W.root.add(L);W.flick.push(L);}}
function flags(p0,p1,n,sag){const cols=['#2f6fd6','#f2f2ea','#d23b2b','#3a9b4b','#e8c02f'];const g=new TH.PlaneGeometry(.26,.34);for(let k=0;k<n;k++){const t=(k+.5)/n;const m=new TH.Mesh(g,new TH.MeshStandardMaterial({color:cols[k%5],side:TH.DoubleSide,roughness:.9}));m.position.set(p0[0]+(p1[0]-p0[0])*t,p0[1]+(p1[1]-p0[1])*t-Math.sin(t*Math.PI)*sag-.17,p0[2]+(p1[2]-p0[2])*t);m.rotation.y=-Math.atan2(p1[2]-p0[2],p1[0]-p0[0]);W.root.add(m);W.flagsArr.push(m);}}
function pagoda(x,z,tiers,base){const M=W.M;box(base+.8,.6,base+.8,M.stone,x,0,z,2);let y=.6;for(let t=0;t<tiers;t++){const w=base-t*.55,h=1.9-t*.15;box(w,h,w,M.plaster,x,y,z,1.7);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>cyl(.1,h,M.red,x+sx*w/2,y,z+sz*w/2,10));y+=h;roof(w*1.7+.8,w*1.7+.8,1.0,x,y-.05,z);y+=.75;}cyl(.06,1.4,M.gold,x,y,z,8);W.solids.push([x,z,base*.75]);return y;}

/* Kapitel 2: Bergkloster am Felsrand */
function monastery(st){
  const M=W.M;W.meisterPos=st>=3?[-1.6,.6,-6.8]:[-3,0,4];
  // Felsrand vorne (Abgrund) als Sperre, Felswände hinten
  W.edgeZ=18;
  for(let i=0;i<9;i++){rockWall(-24+i*6,20.5,6.5,3+Math.sin(i*1.7),5,i+3);}
  for(let i=0;i<7;i++){rockWall(-21+i*7,-20-Math.sin(i)*2,8,14+Math.sin(i*2.1)*6,7,i+11);}
  if(st===0){const r=rng(13);for(let i=0;i<12;i++){const s=.35+r()*.6;const b=box(s*1.4,s*.6,s,M.stone,(r()-.5)*10,-.1,-7+(r()-.5)*6,1.5);b.rotation.set(r()*.3,r()*3,r()*.3);W.solids.push([b.position.x,b.position.z,s*.8]);}cyl(.2,1.1,M.red,2,0,-6,12);W.solids.push([2,-6,.35]);return;}
  // S1 Treppe + Terrasse
  box(14,.6,8,M.stone,0,0,-7,2);rect(-7,7,-11,-3,.6);for(let i=0;i<4;i++)box(3.2,.15*(i+1),.5,M.stone,0,0,-2.75+i*.5*-1+1.5,1.5);
  rect(-1.6,1.6,-3.2,-1,.35);
  [[-6.5,-2.8],[6.5,-2.8]].forEach(([x,z])=>{cyl(.12,1.6,M.wood,x,.6,z,8);W.solids.push([x,z,.3]);});
  if(st<2)return;
  // S2 Mauern mit Tor
  [[-7.2,-7,.4,8],[7.2,-7,.4,8]].forEach(([x,z,w,d])=>{box(w,1.6,d,M.plaster,x,.6,z,1.7);box(w+.15,.15,d+.15,M.roof,x,2.2,z,1.5);wallLine(x,z-d/2,x,z+d/2,.35);});
  box(14.4,1.6,.4,M.plaster,0,.6,-11.1,1.7);box(14.6,.15,.55,M.roof,0,2.2,-11.1,1.5);wallLine(-7,-11.1,7,-11.1,.35);
  [-5,5].forEach(x=>{box(4,1.6,.4,M.plaster,x,.6,-2.9,1.7);wallLine(x-2,-2.9,x+2,-2.9,.35);});
  [-2.2,2.2].forEach(x=>{cyl(.18,3,M.red,x,.6,-2.9,12);W.solids.push([x,-2.9,.3]);});box(5.2,.3,.5,M.red,0,3.6,-2.9,1.5);roof(6,1.8,.6,0,3.9,-2.9);
  if(st<3)return;
  // S3 Haupthalle
  box(8,.4,4.4,M.stone,-1.5,.6,-8,2);[-5,-2.6,-.4,2].forEach(x=>[-6.2,-9.8].forEach(z=>{cyl(.18,2.8,M.red,x,1,z,12);W.solids.push([x,z,.3]);}));
  box(7,2.8,.2,M.plaster,-1.5,1,-9.9,1.7);box(.2,2.8,3.6,M.plaster,-5.1,1,-8,1.7);box(.2,2.8,3.6,M.plaster,2.1,1,-8,1.7);wallLine(-5,-9.9,2,-9.9,.3);
  roof(9.6,6,2,-1.5,3.9,-8);rect(-5.5,2.5,-10.2,-5.8,1);
  if(st>=5){const a=new TH.Mesh(new TH.PlaneGeometry(1.8,2),M.glow);a.position.set(-1.5,2.1,-9.78);W.root.add(a);}
  if(st<4)return;
  // S4 Turm
  pagoda(5,-8.5,3,2.6);stoneLantern(-3.5,-1.6,st>=5);stoneLantern(3.5,-1.6,st>=5);
  if(st<5)return;
  [-5,-2.6,-.4,2].forEach(x=>lantern(x,3.4,-6,true));flags([-7,2.6,-3],[7,2.6,-3],22,.5);flags([-1.5,5.6,-8],[5,6.8,-8.5],12,.4);
}

/* Kapitel 3: Wasserfall mit Teich */
function waterfallScene(st){
  const M=W.M;W.meisterPos=st>=3?[7.4,.4,-3.4]:[-4,0,3];
  // Felswand hinten + Wasserfall
  for(let i=0;i<7;i++){if(i===3){const m=box(7,22,4,M.stone,0,-.5,-22.6,4);}rockWall(-18+i*6+(i===3?0:0),-22-(i===3?2.5:Math.abs(Math.sin(i))*2),i===3?9:7.5,i===3?26:15+Math.sin(i*1.9)*6,7,i+21);}
  const wc=document.createElement('canvas');wc.width=64;wc.height=256;const x=wc.getContext('2d');for(let i=0;i<64;i++){const v=200+Math.random()*55;x.fillStyle=`rgba(${v},${v+5},${v+10},${.5+Math.random()*.5})`;x.fillRect(i,0,1,256);}for(let i=0;i<300;i++){x.fillStyle='rgba(255,255,255,.5)';x.fillRect(Math.random()*64,Math.random()*256,1,8+Math.random()*30);}
  const wt=new TH.CanvasTexture(wc);wt.wrapS=wt.wrapT=TH.RepeatWrapping;wt.repeat.set(2,3);W.fallTex=wt;
  const fall=new TH.Mesh(new TH.PlaneGeometry(4,21,1,1),new TH.MeshStandardMaterial({map:wt,transparent:true,opacity:.92,roughness:.25,emissive:new TH.Color('#9fb0b8'),emissiveIntensity:.25,side:TH.DoubleSide,depthWrite:false}));fall.position.set(0,10.2,-19.6);W.root.add(fall);
  // Teich
  const water=new TH.MeshPhongMaterial({color:'#0d2226',specular:0x335055,shininess:60,transparent:true,opacity:.96});W.waterMat=water;
  const pond=new TH.Mesh(new TH.CircleGeometry(7,48),water);pond.rotation.x=-Math.PI/2;pond.position.set(0,.04,-12);W.root.add(pond);noGo(0,-12,7.6);
  for(let i=0;i<28;i++){const a=i/28*6.28,r=7.3;if(Math.sin(a)>.85)continue;const s=.4+Math.random()*.5;const b=box(s*1.3,s*.6,s,M.stone,Math.cos(a)*r,-.2,-12+Math.sin(a)*r,1.5);b.rotation.y=a;}
  for(let i=0;i<20;i++){const a=i/20*6.28;W.solids.push([Math.cos(a)*6.8,-12+Math.sin(a)*6.8,.6]);}
  const stream=new TH.Mesh(new TH.PlaneGeometry(2,20),water);stream.rotation.x=-Math.PI/2;stream.position.set(0,.05,4);W.root.add(stream);
  const mist=new TH.Mesh(new TH.SphereGeometry(4,16,10),new TH.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.12,depthWrite:false}));mist.position.set(0,1,-19);mist.scale.y=.6;W.root.add(mist);
  if(st===0){const r=rng(17);for(let i=0;i<10;i++){const s=.3+r()*.5;const b=box(s*1.4,s*.6,s,M.stone,5+r()*4,-.1,-4+r()*6,1.5);b.rotation.set(r()*.3,r()*3,r()*.3);W.solids.push([b.position.x,b.position.z,s*.8]);}return;}
  // S1 Trittsteine + Steg
  for(let k=0;k<9;k++){const t=k/8;cyl(.5,.12,M.stone,3.5+Math.sin(t*5)*.5,0,10-14*t,10);}
  box(4,.14,2.4,M.wood,-4.6,.5,-4.4,1.5);rect(-6.6,-2.6,-5.6,-3.2,.64);[-6.4,-2.8].forEach(x=>[-5.4,-3.4].forEach(z=>cyl(.08,.6,M.wood,x,-.05,z,6)));
  box(3.4,.4,3.4,M.stone,7.4,0,-3.4,2);rect(5.7,9.1,-5.1,-1.7,.4);
  if(st<2)return;
  // S2 Bogenbrücke über den Bach
  const segs=10;for(let k=0;k<segs;k++){const t0=k/segs,t1=(k+1)/segs,xa=-2.2+4.4*t0,xb=-2.2+4.4*t1,ya=.15+.9*Math.sin(t0*Math.PI),yb=.15+.9*Math.sin(t1*Math.PI);const b=box(Math.hypot(xb-xa,yb-ya)+.05,.12,1.5,M.red,(xa+xb)/2,(ya+yb)/2-.06,5,1);b.rotation.z=Math.atan2(yb-ya,xb-xa);}
  W.bridge={x0:-2.2,x1:2.2,z0:4.25,z1:5.75};
  if(st<3)return;
  // S3 Pavillon
  for(let i=0;i<6;i++){const a=i/6*6.28+.26,px=7.4+Math.cos(a)*1.45,pz=-3.4+Math.sin(a)*1.45;cyl(.14,2.6,M.red,px,.4,pz,12);W.solids.push([px,pz,.25]);}
  box(3.2,.22,3.2,M.wood,7.4,3,-3.4,1.5);roof(5.4,5.4,1.6,7.4,3.2,-3.4);cyl(.06,.6,M.gold,7.4,4.75,-3.4,8);
  if(st<4)return;
  // S4 Pagode + Steinlaternen
  pagoda(-9,-15,3,3.2);[[5.6,8],[4,1.5],[9.6,-.8],[-2.6,-3.4]].forEach(([x,z])=>stoneLantern(x,z,st>=5));
  if(st<5)return;
  for(let i=0;i<6;i++){const a=i/6*6.28+.26;lantern(7.4+Math.cos(a)*2.1,2.85,-3.4+Math.sin(a)*2.1,i%2===0);}
  [-2.2,2.2].forEach(x=>[4.25,5.75].forEach(z=>lantern(x,1.2,z,false)));
  flags([6.2,3,-2.2],[-4.6,2.4,-4.4],16,.6);
}

/* Kapitel 4: Gipfel über den Wolken */
function summit(st){
  const M=W.M;W.meisterPos=st>=1?[1.6,.6,-1.8]:[-3,0,3];W.snow=true;
  const snowM=new TH.MeshStandardMaterial({color:'#e9eef5',roughness:.6});
  const r0=rng(23);for(let i=0;i<16;i++){const a=r0()*6.28,d=12+r0()*20,s=.8+r0()*1.8;const b=new TH.Mesh(new TH.DodecahedronGeometry(s,1),i%3?snowM:M.stone);b.position.set(Math.cos(a)*d,groundH(Math.cos(a)*d,Math.sin(a)*d)+s*.3,Math.sin(a)*d);b.scale.y=.6;b.rotation.y=r0()*3;b.castShadow=b.receiveShadow=true;W.root.add(b);W.solids.push([b.position.x,b.position.z,s*.9]);}
  const cx=0,cz=-4;
  if(st===0){const r=rng(29);for(let i=0;i<10;i++){const s=.3+r()*.5;const b=box(s*1.4,s*.5,s,M.stone,cx+(r()-.5)*6,-.1,cz+(r()-.5)*5,1.5);b.rotation.set(r()*.3,r()*3,r()*.3);W.solids.push([b.position.x,b.position.z,s*.8]);}const p=cyl(.07,3.2,M.wood,cx+1.6,0,cz+1,6);p.rotation.set(.25,0,.15);return;}
  // S1 Plattform + Stufen + Steinmännchen
  box(7.2,.6,5.6,M.stone,cx,-.05,cz,2);rect(cx-3.6,cx+3.6,cz-2.8,cz+2.8,.55);
  for(let i=0;i<4;i++)box(2.6,.15*(4-i),.45,M.stone,cx,-.05,cz+2.8+.45*i+.22,1.5);rect(cx-1.3,cx+1.3,cz+2.8,cz+4.6,.3);
  const cairn=(x,z)=>{let y=0;for(let i=0;i<5;i++){const s=.4-i*.06;const b=new TH.Mesh(new TH.DodecahedronGeometry(s,0),M.stone);b.scale.y=.5;b.position.set(x,y+s*.25,z);b.castShadow=true;W.root.add(b);y+=s*.45;}W.solids.push([x,z,.4]);};
  cairn(2.6,6);cairn(-2.2,8);cairn(3.4,10.5);
  if(st<2)return;
  // S2 Mauer + Fahnenmasten
  [[7.2,.35,cx,cz-2.65],[.35,5.6,cx-3.45,cz],[.35,5.6,cx+3.45,cz],[2.4,.35,cx-2.4,cz+2.65],[2.4,.35,cx+2.4,cz+2.65]].forEach(([w,d,x,z])=>{box(w,.7,d,M.stone,x,.55,z,1.5);box(w+.1,.1,d+.1,M.plaster,x,1.25,z,1.5);});
  wallLine(cx-3.45,cz-2.65,cx+3.45,cz-2.65,.3);wallLine(cx-3.45,cz-2.65,cx-3.45,cz+2.65,.3);wallLine(cx+3.45,cz-2.65,cx+3.45,cz+2.65,.3);wallLine(cx-3.45,cz+2.65,cx-1.3,cz+2.65,.3);wallLine(cx+1.3,cz+2.65,cx+3.45,cz+2.65,.3);
  [[cx-3.2,cz+2.4],[cx+3.3,cz+2.4]].forEach(([x,z])=>{cyl(.08,5.5,M.wood,x,.55,z,8);cyl(.12,.3,M.gold,x,6.05,z,8);});flags([cx-3.2,5.9,cz+2.4],[cx+3.3,5.9,cz+2.4],18,.8);
  if(st<3)return;
  // S3 Stupa
  const white=new TH.MeshStandardMaterial({color:'#d8d2c4',roughness:.85});let y=.55;
  [[3.4,.5],[2.9,.45],[2.4,.4]].forEach(([w,h])=>{box(w,h,w,white,cx,y,cz-.2,1.5);y+=h;});
  const dome=new TH.Mesh(new TH.SphereGeometry(1.05,32,20),white);dome.position.set(cx,y+.65,cz-.2);dome.scale.y=.85;dome.castShadow=true;W.root.add(dome);
  const y2=y+1.45;box(.75,.45,.75,white,cx,y2,cz-.2,1);for(let i=0;i<9;i++)cyl(.32-i*.025,.12,M.gold,cx,y2+.45+i*.13,cz-.2,16);W.solids.push([cx,cz-.2,1.9]);
  if(st<4)return;
  // S4 Gebetsmühlen, Gong, Fahnenlinien
  for(let k=0;k<7;k++)cyl(.2,.5,M.red,cx-2.7+k*.9,.75,cz-2.25,14);box(6.6,.08,.7,M.wood,cx,1.55,cz-2.2,1.5);
  const top=[cx,y2+1.9,cz-.2];flags(top,[cx-3.2,5.4,cz+2.4],12,.4);flags(top,[cx+3.3,5.4,cz+2.4],12,.4);flags(top,[cx-3.4,1.4,cz-2.6],12,.3);flags(top,[cx+3.4,1.4,cz-2.6],12,.3);
  if(st<5)return;
  for(let k=0;k<10;k++){const a=k/10*6.28;const fx=cx+Math.cos(a)*1.9,fz=cz-.2+Math.sin(a)*1.9;const f=new TH.Mesh(new TH.SphereGeometry(.05,8,6),M.glow);f.position.set(fx,.68,fz);W.root.add(f);}
  [[cx-3.45,cz+2.65],[cx+3.45,cz+2.65],[cx-3.45,cz-2.65],[cx+3.45,cz-2.65]].forEach(([x,z],i)=>lantern(x,1.55,z,i<2));
  const L=new TH.PointLight(0xffc070,1.5,10,2);L.position.set(cx,4,cz+.6);W.root.add(L);
}
const BUILD=[null,monastery,waterfallScene,summit];

/* ---------- Das Kloster: Räume, Türen, Dorf ---------- */
const RPOS={zelle:{c:[-12,0],f:[1,0]},kueche:{c:[12,0],f:[-1,0]},bibliothek:{c:[-12,-10],f:[1,0]},bad:{c:[12,-10],f:[-1,0]},garten:{c:[-11,12],f:[1,0]},hof:{c:[14,10],f:[-1,0]},tor:{c:[0,25.5],f:[0,-1]},halle:{c:[0,-.6],f:[0,1]}};
function spotOf(id){const p=RPOS[id];if(id==='halle')return[0,.7,.4];if(id==='tor')return[0,0,23];return[p.c[0]+p.f[0]*4.4,0,p.c[1]+p.f[1]*4.4];}
function hut(id,open,label,dusty){
  const M=W.M,P=RPOS[id],[cx,cz]=P.c,[fx,fz]=P.f,ew=fx?5.2:6.4,ed=fx?6.4:5.2,h=2.8,y=.35;
  box(ew+.6,.35,ed+.6,M.stone,cx,0,cz,2);rect(cx-ew/2,cx+ew/2,cz-ed/2,cz+ed/2,.35);
  const wallM=dusty?W.M.dust:M.plaster;
  if(fx){box(.25,h,ed,wallM,cx-fx*ew/2,y,cz,1.7);box(ew,h,.25,wallM,cx,y,cz-ed/2,1.7);box(ew,h,.25,wallM,cx,y,cz+ed/2,1.7);box(.25,h,ed/2-.8,wallM,cx+fx*ew/2,y,cz-ed/4-.4,1.7);box(.25,h,ed/2-.8,wallM,cx+fx*ew/2,y,cz+ed/4+.4,1.7);box(.25,.6,1.6,wallM,cx+fx*ew/2,y+2.2,cz,1.7);}
  else{box(ew,h,.25,wallM,cx,y,cz-fz*ed/2,1.7);box(.25,h,ed,wallM,cx-ew/2,y,cz,1.7);box(.25,h,ed,wallM,cx+ew/2,y,cz,1.7);box(ew/2-.8,h,.25,wallM,cx-ew/4-.4,y,cz+fz*ed/2,1.7);box(ew/2-.8,h,.25,wallM,cx+ew/4+.4,y,cz+fz*ed/2,1.7);box(1.6,.6,.25,wallM,cx,y+2.2,cz+fz*ed/2,1.7);}
  const dx=cx+fx*(ew/2+.05),dz=cz+fz*(ed/2+.05);
  [-.85,.85].forEach(o=>cyl(.1,2.25,M.red,dx+(fz?o:0),y,dz+(fx?o:0),8));
  const rf=roof(ew+2.2,ed+2.2,1.5,cx,y+h+.15,cz);W.huts[id]={x0:cx-ew/2,x1:cx+ew/2,z0:cz-ed/2,z1:cz+ed/2,roof:[rf,rf.userData.under]};
  // Holzboden innen
  const fl=new TH.Mesh(new TH.PlaneGeometry(ew-.3,ed-.3),new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#8a6a4c',roughness:.8}));fl.rotation.x=-Math.PI/2;fl.position.set(cx,y+.01,cz);fl.receiveShadow=true;W.root.add(fl);
  // Tür
  const door=new TH.Mesh(new TH.BoxGeometry(fx?.08:1.55,2.1,fx?1.55:.08),M.wood);door.castShadow=true;
  if(open){door.position.set(dx+fx*.7,y+1.05,dz+fz*.7+(fx?-.8:0));if(fz)door.position.x=dx-.8;door.rotation.y=Math.PI/2.3;
    const L=new TH.PointLight(0xffb070,.6,7,2);L.position.set(cx,y+2.2,cz);W.root.add(L);W.flick.push(L);}
  else{door.position.set(dx,y+1.05,dz);const lock=new TH.Mesh(new TH.BoxGeometry(fx?.12:.22,.26,fx?.22:.12),M.gold);lock.position.set(dx+fx*.1,y+1.0,dz+fz*.1);W.root.add(lock);
    const bar=new TH.Mesh(new TH.BoxGeometry(fx?.06:1.7,.07,fx?1.7:.06),new TH.MeshStandardMaterial({color:'#3a3a3e',metalness:.8,roughness:.4}));bar.position.set(dx+fx*.08,y+1.1,dz+fz*.08);W.root.add(bar);}
  W.root.add(door);
  if(dusty){for(let i=0;i<3;i++){const web=new TH.Mesh(new TH.PlaneGeometry(.7,.7),new TH.MeshBasicMaterial({color:0xdddddd,transparent:true,opacity:.25,side:TH.DoubleSide}));web.position.set(dx+fx*.2+(fz?(i-1)*.6:0),y+2.1-i*.2,dz+fz*.2+(fx?(i-1)*.6:0));web.rotation.y=fx?Math.PI/2:0;W.root.add(web);}}
  // Schild
  const cv=document.createElement('canvas');cv.width=256;cv.height=64;const x=cv.getContext('2d');x.fillStyle='#2a1810';x.fillRect(0,0,256,64);x.fillStyle=open?'#f2d48a':'#9a9088';x.font='600 30px Rubik, sans-serif';x.textAlign='center';x.fillText(label,128,42);
  const sg=new TH.Mesh(new TH.PlaneGeometry(1.6,.4),new TH.MeshBasicMaterial({map:new TH.CanvasTexture(cv)}));sg.position.set(dx+fx*.16,y+2.55,dz+fz*.16);sg.rotation.y=fx>0?Math.PI/2:fx<0?-Math.PI/2:fz<0?Math.PI:0;W.root.add(sg);
  // Kollision mit Türöffnung
  const x0=cx-ew/2,x1=cx+ew/2,z0=cz-ed/2,z1=cz+ed/2,r=.3;
  const seg=(ax,az,bx,bz)=>wallLine(ax,az,bx,bz,r);
  if(fx){seg(x0,z0,x1,z0);seg(x0,z1,x1,z1);const bx=fx>0?x0:x1,fx2=fx>0?x1:x0;seg(bx,z0,bx,z1);seg(fx2,z0,fx2,cz-.85);seg(fx2,cz+.85,fx2,z1);if(!open)seg(fx2,cz-.85,fx2,cz+.85);}
  else{seg(x0,z0,x0,z1);seg(x1,z0,x1,z1);const bz=fz>0?z0:z1,fz2=fz>0?z1:z0;seg(x0,bz,x1,bz);seg(x0,fz2,cx-.85,fz2);seg(cx+.85,fz2,x1,fz2);if(!open)seg(cx-.85,fz2,cx+.85,fz2);}
  noGo(cx,cz,4.5);
  if(open)furnish(id,cx,cz,fx,fz,ew,ed,y);
}
/* Einrichtung: der Ort, an dem eingetragen wird */
function furnish(id,cx,cz,fx,fz,ew,ed,y){
  const M=W.M,bx=cx-fx*(ew/2-1.1),bz=cz-fz*(ed/2-1.1);// hintere Zone
  const darkW=new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#5a3e2a',roughness:.8});
  let spot=[cx,cz];
  if(id==='zelle'){const bw=fx?1:2.1,bd=fx?2.1:1;box(bw,.35,bd,darkW,bx,y,cz+(fx?-1.2:0)+(fz?0:0),1);const mat=box(bw-.1,.18,bd-.1,new TH.MeshStandardMaterial({color:'#d8cfbd',roughness:1}),bx,y+.35,cz+(fx?-1.2:0),1);
    const pil=box(fx?.7:.4,.12,fx?.4:.7,new TH.MeshStandardMaterial({color:'#efe8da',roughness:1}),bx+(fx?0:-.7),y+.53,cz+(fx?-1.85:0),1);
    W.solids.push([bx,cz+(fx?-1.2:0),.7]);box(.5,.5,.5,darkW,bx,y,cz+(fx?.6:1.2),1);
    const fl=new TH.Mesh(new TH.SphereGeometry(.02,6,4),M.glow);fl.scale.y=1.7;fl.position.set(bx,y+.5+.25,cz+(fx?.6:1.2));W.root.add(fl);(W.flames=W.flames||[]).push(fl);spot=[bx+fx*1.1,cz+(fx?-1.2:0)];}
  if(id==='kueche'){box(1.4,.9,1,M.stone,bx,y,cz,1.2);
    const fire=new TH.Mesh(new TH.BoxGeometry(.5,.18,.05),M.glow);fire.position.set(bx+fx*.52,y+.3,cz+fz*.52);fire.rotation.y=fx?Math.PI/2:0;W.root.add(fire);const L=new TH.PointLight(0xff7a30,1,4,2);L.position.set(bx+fx*.9,y+.5,cz);W.root.add(L);W.flick.push(L);
    W.solids.push([bx,cz,.9]);box(fx?1:1.6,.75,fx?1.6:1,darkW,cx+fx*.3,y,cz+(fx?1.6:0)+(fz?0:0),1);spot=[bx+fx*1.2,cz];}
  if(id==='bibliothek'){const n0=W.root.children.length;for(let i=0;i<3;i++){const sx=fx?bx:cx-1.6+i*1.6,sz=fx?cz-1.6+i*1.6:bz;box(fx?.4:1.4,2.2,fx?1.4:.4,darkW,sx,y,sz,1);for(let k=0;k<4;k++)for(let b=0;b<5;b++){const bk=new TH.Mesh(new TH.BoxGeometry(fx?.25:.18,.32,fx?.18:.25),new TH.MeshStandardMaterial({color:['#7a2a1c','#2a4a6a','#4a6a3a','#8a6a2a','#5a3a6a'][(b+k+i)%5],roughness:.8}));bk.position.set(sx+(fx?fx*.1:-.5+b*.25),y+.35+k*.5,sz+(fx?-.5+b*.25:fz*.1));W.root.add(bk);}W.solids.push([sx,sz,.8]);}W.libPrim=W.root.children.slice(n0);
    box(fx?.9:1.4,.75,fx?1.4:.9,darkW,cx+fx*.4,y,cz+(fx?0:0),1);const sc=new TH.Mesh(new TH.CylinderGeometry(.05,.05,.5,8),new TH.MeshStandardMaterial({color:'#e9dcc0'}));sc.rotation.z=Math.PI/2;sc.position.set(cx+fx*.4,y+.8,cz);W.root.add(sc);W.solids.push([cx+fx*.4,cz,.6]);spot=[cx+fx*1.4,cz];}
  if(id==='bad'){const bw=new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#b08458',roughness:.7}),band=new TH.MeshStandardMaterial({color:'#2a2622',metalness:.6,roughness:.4});
    for(let k=0;k<26;k++){const a=k/26*6.283,st=new TH.Mesh(new TH.BoxGeometry(.22,.78,.06),bw);st.position.set(bx+Math.cos(a)*.86,y+.39,cz+Math.sin(a)*.86);st.rotation.y=-a+Math.PI/2;st.castShadow=true;W.root.add(st);}
    [.15,.6].forEach(h=>{const t=new TH.Mesh(new TH.TorusGeometry(.895,.025,6,40),band);t.rotation.x=Math.PI/2;t.position.set(bx,y+h,cz);W.root.add(t);});
    const rim=new TH.Mesh(new TH.TorusGeometry(.86,.04,6,40),bw);rim.rotation.x=Math.PI/2;rim.position.set(bx,y+.78,cz);W.root.add(rim);
    const wcv=document.createElement('canvas');wcv.width=wcv.height=128;const wx=wcv.getContext('2d');wx.fillStyle='#4a8a8a';wx.fillRect(0,0,128,128);for(let r=6;r<64;r+=7){wx.strokeStyle=`rgba(255,255,255,${.18-r/500})`;wx.lineWidth=2;wx.beginPath();wx.arc(64,64,r,0,6.3);wx.stroke();}
    const wtx=new TH.CanvasTexture(wcv);const wt=new TH.Mesh(new TH.CircleGeometry(.83,32),new TH.MeshStandardMaterial({map:wtx,roughness:.08,metalness:.25,transparent:true,opacity:.92}));wt.rotation.x=-Math.PI/2;wt.position.set(bx,y+.68,cz);W.root.add(wt);W.bathW=wt;W.solids.push([bx,cz,1]);
    // Lattenrost
    for(let k=0;k<7;k++){const sl=box(fx?.1:1.3,.05,fx?1.3:.1,bw,bx+fx*(1.25+k*.15),y,cz,1);}
    // Bambusrohr + Steinbecken
    const sbx=bx+fx*.1,sbz=cz+(ed/2-.75);const basin=new TH.Mesh(new TH.CylinderGeometry(.34,.4,.42,18),M.stone);basin.position.set(sbx,y+.21,sbz);basin.castShadow=true;W.root.add(basin);
    const bw2=new TH.Mesh(new TH.CircleGeometry(.27,18),new TH.MeshStandardMaterial({color:'#3a6a6a',roughness:.05,metalness:.3}));bw2.rotation.x=-Math.PI/2;bw2.position.set(sbx,y+.43,sbz);W.root.add(bw2);
    const bam=new TH.MeshStandardMaterial({color:'#8a9a4a',roughness:.5});const pipe=new TH.Mesh(new TH.CylinderGeometry(.045,.05,1,10),bam);pipe.rotation.x=Math.PI/2;pipe.rotation.z=.12;pipe.position.set(sbx,y+.95,sbz+.45);W.root.add(pipe);
    const post=new TH.Mesh(new TH.CylinderGeometry(.06,.06,1,10),bam);post.position.set(sbx,y+.5,sbz+.95);W.root.add(post);
    const strm=new TH.Mesh(new TH.CylinderGeometry(.015,.02,.5,8),new TH.MeshStandardMaterial({color:'#cfeaf0',transparent:true,opacity:.55,roughness:.05}));strm.position.set(sbx,y+.68,sbz-.03);W.root.add(strm);W.bathS=strm;W.solids.push([sbx,sbz,.45]);
    // Handtücher
    const tx=bx+fx*1.6,tz=cz-(ed/2-.5);box(fx?.45:.8,.5,fx?.8:.45,bw,tx,y,tz,1);['#efe9dc','#2e4a6a','#efe9dc'].forEach((c,k)=>{const t=box(fx?.38:.6,.07,fx?.6:.38,new TH.MeshStandardMaterial({color:c,roughness:1}),tx,y+.5+k*.075,tz,1);});W.solids.push([tx,tz,.45]);
    spot=[bx+fx*1.3,cz];}
  W.roomSpot[id]=spot;decorRoom(id,cx,cz,fx,ew,ed,y);
}
function gardenArea(open){const M=W.M,[cx,cz]=RPOS.garten.c;for(let i=0;i<14;i++){const a=i/14*6.28;if(Math.cos(a)>.9)continue;cyl(.06,1,M.wood,cx+Math.cos(a)*4.2,0,cz+Math.sin(a)*4.2,6);}
  const pond=new TH.Mesh(new TH.CircleGeometry(1.6,24),new TH.MeshPhongMaterial({color:'#0d2226',shininess:60}));pond.rotation.x=-Math.PI/2;pond.position.set(cx-1,.03,cz);W.root.add(pond);
  box(1.8,.45,.5,M.wood,cx+1.4,0,cz+1.6,1);noGo(cx,cz,4.6);
  for(let i=0;i<14;i++){const a=i/14*6.28;if(Math.cos(a)>.9)continue;W.solids.push([cx+Math.cos(a)*4.2,cz+Math.sin(a)*4.2,.3]);}
  const gx=cx+4.2,gz=cz;cyl(.12,2.2,M.red,gx,0,gz-1,8);cyl(.12,2.2,M.red,gx,0,gz+1,8);box(.3,.3,2.6,M.red,gx,2.1,gz,1);
  if(!open){const gate=box(.08,1.2,1.9,M.wood,gx,0,gz,1);const lock=new TH.Mesh(new TH.BoxGeometry(.12,.24,.22),M.gold);lock.position.set(gx+.06,.7,gz);W.root.add(lock);W.solids.push([gx,gz,1]);}}
function hofArea(open){const M=W.M,[cx,cz]=RPOS.hof.c;box(1.6,.45,.45,M.wood,cx,0,cz,1);[-.6,.6].forEach(o=>{cyl(.04,.9,M.wood,cx+o,.45,cz-.35,6);});
  const bar=cyl(.03,1.6,new TH.MeshStandardMaterial({color:'#555',metalness:.8,roughness:.4}),cx,1.3,cz-.35,8);bar.rotation.z=Math.PI/2;bar.position.set(cx,1.35,cz-.35);
  [-.8,.8].forEach(o=>{const w=cyl(.22,.08,new TH.MeshStandardMaterial({color:'#222',roughness:.6}),cx+o,1.35,cz-.35,16);w.rotation.z=Math.PI/2;w.position.set(cx+o,1.35,cz-.35);});
  W.solids.push([cx,cz,1]);if(!open){[[-2,-2],[2,-2],[2,2],[-2,2]].forEach(([a,b])=>cyl(.07,1,M.wood,cx+a,0,cz+b,6));const r=new TH.Mesh(new TH.BoxGeometry(4,.04,.04),new TH.MeshStandardMaterial({color:'#7a5a3a'}));r.position.set(cx,.85,cz-2);W.root.add(r);}}
function gate(open){const M=W.M,z=25.5;[-2.4,2.4].forEach(x=>{cyl(.3,4.2,M.red,x,0,z,12);W.solids.push([x,z,.5]);});box(6.4,.5,.7,M.red,0,4.2,z,1.5);box(5.6,.3,.5,M.red,0,3.6,z,1.5);roof(7.6,2.2,.8,0,4.7,z);
  if(!open){const d=box(4.4,3.4,.12,M.wood,0,0,z,1);const lock=new TH.Mesh(new TH.BoxGeometry(.3,.34,.16),M.gold);lock.position.set(0,1.6,z-.1);W.root.add(lock);}
  wallLine(-14,z,-2.6,z,.5);wallLine(2.6,z,14,z,.5);for(let x=-14;x<=14;x+=1.2){if(Math.abs(x)<2.6)continue;box(1.2,1.1,.4,M.stone,x,0,z,1);}}
function village(){
  const v=DW.village(),lvl=v.lvl,got=v.got||[],has=k=>got.includes(k),M=W.M,night=W.tod.night;
  const g=new TH.Group();W.root.add(g);W.vbox=[];W.vU={wheels:[],water:[],chick:[],sky:[]};const root0=W.root;W.root=g;
  const gh=(x,z)=>groundH(x,z);
  try{
  W.villageAt=[0,gh(0,52),52];
  // ---- Wege (folgen dem Gelände)
  const strip=(x0,z0,x1,z1,wd,mat,off)=>{const L=Math.hypot(x1-x0,z1-z0),n=Math.max(2,Math.ceil(L/1.2)),geo=new TH.PlaneGeometry(wd,L,2,n);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,ang=Math.atan2(x1-x0,z1-z0),c=Math.cos(ang),s=Math.sin(ang),mx=(x0+x1)/2,mz=(z0+z1)/2;
    for(let i=0;i<p.count;i++){const lx=p.getX(i),lz=-p.getZ(i),wx=mx+lx*c+lz*s,wz=mz-lx*s+lz*c;p.setXYZ(i,wx,gh(wx,wz)+(off||.04),wz);}geo.computeVertexNormals();const m=new TH.Mesh(geo,mat);m.receiveShadow=true;g.add(m);return m;};
  const pathM=has('pfad')?new TH.MeshStandardMaterial({map:W.tex.stoneD,color:'#9a9288',roughness:1}):new TH.MeshStandardMaterial({color:'#6e5a44',roughness:1});
  strip(0,37.5,0,62,3,pathM);strip(-24,52,24,52,2.6,pathM);
  {const geo=new TH.CircleGeometry(6.5,40,0);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i)+52;p.setXYZ(i,x,gh(x,z)+.05,z);}const m=new TH.Mesh(geo,pathM);m.receiveShadow=true;g.add(m);}
  // ---- Bach mit Wasserband
  {const n=60,pos=[],uv=[],idx=[];for(let i=0;i<=n;i++){const x=-31+i*62/n,y=Math.min(gh(x,62.9),gh(x,65.1))-.18;[62.7,65.3].forEach((z,k)=>{pos.push(x,y,z);uv.push(i*.6,k);});if(i<n){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
   const geo=new TH.BufferGeometry();geo.setAttribute('position',new TH.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
   const cv=document.createElement('canvas');cv.width=64;cv.height=64;const x=cv.getContext('2d');x.fillStyle='#2f5a5a';x.fillRect(0,0,64,64);for(let i=0;i<40;i++){x.strokeStyle=`rgba(220,240,240,${.08+Math.random()*.15})`;x.beginPath();const yy=Math.random()*64;x.moveTo(Math.random()*64,yy);x.lineTo(Math.random()*64,yy+Math.random()*3-1.5);x.stroke();}
   const t=new TH.CanvasTexture(cv);t.wrapS=t.wrapT=TH.RepeatWrapping;const wm=new TH.Mesh(geo,new TH.MeshStandardMaterial({map:t,roughness:.1,metalness:.3,transparent:true,opacity:.85}));g.add(wm);W.vU.water.push(t);}
  // ---- Brücke
  W.vBridge=has('bruecke');
  {const wd=new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#7a5232',roughness:.85}),b0=Math.max(gh(0,61.8),gh(0,66.2));
   if(W.vBridge){for(let i=0;i<=12;i++){const z=61.8+i*4.4/12,y=b0+.5*Math.sin(i/12*Math.PI);const pl=box(2.4,.08,.42,wd,0,y,z,1);pl.rotation.x=Math.cos(i/12*Math.PI)*.35;}
     [-1.15,1.15].forEach(sx=>{for(let i=0;i<=4;i++){const z=61.8+i*1.1,y=b0+.5*Math.sin(i/4*Math.PI);cyl(.05,.75,M.red,sx,y,z,6);}for(let i=0;i<4;i++){const z=62.35+i*1.1,y=b0+.5*Math.sin((i+.5)/4*Math.PI)+.7;const r=box(.07,.07,1.15,M.red,sx,y,z,1);}});}
   else{box(2.4,.1,1.2,wd,0,b0,61.9,1);box(2.4,.1,1.2,wd,0,b0,66.1,1);const br=box(2.2,.08,1.4,wd,.4,b0-.45,64,1);br.rotation.set(.3,.4,.2);}}
  W.vBr0=Math.max(gh(0,61.8),gh(0,66.2));
  // ---- Felder hinter dem Bach
  {const green=lvl>=1;for(let r=0;r<2;r++)for(let i=0;i<7;i++){const x=-21+i*7,z=69+r*5.2;if(Math.abs(x)<2)continue;const geo=new TH.PlaneGeometry(6.2,4.4,6,4);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,y0=gh(x,z);for(let k=0;k<p.count;k++)p.setY(k,y0+.06);
     const cv=document.createElement('canvas');cv.width=64;cv.height=64;const c=cv.getContext('2d');c.fillStyle=green?'#3f6a2a':'#5a4630';c.fillRect(0,0,64,64);c.fillStyle=green?'#6a9a3a':'#4a3a26';for(let k=0;k<64;k+=6)c.fillRect(0,k,64,2);if(green){c.fillStyle='rgba(150,200,220,.25)';c.fillRect(0,3,64,2);}
     const m=new TH.Mesh(geo,new TH.MeshStandardMaterial({map:new TH.CanvasTexture(cv),roughness:green?.5:1}));m.position.set(x,0,z);m.receiveShadow=true;g.add(m);
     const dm=new TH.MeshStandardMaterial({color:'#6a5a40',roughness:1});box(6.4,.25,.25,dm,x,y0,z-2.3,1);box(.25,.25,4.6,dm,x-3.2,y0,z,1);}}
  // ---- Häuser
  const HS=[[-6,42,1],[6,42,-1],[-6,47.5,1],[6,47.5,-1],[-10.5,55.5,2],[10.5,55.5,2],[-12,48,1],[12,48,-1],[-17,52.5,1],[17,52.5,-1],[-6.5,59,2],[6.5,59,2],[-12,41.5,1],[12,41.5,-1],[-21,46,1],[21,46,-1],[-21,58,2],[21,58,2]];
  const nH=[4,8,13,18][lvl];const roofOk=has('dach');let hi=0;
  const plast=M.plaster,beam=new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#4a3220',roughness:.8});
  const vhouse=(x,z,face,s,kind)=>{const rot=face===1?Math.PI/2:face===-1?-Math.PI/2:face===2?Math.PI:0;const w=4.2*s,d=3.4*s,y=gh(x,z);const hg=new TH.Group();hg.position.set(x,y,z);hg.rotation.y=rot;g.add(hg);
    const R0=W.root;W.root=hg;try{
      box(w+.4,1.4,d+.4,M.stone,0,-1.1,0,1.5);box(w,2.3*s,d,plast,0,.3,0,1.7);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(.2,2.3*s,.2,beam,a*w/2,.3,b*d/2,1));box(w+.1,.16,d+.1,beam,0,.3+2.3*s-.1,0,1);box(w+.1,.12,d+.1,beam,0,1.3*s,0,1);
      const door=new TH.Mesh(new TH.PlaneGeometry(.9*s,1.7*s),new TH.MeshStandardMaterial({color:'#2a1a12',roughness:.9}));door.position.set(0,.3+.85*s,d/2+.01);hg.add(door);
      const lit=night||lvl>=3,wm=lit?M.glow:new TH.MeshStandardMaterial({color:'#e8dcc0',roughness:.8});[-1,1].forEach(sd=>{const wi=new TH.Mesh(new TH.PlaneGeometry(.7*s,.6*s),wm);wi.position.set(sd*w*.3,.3+1.5*s,d/2+.01);hg.add(wi);});
      const broken=!roofOk&&hi%3===1;const rf=roof(w+1.6,d+1.6,1.2*s,0,.3+2.3*s,0);if(broken){rf.rotation.z=.18;rf.position.y-=.25;rf.material=new TH.MeshStandardMaterial({color:'#3a332c',roughness:1});if(rf.userData.under)rf.userData.under.visible=false;}
      if(hi%2===0){box(.4,1.4,.4,M.stone,w*.3,.3+2.3*s,-d*.2,1);if(!broken)smoke(x,y+.3+2.3*s+1.5,z,6,0xcfcac2);}
      if(kind==='heil'){const ban=new TH.Mesh(new TH.PlaneGeometry(.5,1.4),new TH.MeshStandardMaterial({color:'#3a7a4a',side:TH.DoubleSide}));ban.position.set(w/2+.3,1.6*s,d/2+.2);hg.add(ban);for(let i=0;i<5;i++){const h=new TH.Mesh(new TH.ConeGeometry(.08,.35,6),new TH.MeshStandardMaterial({color:i%2?'#6a8a3a':'#a8a06a'}));h.rotation.x=Math.PI;h.position.set(-w/2+.6+i*.35,.3+2.0*s,d/2+.5);hg.add(h);}box(2,.06,.06,beam,-w/2+1.3,.3+2.2*s,d/2+.5,1);}
      if(kind==='schule'){cyl(.08,2.6,beam,w/2+.9,.3,d/2,6);cyl(.08,2.6,beam,w/2+1.9,.3,d/2,6);box(1.2,.12,.12,beam,w/2+1.4,2.85,d/2,1);const bl=new TH.Mesh(new TH.CylinderGeometry(.14,.26,.4,12,1,true),new TH.MeshStandardMaterial({color:'#b8862a',metalness:.7,roughness:.35,side:TH.DoubleSide}));bl.position.set(w/2+1.4,2.55,d/2);hg.add(bl);}
    }finally{W.root=R0;}
    W.vbox.push([x,z,(face===1||face===-1?d:w)/2+.25,(face===1||face===-1?w:d)/2+.25]);hi++;return hg;};
  for(let i=0;i<nH;i++){const[x,z,f]=HS[i];vhouse(x,z,f,i%3===2?1.15:1);}
  if(has('medizin'))vhouse(-15,60,1,1,'heil');
  if(has('schule'))vhouse(14,61,-1,1.35,'schule');
  // ---- Brunnen
  {const y=gh(0,52);if(has('brunnen')){cyl(.95,.7,M.stone,0,y,52,16);const wt=new TH.Mesh(new TH.CircleGeometry(.8,20),new TH.MeshStandardMaterial({color:'#3a6a70',roughness:.1,metalness:.3}));wt.rotation.x=-Math.PI/2;wt.position.set(0,y+.62,52);g.add(wt);
     [-1,1].forEach(sd=>cyl(.07,2,M.wood,sd*.85,y,52,6));box(2.2,.08,1.4,M.roof,0,y+2.05,52,1);cyl(.05,1.7,M.wood,0,y+1.5,52,6).rotation.z=Math.PI/2;const bk=cyl(.14,.25,M.wood,0,y+.9,52,10,.11);}
   else{cyl(.95,.45,M.stone,0,y,52,10);box(.6,.3,.4,M.stone,1.3,y,52.6,1).rotation.y=.6;}W.vbox.push([0,52,1.05,1.05]);}
  // ---- Markt
  if(has('ernte')||lvl>=2){[[-3.8,56.6],[3.8,56.6]].forEach(([x,z],i)=>{const sg=new TH.Group();sg.position.y=gh(x,z);g.add(sg);const r1=W.root;W.root=sg;try{stall(x,z);}finally{W.root=r1;}
     const crate=(cx,cz,col)=>{box(.5,.3,.4,beam,cx,gh(cx,cz),cz,1);for(let k=0;k<6;k++){const f=new TH.Mesh(new TH.SphereGeometry(.07,8,6),new TH.MeshStandardMaterial({color:col}));f.position.set(cx-.15+(k%3)*.15,gh(cx,cz)+.34,cz-.08+Math.floor(k/3)*.16);g.add(f);}};crate(x+1.4,z-.6,i?'#e8a02a':'#c83a2a');crate(x+1.4,z+.2,i?'#6a9a3a':'#e8d24a');});}
  // ---- Laternenketten
  if(has('laternen')||lvl>=3){const chain=(a,b,n)=>{for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,y=a[1]+(b[1]-a[1])*t-Math.sin(t*Math.PI)*.6;const l=new TH.Mesh(new TH.SphereGeometry(.17,10,8),new TH.MeshStandardMaterial({color:i%2?'#e04a2a':'#f2b23a',emissive:i%2?'#e04a2a':'#f2b23a',emissiveIntensity:night?1.6:.35}));l.scale.y=1.25;l.position.set(x,y,z);g.add(l);}};
    for(let z=40;z<=60;z+=5){const y=gh(0,z);[-2.3,2.3].forEach(sx=>cyl(.06,3.6,beam,sx,gh(sx,z),z,6));chain([-2.3,y+3.5,z],[2.3,y+3.5,z],6);}
    for(let i=0;i<8;i++){const a=i/8*6.28,b=(i+1)/8*6.28,y=gh(0,52)+3.8;chain([Math.cos(a)*6,y,52+Math.sin(a)*6],[Math.cos(b)*6,y,52+Math.sin(b)*6],4);cyl(.07,3.9,beam,Math.cos(a)*6,gh(Math.cos(a)*6,52+Math.sin(a)*6),52+Math.sin(a)*6,6);}}
  // ---- Wassermühle
  if(lvl>=2){const x=11,z=62.6,y=Math.min(gh(x,62.9),gh(x,65.1))-.1;const wh=new TH.Group();wh.position.set(x,y+.9,z+.2);g.add(wh);const rm=new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#5a3e28'});
    const tor=new TH.Mesh(new TH.TorusGeometry(1.1,.07,6,24),rm);tor.rotation.y=Math.PI/2;wh.add(tor);for(let i=0;i<10;i++){const p=new TH.Mesh(new TH.BoxGeometry(.5,.08,.35),rm);const a=i/10*6.28;p.position.set(0,Math.sin(a)*1.05,Math.cos(a)*1.05);p.rotation.x=-a;wh.add(p);}const ax=new TH.Mesh(new TH.CylinderGeometry(.08,.08,1.2,8),rm);ax.rotation.z=Math.PI/2;wh.add(ax);W.vU.wheels.push(wh);}
  // ---- Pagode & Fest
  if(lvl>=3){const pg=new TH.Group();pg.position.y=gh(0,76);g.add(pg);const r1=W.root;W.root=pg;try{pagoda(0,76,4,3.2);stoneLantern(-3,73,true);stoneLantern(3,73,true);}finally{W.root=r1;}
    if(night)for(let i=0;i<22;i++){const sp=new TH.Sprite(new TH.SpriteMaterial({map:softTex(),color:0xffa040,transparent:true,depthWrite:false,blending:TH.AdditiveBlending}));sp.scale.setScalar(.5);sp.userData={x:(Math.random()-.5)*14,z:52+(Math.random()-.5)*10,t:Math.random()};g.add(sp);W.vU.sky.push(sp);}}
  if(lvl>=1)flags([-6,gh(-6,52)+4.5,52],[6,gh(6,52)+4.5,52],18,.6);
  // ---- Hühner
  for(let i=0;i<2+lvl*2;i++){const c=new TH.Group(),wm=new TH.MeshStandardMaterial({color:i%3?'#f2efe6':'#a8642a',roughness:.9});const b=new TH.Mesh(new TH.SphereGeometry(.16,10,8),wm);b.scale.set(.8,.85,1.15);b.position.y=.2;c.add(b);
    const hd=new TH.Mesh(new TH.SphereGeometry(.08,8,6),wm);hd.position.set(0,.36,.14);c.add(hd);const cm=new TH.Mesh(new TH.BoxGeometry(.02,.06,.07),new TH.MeshStandardMaterial({color:'#d22a2a'}));cm.position.set(0,.44,.14);c.add(cm);const bk=new TH.Mesh(new TH.ConeGeometry(.025,.06,5),new TH.MeshStandardMaterial({color:'#e8a02a'}));bk.rotation.x=Math.PI/2;bk.position.set(0,.36,.23);c.add(bk);
    const tl=new TH.Mesh(new TH.ConeGeometry(.08,.18,6),wm);tl.rotation.x=-.9;tl.position.set(0,.3,-.18);c.add(tl);const hx=(i%2?-1:1)*(4+i*1.3),hz=44+(i*3.7)%14;c.position.set(hx,gh(hx,hz),hz);g.add(c);W.vU.chick.push({c,hd,home:[hx,hz],tgt:[hx,hz],wait:Math.random()*3,peck:0});}
  // ---- Abstieg/Aufstieg
  W.inter.push({x:0,z:38.6,r:1.6,label:'Pfad zum Kloster',btn:'Hinaufsteigen',act:()=>leaveVillage()});
  if(night){[[0,52],[0,44],[0,58]].forEach(([x,z])=>{const L=new TH.PointLight(0xffa860,1.3,12,2);L.position.set(x,gh(x,z)+3,z);g.add(L);W.flick.push(L);});}
  }finally{W.root=root0;}
  vnpcs(lvl);
}
const VSAY=['Seit das Kloster uns hilft, lachen die Kinder wieder.','Die Ernte war gut dieses Jahr. Danke dir.','Mein Grossvater erzählte, früher sei das Tal voller Laternen gewesen.','Hast du die Hühner gesehen? Eins fehlt schon wieder.','Wer im Kloster lebt, steht früh auf. Das sieht man dir an.','Komm am Markttag wieder, dann gibt es süsse Reiskuchen.','Die Mönche oben sind still. Aber ihre Arbeit hört man im ganzen Tal.'];
function vnpcs(lvl){if(!window.MonkKit)return;MonkKit.load(()=>{if(!W||W.ch)return;W.npcs=W.npcs||[];
  const mk=(robe,skin,hair,cfg)=>{const o=MonkKit.npc(robe,skin,hair);if(!o)return;o.traverse(c=>{if(c.isMesh)c.castShadow=true;});if(cfg.sc)o.scale.multiplyScalar(cfg.sc);W.root.add(o);const mx=new TH.AnimationMixer(o),A={};MonkKit.gltf.animations.forEach(c=>A[c.name]=mx.clipAction(c));['Idle','Walk'].forEach(n=>{if(A[n]){A[n].play();A[n].setEffectiveWeight(0);}});
    const N={o,mx,A,i:0,wait:Math.random()*3,mode:'walk',pts:cfg.pts,sp:cfg.sp||.8,cur:null,name:cfg.name};o.position.set(cfg.pts[0][0],groundH(cfg.pts[0][0],cfg.pts[0][1]),cfg.pts[0][1]);
    const it={x:o.position.x,z:o.position.z,r:1.6,label:cfg.name,btn:cfg.elder?'Sprechen':'Grüssen',act:()=>{N.wait=Math.max(N.wait,3);N.face=true;if(cfg.elder){roomDialog('tor');return;}const ev=DW.village();const line=Math.random()<.4&&ev.ev&&!ev.ok?`Hast du gehört? ${ev.ev.n}. Die Älteste Mei sammelt Hilfe.`:VSAY[Math.floor(Math.random()*VSAY.length)];msg(cfg.name+': «'+line+'»');DW.bell(.7);}};W.inter.push(it);N.it=it;
    ['Bow'].forEach(n=>xclip(n,c=>{const a=mx.clipAction(c);a.play();a.setEffectiveWeight(0);A[n]=a;}));W.npcs.push(N);};
  mk('#5a4a6a','#c99a72','#d8d4cc',{name:'Älteste Mei',elder:1,pts:[[1.8,50.2]],sp:.3});
  const V=[['#4a5a6a','#c9926a','#2a2420','Bauer Jun',[[-3,44],[-3,58],[4,58],[4,44]],.8],['#7a4a3a','#a8784f','#1a1614','Händlerin Yu',[[-8,53],[8,53],[8,51],[-8,51]],.7],['#3a4a3a','#e0b896','#3a2a20','Fischer Bo',[[-20,61],[20,61]],.6],
    ['#6a5a3a','#8a5a3a','#1a1614','Weberin Sun',[[-14,44],[-14,56],[-8,56]],.7],['#4a3a5a','#c99a72','#2a2420','Kind Ling',[[-4,48],[4,48],[4,55],[-4,55]],1.2,.7],['#3a5a6a','#a8784f','#1a1614','Kind Pei',[[10,48],[3,54],[10,58]],1.3,.68]];
  V.slice(0,[2,3,5,6][lvl]).forEach(([r,s,h,n,pts,sp,sc])=>mk(r,s,h,{name:n,pts,sp,sc}));});}
function goVillage(){if(!W||!W.av)return;endTalk();W.inVillage=1;const z=39.6,y=groundH(0,z);W.av.position.set(0,y,z);W.av.rotation.y=0;W.yaw=Math.PI;W.cam.position.set(0,y+3,z-5);W.camOv=null;
  if(W.fogSave)W.scene.fog.density=W.fogSave;const v=DW.village();msg(`Das Dorf im Tal · ${v.stufe}`);DW.bell(.8);}
function leaveVillage(){if(!W||!W.av)return;W.inVillage=0;W.av.position.set(0,0,23);W.av.rotation.y=Math.PI;W.yaw=0;W.cam.position.set(0,3,26);msg('Zurück im Kloster');}
function vBlocked(x,z){if(Math.abs(x)>30||z<38||z>79)return true;
  for(const b of W.vbox||[]){if(Math.abs(x-b[0])<b[2]&&Math.abs(z-b[1])<b[3])return true;}
  if(z>62.5&&z<65.5){if(!W.vBridge||Math.abs(x)>1.1)return true;}return false;}
function vUpdate(dt,t){const U=W.vU;if(!U)return;U.wheels.forEach(w=>w.rotation.x-=dt*.8);U.water.forEach(tx=>{tx.offset.x-=dt*.25;});
  U.sky.forEach(s=>{const u=s.userData;u.t=(u.t+dt*.03)%1;s.position.set(u.x+Math.sin(t*.3+u.z)*.5,W.villageAt[1]+2+u.t*30,u.z);s.material.opacity=Math.min(1,(1-u.t)*2)*(.6+Math.sin(t*5+u.x)*.2);});
  U.chick.forEach(C=>{const c=C.c;if(C.wait>0){C.wait-=dt;C.peck+=dt;C.hd.position.y=.36-Math.max(0,Math.sin(C.peck*9))*.12;if(C.wait<=0){C.tgt=[C.home[0]+(Math.random()-.5)*5,C.home[1]+(Math.random()-.5)*4];}return;}
    const dx=C.tgt[0]-c.position.x,dz=C.tgt[1]-c.position.z,d=Math.hypot(dx,dz);if(d<.1||vBlocked(c.position.x+dx/d*.2,c.position.z+dz/d*.2)){C.wait=1+Math.random()*4;return;}c.rotation.y=Math.atan2(dx,dz);c.position.x+=dx/d*dt*.9;c.position.z+=dz/d*dt*.9;c.position.y=groundH(c.position.x,c.position.z)+Math.abs(Math.sin(t*14))*.03;C.hd.position.y=.36;});}

function kloster(){
  const rs=DW.rooms(),R={};rs.forEach(r=>R[r.id]=r);
  W.huts={};W.roomSpot={};const dusty=DW.dustyDoor();W.M.dust=new TH.MeshStandardMaterial({color:'#8f877c',roughness:1});
  ['zelle','kueche','bibliothek','bad'].forEach(id=>hut(id,R[id].open,R[id].n,dusty===id));
  W.roomSpot.garten=[RPOS.garten.c[0]+1.4,RPOS.garten.c[1]+.6];W.roomSpot.hof=[RPOS.hof.c[0]-1.4,RPOS.hof.c[1]];
  gardenArea(R.garten.open);hofArea(R.hof.open);gate(R.tor.open);village();
  // Hof-Pflaster
  const pv=new TH.Mesh(new TH.PlaneGeometry(30,26),new TH.MeshStandardMaterial({map:W.tex.stoneD,normalMap:W.tex.stoneN,color:'#a49c90',roughness:.95}));pv.rotation.x=-Math.PI/2;pv.position.set(0,.02,1);pv.receiveShadow=true;W.root.add(pv);
  noGo(0,1,15);
  Object.keys(RPOS).forEach(id=>{const r=R[id];if(id==='halle')return;const ins=r.open&&W.roomSpot[id];const sp=ins?[W.roomSpot[id][0],0,W.roomSpot[id][1]]:spotOf(id);
    const what={zelle:'Bett',kueche:'Herd',bibliothek:'Lesepult',bad:'Zuber',garten:'Gartenbank',hof:'Hantelbank',tor:'Klostertor'}[id];
    W.inter.push({x:sp[0],z:sp[2],r:ins?1.3:1.8,label:r.open?what+' · '+r.n:id==='tor'?'Klostertor · Blick ins Tal':r.n+' · verschlossen',btn:r.open?'Benutzen':id==='tor'?'Dorf':'Ansehen',act:()=>roomDialog(id)});});
}
function roomDialog(id){
  const r=DW.rooms().find(x=>x.id===id);$('#wDlgK').textContent=r.n;
  if(!r.open&&id!=='tor'&&id!=='halle'){dlgK(r.n,`Diese Tür ist verschlossen. Hier lernst du: ${r.d}. Mit jedem neuen Rang darfst du eine Tür öffnen. Sprich mit Meister Shen, wenn du bereit bist.`,[['Verstanden',()=>endTalk(),1]]);return;}
  const btns=[];let text=r.d+'.';
  if(!r.open&&id==='halle')text='Die Halle steht allen offen, die still werden wollen. Routinen lernst du hier ab einem höheren Rang, meditieren kannst du schon heute.';
  else if(!r.open)text='Das Tor ins Tal ist noch verschlossen, Schritte-Routinen lernst du ab einem höheren Rang. Doch von hier siehst du das Dorf, und es braucht deine Hilfe.';
  else if(!r.rit.length)text+=' Hier hast du noch keine Routine.';
  r.rit.forEach(x=>{const st=x.done?'✓ erledigt':!x.due?'heute nicht fällig':x.sub;text+=`\n${x.done?'✓':'○'} ${x.name} · ${st}`;
    if(!x.done&&x.due)btns.push([x.label+': '+x.name,()=>{endTalk();DW.doRitual(x.id);setTimeout(refreshRoom,400);},1]);});
  r.rit.forEach(x=>{if(x.editable)btns.push(['Bearbeiten: '+x.name,()=>{endTalk();DW.editRitual(x.id);}]);});
  if(r.open&&DW.slotsFree()>0)btns.push(['Neue Routine hier',()=>{endTalk();DW.newRitual(id);}]);
  r.arch.forEach(x=>{if(r.open&&DW.slotsFree()>0)btns.push(['Zurückholen: '+x.name,()=>{DW.unarchive(x.id);roomDialog(id);}]);});
  if(id==='zelle'&&new Date().getHours()>=18&&!DW.day('_eve'))btns.unshift(['Abendritual',()=>{endTalk();evening();},1]);
  if(id==='zelle')btns.push(['Siegel',()=>{endTalk();sealsUI();}]);
  if(id==='zelle')btns.push(['Tagebuch',()=>{endTalk();journalUI();}]);
  if(id==='halle')btns.unshift(['Meditieren',()=>{endTalk();medChoose();},1]);
  if(id==='halle')btns.push(['Verneigen',()=>{endTalk();playOnce('Bow');DW.bell(1.1);DW.day('_qa',1);DW.day('_qb2',0);msg('Ein Moment der Stille.');}]);
  if(id==='tor'&&W.villageAt&&!W.inVillage){W.camOv={p:new TH.Vector3(2.5,6.5,29),t:new TH.Vector3(W.villageAt[0],W.villageAt[1]-4,W.villageAt[2]-12)};W.fogSave=W.fogSave||W.scene.fog.density;W.scene.fog.density=W.fogSave*.35;}
  if(id==='tor'){const v=DW.village(),cost=Object.entries(v.ev.cost).map(([k,c])=>`${v.paid[k]||0}/${c} ${DW.pts().find(p=>p.k===k).n}`).join(' · ');text+=`\n\nDas Dorf im Tal (${v.stufe}, ${v.done} Hilfen): ${v.ev.n}. ${v.ok?'Diese Woche bereits erledigt.':'Benötigt: '+cost+'.'}`;
    if(!v.ok)btns.push(['Punkte investieren',()=>{const res=DW.invest();endTalk();msg(res.full?'Das Dorf dankt dir! '+v.ev.rw:res.any?'Investiert. Es fehlt noch etwas.':'Dir fehlen die passenden Punkte.');if(res.full){DW.bell(1.4);}}]);}
  if(id==='tor'&&!W.inVillage)btns.unshift(['Ins Dorf hinabsteigen',()=>goVillage(),1]);
  if(id==='tor')btns.unshift(['Zum Markt',()=>{endTalk();market();},1]);
  if(id==='zelle'||(id==='garten'&&r.open))btns.push(['Einrichten',()=>{endTalk();furnishUI(id);}]);
  if(id==='tor'){const st=DW.stepsToday();btns.splice(Math.max(0,btns.length),0,[st?`Schritte heute: ${st} (anpassen)`:'Schritte von heute eintragen',()=>{endTalk();stepsDlg();},!st]);}
  if(id==='tor')DW.pilgrims().forEach(p=>{if(p.open&&r.open)btns.push(['Pilgerreise: '+p.n+(p.visited?' (diese Woche besucht)':''),()=>{endTalk();close();open({pilgrim:p.ch});}]);else text+=`\n· ${p.n}: ab Rang ${p.rankName}`;});
  btns.push(['Gehen',()=>endTalk()]);
  dlgK(r.n,text,btns);
}
function dlgK(k,text,btns){dlg(text,btns);$('#wDlgK').textContent=k;}
function refreshRoom(){if(W){ptsHud();dayGlow(false);beacon();sealCheck();}}
/* ---------- Tagesbeginn: interaktiv ---------- */
const SPRUCH=['Wer jeden Tag einen Schritt geht, kommt weiter als der, der einmal rennt.','Die Disziplin ist eine Brücke zwischen Zielen und Erfolg. Geh hinüber.','Der Bambus beugt sich im Sturm und bricht nicht.','Ein Krug füllt sich Tropfen für Tropfen.','Fege den Hof, auch wenn morgen wieder Blätter fallen.','Wer sich selbst besiegt, ist stärker als der, der tausend besiegt.','Der Weg ist das Ziel. Aber du musst ihn gehen.','Stille ist kein leerer Raum. Sie ist voller Antworten.','Am Morgen entscheidet sich der Tag.','Das Wasser ist weich und höhlt doch den Stein.','Wenn du isst, iss. Wenn du gehst, geh.','Kleine Taten, oft getan, verändern alles.','Der Berg wird nicht kleiner. Du wirst stärker.','Heute ist ein guter Tag, um anzufangen. Wie gestern und morgen auch.','Ein ordentlicher Raum ist ein ruhiger Geist.','Wer nicht übt, vergisst. Wer übt, wird.','Atme. Dann geh weiter.','Auch der Meister war einmal Novize.','Der Fluss kommt ans Meer, weil er nicht aufhört zu fliessen.','Ehrlichkeit mit dir selbst ist der erste Schritt.','Die Kirschblüte blüht nicht schneller, wenn man an ihr zieht.','Ein voller Becher kann nichts aufnehmen. Leere ihn.','Was du heute tust, wird morgen leicht.','Langsam ist gut. Stehen bleiben ist schade.','Der Weg von tausend Meilen beginnt unter deinen Füssen.','Beständigkeit schlägt Begeisterung.','Ein Tag ohne Übung ist ein Tag, den du nachholen musst.','Lerne vom Koi: Er schwimmt gegen den Strom.','Wer früh aufsteht, hat den Hof für sich.','Die Glocke klingt, weil sie hohl ist.'];
function spruch(){const d=new Date(),i=(d.getFullYear()*366+d.getMonth()*31+d.getDate())%SPRUCH.length;return SPRUCH[i];}
function briefing(first){if(!W||W.ch)return;DW.day('_brief',1);const n=DW.name(),h=new Date().getHours(),L=DW.todayList(),open_=L.filter(r=>!r.done),dn=L.length-open_.length;
  const hi=h<5?`Noch wach, ${n}?`:h<11?`Guten Morgen, ${n}.`:h<17?`Guten Tag, ${n}.`:h<22?`Guten Abend, ${n}.`:`Spät geworden, ${n}.`;
  let t;if(!L.length)t=`${hi} Heute steht keine feste Routine an. Ein guter Tag, um dem Dorf zu helfen oder bei Meister Shen zu lernen.`;
  else if(!open_.length)t=`${hi} Alles erfüllt für heute. ${L.length} von ${L.length}. Das Kloster leuchtet für dich.`;
  else t=`${hi} ${dn?`${dn} von ${L.length} erledigt. Noch offen:`:`Heute steht an:`}\n`+L.map(r=>(r.done?'✓ ':'○ ')+r.name+' · '+r.roomN).join('\n');
  const v=DW.village(),ri=DW.rankInfo();let extra='';
  if(v.ev&&!v.ok){const need=Object.entries(v.ev.cost).map(([k,c])=>{const left=Math.max(0,c-(v.paid[k]||0));return left?left+' '+((DW.pts().find(p=>p.k===k)||{}).n||k):'';}).filter(Boolean).join(', ');if(need)extra+=`\nDas Dorf: ${v.ev.n}. Es fehlen noch ${need}.`;}
  if(ri.eligible&&!ri.max)extra+='\nMeister Shen erwartet dich zur Rangprüfung.';else if(!ri.max&&ri.next){const dl=Math.max(0,ri.next.days-ri.days);if(dl)extra+=`\nNoch ${dl} Tag${dl>1?'e':''} bis zur nächsten Rangprüfung.`;}
  const btns=[];const nx=open_[0];
  if(nx)btns.push([`Los: ${nx.name}`,()=>{endTalk();goRoom(nx.room);},1]);
  if(open_.length>1)btns.push(['Den Weg zeigen',()=>{endTalk();beacon(true);msg('Folge dem goldenen Licht.');}]);
  if(ri.eligible&&!ri.max)btns.push(['Zu Meister Shen',()=>{endTalk();if(W.npc){const p=W.npc.position;W.av.position.set(p.x+Math.sin(W.npc.rotation.y)*1.4,p.y,p.z+Math.cos(W.npc.rotation.y)*1.4);W.av.rotation.y=W.npc.rotation.y+Math.PI;W.yaw=W.av.rotation.y+Math.PI;}setTimeout(()=>W&&talk(5),400);},!nx]);
  if(v.ev&&!v.ok)btns.push(['Zum Dorf',()=>{endTalk();goRoom('tor');}]);
  if(h>=18&&!DW.day('_eve'))btns.unshift(['Abendritual in der Zelle',()=>{endTalk();goRoom('zelle');setTimeout(()=>{if(W){endTalk();evening();}},700);},!nx]);
  btns.push(['Wochenrückblick',()=>{endTalk();weekReview();}]);
  btns.push(['Übersicht im Menü',()=>{endTalk();DW.openMenu('missions');}]);
  btns.push([first?'Ich schaue mich erst um':'Danke',()=>{endTalk();beacon();}]);
  {const st=DW.day('_nq')||0,{q}=nqToday();if(st===0)extra+=`\n${q.who} scheint etwas auf dem Herzen zu haben.`;else if(st===2)extra+=`\nBring ${q.who} die ${q.item}.`;}
  const wx={regen:'Draussen regnet es. Ein guter Tag für die Halle.',nebel:'Nebel liegt über dem Kloster.',schnee:'Es schneit. Die Welt ist still.'}[W.weather];
  dlgK(first?'Tagesbeginn':'Heute',t+extra+(wx?'\n'+wx:'')+`\n\n«${spruch()}»`,btns);}
/* ---------- Leuchtfeuer zum nächsten Ziel ---------- */
function beacon(force){if(!W||W.ch)return;const L=DW.todayList().filter(r=>!r.done);if(!W.bcn){const g=new TH.Group();const bc=document.createElement('canvas');bc.width=4;bc.height=128;const bx=bc.getContext('2d'),bg=bx.createLinearGradient(0,0,0,128);bg.addColorStop(0,'rgba(255,220,140,0)');bg.addColorStop(.6,'rgba(255,220,140,.35)');bg.addColorStop(1,'rgba(255,220,140,.9)');bx.fillStyle=bg;bx.fillRect(0,0,4,128);
    const m=new TH.MeshBasicMaterial({color:0xffffff,map:new TH.CanvasTexture(bc),transparent:true,opacity:.35,depthWrite:false,side:TH.DoubleSide,fog:false});
    const c=new TH.Mesh(new TH.CylinderGeometry(.22,.4,5,24,1,true),m);c.renderOrder=5;c.position.y=2.5;g.add(c);const ring=new TH.Mesh(new TH.RingGeometry(.55,.75,32),m.clone());ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);W.root.add(g);W.bcn=g;}
  if(!L.length){W.bcn.visible=false;return;}const id=L[0].room,ins=W.roomSpot&&W.roomSpot[id];const sp=ins?[ins[0],.35,ins[1]]:spotOf(id);W.bcn.position.set(sp[0],sp[1],sp[2]);W.bcn.visible=true;W.bcnRoom=id;if(force)W.bcnPulse=3;}
/* ---------- Check-in Feedback ---------- */
function checkin(cat,n){if(!W||!W.av){if(W)setTimeout(()=>checkin(cat,n),600);return;}const c=(DW.pts().find(p=>p.k===cat)||{}).c||'#f2d48a',nm=(DW.pts().find(p=>p.k===cat)||{}).n||'';
  const el=document.createElement('div');el.className='w-float';el.style.color=c;el.textContent='+'+n+' '+nm;$('#world').appendChild(el);W.floats=W.floats||[];W.floats.push({el,t0:W.clock.elapsedTime});
  pose('Stance',true);setTimeout(()=>W&&pose('Stance',false),1400);
  const N=26,g=new TH.BufferGeometry(),pos=new Float32Array(N*3),vel=[];const P=W.av.position;
  for(let i=0;i<N;i++){pos[i*3]=P.x;pos[i*3+1]=P.y+1.2;pos[i*3+2]=P.z;const a=Math.random()*6.28,u=.6+Math.random()*1.4;vel.push([Math.cos(a)*u*.6,1.2+Math.random()*1.6,Math.sin(a)*u*.6]);}
  g.setAttribute('position',new TH.BufferAttribute(pos,3));const m=new TH.PointsMaterial({color:c,size:.09,transparent:true,opacity:1,depthWrite:false,blending:TH.AdditiveBlending});const pts=new TH.Points(g,m);W.scene.add(pts);W.floats.push({pts,vel,t0:W.clock.elapsedTime});}
function floatUpdate(t){if(!W.av)return;if(W.dayL){W.dayL.intensity+=(1.5+Math.sin(t*2.3)*.15-W.dayL.intensity)*.03;W.embers.rotation.y=t*.05;W.embers.position.y=Math.sin(t*.4)*.3;}if(W.steam){W.steam.position.y=1.5+Math.sin(t*1.7)*.05;W.steam.material.opacity=.12+Math.sin(t*2.1)*.06;W.steam.lookAt(W.cam.position);}if(W.donkey)W.donkey.children[5]&&(W.donkey.children[5].rotation.x=-.6+Math.sin(t*.9)*.08);
  if(!W.floats||!W.floats.length)return;const v=new TH.Vector3(),cv=W.R.domElement,dt=.016;
  W.floats=W.floats.filter(f=>{const a=t-f.t0;
    if(f.el){if(a>1.8){f.el.remove();return false;}v.copy(W.av.position);v.y+=(W.inHut?1.55:2.0)+a*.6;v.project(W.cam);f.el.style.transform=`translate(${(v.x*.5+.5)*cv.clientWidth}px,${(-v.y*.5+.5)*cv.clientHeight}px) translate(-50%,-50%) scale(${1+Math.max(0,.25-a)})`;f.el.style.opacity=String(Math.min(1,(1.8-a)*2));return true;}
    if(a>1.4){W.scene.remove(f.pts);f.pts.geometry.dispose();return false;}const p=f.pts.geometry.attributes.position;for(let i=0;i<f.vel.length;i++){f.vel[i][1]-=2.4*dt;p.setXYZ(i,p.getX(i)+f.vel[i][0]*dt,p.getY(i)+f.vel[i][1]*dt,p.getZ(i)+f.vel[i][2]*dt);}p.needsUpdate=true;f.pts.material.opacity=1-a/1.4;return true;});}
/* ---------- Schritte am Tor ---------- */
function stepsDlg(){let o=$('#wSteps');if(!o){o=document.createElement('div');o.id='wSteps';o.className='w-steps';o.innerHTML='<div><h3>Schritte von heute</h3><p>Trag die Zahl aus deiner Uhr oder deinem Handy ein. Du kannst sie im Laufe des Tages erhöhen. Ehrlichkeit zählt.</p><input id="wStepsIn" type="number" inputmode="numeric" min="0" max="40000" placeholder="z.B. 6500"><div class="row"><button class="btn" id="wStepsX">Abbrechen</button><button class="btn primary" id="wStepsOk">Eintragen</button></div></div>';$('#world').appendChild(o);
    $('#wStepsX').onclick=()=>{o.hidden=true;};$('#wStepsOk').onclick=()=>{const v=+$('#wStepsIn').value;o.hidden=true;const add=DW.logSteps(v);msg(add?`+${add} Schritte für das Dorf`:'Keine neuen Schritte.');if(add)DW.bell(1);ptsHud();};
    $('#wStepsIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('#wStepsOk').click();if(e.key==='Escape')o.hidden=true;});}
  o.hidden=false;const inp=$('#wStepsIn');inp.value=DW.stepsToday()||'';setTimeout(()=>inp.focus(),50);}
/* ---------- Vollendeter Tag ---------- */
function dayGlow(init){if(!W||W.pilgrim||W.ch)return;const dt=DW.doneToday(),full=dt.n>0&&dt.done>=dt.n;if(!full||W.dayLit)return;W.dayLit=true;
  const L=new TH.PointLight(0xffc870,0,14,2);L.position.set(0,2.2,1.5);W.root.add(L);W.dayL=L;
  const N=60,g=new TH.BufferGeometry(),pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*9;pos[i*3+1]=.5+Math.random()*4;pos[i*3+2]=-2+Math.random()*8;}g.setAttribute('position',new TH.BufferAttribute(pos,3));
  const em=new TH.Points(g,new TH.PointsMaterial({color:0xffd27a,size:.07,transparent:true,opacity:.85,depthWrite:false,blending:TH.AdditiveBlending}));W.root.add(em);W.embers=em;
  if(!init)setTimeout(()=>{if(W)msg('Alle Routinen erfüllt. Das Kloster leuchtet für dich.');},1600);}
/* ---------- Geschenke des Dorfes ---------- */
function rewards(){const got=DW.village().got||[],M=W.M,y=.35;if(!got.length)return;const has=k=>got.includes(k);
  const clay=new TH.MeshStandardMaterial({color:'#9a5b3a',roughness:.75}),hut=k=>{const P=RPOS[k],ew=P.f[0]?5.2:6.4,ed=P.f[0]?6.4:5.2;return{...P,ew,ed};};
  if(has('brunnen')){const h=hut('zelle'),x=h.c[0]-h.f[0]*(h.ew/2-.45),z=h.c[1]+h.ed/2-.55;cyl(.13,.38,clay,x,y,z,16,.17);cyl(.07,.14,clay,x,y+.38,z,12,.09);}
  if(has('medizin'))W.teaReward=1;
  if(has('schule')){const h=hut('bibliothek'),x=h.c[0]+h.f[0]*.4,z=h.c[1];[-.45,.45].forEach(o=>{const sc=new TH.Mesh(new TH.CylinderGeometry(.045,.045,.42,8),new TH.MeshStandardMaterial({color:'#f2e2b8',emissive:'#ffcf6a',emissiveIntensity:.6}));sc.rotation.x=Math.PI/2;sc.position.set(x,y+.8,z+o);W.root.add(sc);});const L=new TH.PointLight(0xffcf6a,.6,3,2);L.position.set(x,y+1.3,z);W.root.add(L);}
  if(has('bruecke')){const g=new TH.Group(),fur=new TH.MeshStandardMaterial({color:'#7d7468',roughness:1}),dk=new TH.MeshStandardMaterial({color:'#3e3a35',roughness:1});
    const b=new TH.Mesh(new TH.SphereGeometry(.4,16,12),fur);b.scale.set(.85,.85,1.55);b.position.y=.95;g.add(b);
    [[-.18,.38],[.18,.38],[-.18,-.38],[.18,-.38]].forEach(([lx,lz])=>{const l=new TH.Mesh(new TH.CylinderGeometry(.06,.05,.75,8),dk);l.position.set(lx,.38,lz);g.add(l);});
    const n=new TH.Mesh(new TH.CylinderGeometry(.12,.16,.5,10),fur);n.position.set(0,1.3,.55);n.rotation.x=-.6;g.add(n);const hd=new TH.Mesh(new TH.BoxGeometry(.24,.24,.45),fur);hd.position.set(0,1.5,.8);hd.rotation.x=.3;g.add(hd);
    [-.08,.08].forEach(ex=>{const e=new TH.Mesh(new TH.ConeGeometry(.05,.3,6),fur);e.position.set(ex,1.75,.66);g.add(e);});g.position.set(4.6,0,21.6);g.rotation.y=-2.4;g.traverse(o=>{if(o.isMesh)o.castShadow=true;});W.root.add(g);W.solids.push([4.6,21.6,.8]);W.donkey=g;
    W.inter.push({x:4.6,z:21.6,r:1.6,label:'Dein Esel',btn:'Streicheln',act:()=>{msg('Der Esel stupst dich an. Er war ein Geschenk aus dem Dorf.');DW.bell(.9);}});}
  if(has('pfad')){const st=cyl(.04,1.7,M.wood,2.0,0,25.0,8);st.rotation.z=.18;}
  if(has('dach'))flags([-8,3.4,9],[8,3.4,9],24,.7);
  if(has('laternen'))[[-1.7,12],[1.7,12],[-1.7,16],[1.7,16],[-1.7,20],[1.7,20]].forEach(([x,z],i)=>{cyl(.04,1.5,M.wood,x,0,z,6);lantern(x,1.62,z,i%2===0);});
}
function goRoom(id){if(!W||W.pilgrim){close();open({room:id});return;}const ins=W.roomSpot&&W.roomSpot[id],P=RPOS[id];const sp=ins?[ins[0],.35,ins[1]]:spotOf(id);const tx=ins?(id==='zelle'?ins[0]-P.f[0]*1.1:P.c[0]-P.f[0]*2):P.c[0],tz=ins?ins[1]:P.c[1];
  W.av.position.set(sp[0],sp[1],sp[2]);W.av.rotation.y=Math.atan2(tx-sp[0],tz-sp[2]);W.yaw=W.av.rotation.y+Math.PI;W.cam.position.set(sp[0]+Math.sin(W.yaw)*3,sp[1]+3,sp[2]+Math.cos(W.yaw)*3);endTalk();setTimeout(()=>{if(W)roomDialog(id);},350);}
function rankHud(){const ri=DW.rankInfo(),dt=DW.doneToday();$('#wRankN').textContent=ri.name;$('#wRankS').textContent=`Heute ${dt.done}/${dt.n} · Rang ${ri.rank+1}`;const u=DW.portrait(),im=$('#wPor').firstChild;if(u&&(!im||im.getAttribute('src')!==u))$('#wPor').innerHTML=`<img src="${u}" alt="">`;}
function ptsHud(){rankHud();let el=$('#wPts');if(!el){el=document.createElement('div');el.id='wPts';el.className='w-pts';$('#world').appendChild(el);}el.innerHTML=`<span class="cu"><i style="background:#c98a4a;border-radius:50%"></i>Kupfer <b>${DW.coins()}</b></span>`+DW.pts().map(p=>`<span><i style="background:${p.c}"></i>${p.n.slice(0,3)} <b>${p.v}</b></span>`).join('');}

/* ---------- Tageszeit ---------- */
const TOD={
  dawn:{sky:[1.08,.92,1.0],sun:1.7,sunC:'#ffc49a',hemi:.7,fog:'#7b6670',exp:1.0,imp:.92,elev:.22,night:0},
  day:{sky:[1.18,1.16,1.14],sun:2.7,sunC:'#fff0dc',hemi:.95,fog:'#8d8378',exp:1.1,imp:.92,elev:.62,night:0},
  dusk:{sky:[1,1,1],sun:2.3,sunC:'#ffb27a',hemi:.75,fog:'#5e4840',exp:1.05,imp:1,elev:.34,night:0},
  night:{sky:[.1,.13,.26],sun:.35,sunC:'#8fa8ff',hemi:.22,fog:'#0b0f1b',exp:.95,imp:.3,elev:.55,night:1}};
function applyTod(){
  const c=W.tod;W.R.toneMappingExposure=c.exp;W.dir.color.set(c.sunC);W.dir.intensity=c.sun;W.hemi.intensity=c.hemi;W.scene.fog.color.set(c.fog);
  const e=c.elev;W.SUN.set(-.93*Math.cos(Math.asin(e))/.97,e,-.15).normalize();
  if(W.sky&&W.sky.material.color)W.sky.material.color.setRGB(c.sky[0],c.sky[1],c.sky[2]);
  W.M.plaster.emissiveIntensity=c.night?.42:0;W.M.paper.emissiveIntensity=c.night?2.6:1.6;
  if(c.night){
    const n=900,pp=new Float32Array(n*3);for(let i=0;i<n;i++){const a=Math.random()*6.28,el=Math.asin(.08+Math.random()*.92),r=350;pp[i*3]=Math.cos(a)*Math.cos(el)*r;pp[i*3+1]=Math.sin(el)*r;pp[i*3+2]=Math.sin(a)*Math.cos(el)*r;}
    const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(pp,3));W.stars=new TH.Points(g,new TH.PointsMaterial({color:0xdfe6ff,size:1.4,sizeAttenuation:false,fog:false,transparent:true,opacity:.85}));W.scene.add(W.stars);
    const moon=new TH.Mesh(new TH.SphereGeometry(7,24,16),new TH.MeshBasicMaterial({color:0xf2f0e6,fog:false}));moon.position.copy(W.SUN).multiplyScalar(330);W.scene.add(moon);
    if(W.platform)[[-4.2,6.2],[4.2,6.2]].forEach(([x,z])=>{const L=new TH.PointLight(0xffa050,1.5,9,2);L.position.set(x,1.25,z);W.root.add(L);W.flick.push(L);const gl=new TH.Mesh(new TH.BoxGeometry(.32,.32,.32),W.M.glow);gl.position.set(x,1.07,z);W.root.add(gl);});
    const L=new TH.PointLight(0xffb070,1.2,10,2);L.position.set(0,2,1.5);W.root.add(L);
  }
}

/* ---------- Himmel, Licht, Boden ---------- */
function env(se){
  const sc=W.scene;sc.fog=new TH.FogExp2(new TH.Color(se.fog),.014);
  const SUN=new TH.Vector3(-.93,.34,-.15).normalize();W.SUN=SUN;
  const sky=new TH.Mesh(new TH.SphereGeometry(400,32,16),new TH.ShaderMaterial({side:TH.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new TH.Color(se.top)},hor:{value:new TH.Color(se.hor)},bot:{value:new TH.Color(se.bot)},sunCol:{value:new TH.Color(se.sun)},sunDir:{value:SUN}},
    vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:'uniform vec3 top;uniform vec3 hor;uniform vec3 bot;uniform vec3 sunCol;uniform vec3 sunDir;varying vec3 vW;void main(){vec3 d=normalize(vW);float h=d.y;vec3 c=h>0.?mix(hor,top,pow(h,.5)):mix(hor,bot,pow(-h,.35));float s=max(dot(d,sunDir),0.);c+=sunCol*(pow(s,5.)*.5+pow(s,60.)*1.5);gl_FragColor=vec4(c,1.);}'}));
  sc.add(sky);W.sky=sky;
  if(!(W.ch===3&&!W.sky4))new TH.TextureLoader().load('tex/'+(['sky_k1','sky_k3','sky_k3','sky_k4'][W.ch||0])+'.jpg',t=>{if(!W)return;t.encoding=TH.sRGBEncoding;const m=new TH.Mesh(new TH.SphereGeometry(400,64,32),new TH.MeshBasicMaterial({map:t,side:TH.BackSide,depthWrite:false,fog:false,toneMapped:false}));m.scale.x=-1;m.rotation.y=-1.379;m.renderOrder=-1;const k=W.tod.sky;m.material.color.setRGB(k[0],k[1],k[2]);sc.add(m);sc.remove(sky);W.sky=m;W.tex.sky=t;});
  sc.fog.color.set('#5e4840');
  W.hemi=new TH.HemisphereLight(new TH.Color(se.hs),new TH.Color(se.hg),.75);sc.add(W.hemi);
  const d=new TH.DirectionalLight(new TH.Color(se.light),2.4);d.castShadow=true;d.shadow.mapSize.set(2048,2048);const c=d.shadow.camera;c.left=-22;c.right=22;c.top=22;c.bottom=-22;c.near=1;c.far=120;d.shadow.bias=-.0005;d.shadow.normalBias=.03;sc.add(d,d.target);W.dir=d;
  const f=new TH.DirectionalLight(0x8090b0,.35);f.position.set(10,14,30);sc.add(f);
  // Boden
  const g=new TH.PlaneGeometry(240,240,180,180);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv,col=[];const r=rng(2);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=groundH(x,z);p.setY(i,y);uv.setXY(i,x/2.3,z/2.3);const k=Math.hypot(x,z)>40?.55:.85+r()*.2;const m=se.winter?[1.2,1.25,1.3]:[1,1,1];if(!W.ch&&!se.winter&&Math.hypot(x,z)<34){const n=nz(x*1.7+3,z*1.7),mo=Math.min(1,Math.max(0,n+.25))*.9;col.push(k*(1-mo*.45),k*(1+mo*.04),k*(1-mo*.65));}else col.push(k*m[0],k*m[1],k*m[2]);}
  g.setAttribute('color',new TH.Float32BufferAttribute(col,3));g.computeVertexNormals();
  const gm=W.ch===3?new TH.MeshStandardMaterial({color:'#e6ebf2',roughness:.75,normalMap:W.tex.groundN,normalScale:new TH.Vector2(.3,.3),vertexColors:true}):new TH.MeshStandardMaterial({map:W.tex.groundD,normalMap:W.tex.groundN,roughness:.95,vertexColors:true,color:se.winter?'#d8dde3':'#c7b9a3'});
  const ground=new TH.Mesh(g,gm);ground.receiveShadow=true;W.root.add(ground);
  // Partikel
  const n=500,pp=new Float32Array(n*3);for(let i=0;i<n;i++){pp[i*3]=(Math.random()-.5)*60;pp[i*3+1]=Math.random()*14;pp[i*3+2]=(Math.random()-.5)*60;}
  const pg=new TH.BufferGeometry();pg.setAttribute('position',new TH.BufferAttribute(pp,3));
  const cv=document.createElement('canvas');cv.width=cv.height=32;const x=cv.getContext('2d');const gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,32,32);
  const pc=new TH.Color(se.pc);W.pts=new TH.Points(pg,new TH.PointsMaterial({size:se.ps*.8,map:new TH.CanvasTexture(cv),color:pc,transparent:true,depthWrite:false,blending:se.add?TH.AdditiveBlending:TH.NormalBlending}));sc.add(W.pts);
}

/* ---------- Avatar ---------- */
function avatar(){
  const g=new TH.Group();W.scene.add(g);W.av=g;{const sp=W.spawnAt;if(sp){g.position.set(sp[0],sp[1],sp[2]);g.rotation.y=Math.atan2(sp[3],sp[4]);W.yaw=g.rotation.y+Math.PI;}else{g.position.set(0,0,12);g.rotation.y=Math.PI;}}
  const fb=DW.avatarGroup();fb.traverse(o=>{if(o.isMesh)o.castShadow=true;});g.add(fb);
  if(!window.MonkKit)return;DW.applyLook();
  MonkKit.load(gl=>{if(!W||W.av!==g)return;g.remove(fb);const m=gl.scene;m.position.set(0,0,0);m.rotation.set(0,0,0);g.add(m);W.model=m;
    const mx=new TH.AnimationMixer(m),A={};gl.animations.forEach(c=>A[c.name]=mx.clipAction(c));
    W.mixer=mx;W.acts=A;['Idle','Walk'].forEach(n=>{if(A[n]){A[n].play();A[n].setEffectiveWeight(n==='Idle'?1:0);}});
    if(A.Stance){A.Stance.setLoop(TH.LoopOnce);A.Stance.clampWhenFinished=true;}});
}
const XCLIP={};function xclip(n,cb){if(XCLIP[n]){cb(XCLIP[n]);return;}const f=n.toLowerCase()+'.glb';(xclip.q=xclip.q||{})[n]=(xclip.q[n]||[]).concat(cb);if(xclip.q[n].length>1)return;new TH.GLTFLoader().load(f,gl=>{const c=gl.animations[0];if(!c)return;c.name=n;XCLIP[n]=c;xclip.q[n].forEach(f=>f(c));xclip.q[n]=[];},undefined,()=>{});}
function playOnce(n,after){if(!W||!W.mixer)return;xclip(n,c=>{if(!W||!W.mixer)return;const a=W.acts[n]||(W.acts[n]=W.mixer.clipAction(c));a.setLoop(TH.LoopOnce);a.clampWhenFinished=false;a.reset();a.setEffectiveWeight(1);a.fadeIn(.25);a.play();W.onceN=n;W.onceT=c.duration;setTimeout(()=>{if(W&&W.acts[n])W.acts[n].fadeOut(.35);W&&(W.onceN=null);after&&after();},c.duration*1000-300);});}
function kneelLoad(){if(W.kneelLoading||!W.mixer)return;W.kneelLoading=1;xclip('Bow',()=>{});[['Kneel','kneel.glb'],['Meditate','meditate.glb']].forEach(([n,f])=>{const go=gl=>{if(!W||!W.mixer)return;const c=gl.animations[0];if(!c)return;c.name=n;const a=W.mixer.clipAction(c);a.play();a.setEffectiveWeight(0);W.acts[n]=a;};
  const key='_gl_'+n;if(window[key])go(window[key]);else new TH.GLTFLoader().load(f,gl=>{window[key]=gl;go(gl);},undefined,()=>{});});}
function kneelW(dt){const tgt=W.kneel>0?1:0;if(W.kneel>0)W.kneel-=dt;W.kk=(W.kk||0)+(tgt-(W.kk||0))*Math.min(1,dt*2.5);return W.kk*W.kk*(3-2*W.kk);}
function pose(name,on){const A=W.acts;if(!A||!A[name])return;const a=A[name];if(on){a.reset();a.setEffectiveWeight(1);a.fadeIn(.25);a.play();}else a.fadeOut(.3);}

/* ---------- Meister Shen ---------- */
const QA=[ // Teil 1: echtes Leben
  {id:'rit',t:'Erledige heute alle fälligen Rituale',ok:()=>{const r=DW.rituals();return r.rest||r.due===0||r.done>=r.due;}},
  {id:'lesson',t:'Mach die Tageslektion im Dojo und beantworte die Frage',ok:()=>DW.lessonDone()},
  {id:'half',t:'Erledige mindestens zwei Drittel deiner Rituale',ok:()=>{const r=DW.rituals();return r.rest||r.due===0||r.done>=Math.ceil(r.due*2/3);}}];
const QB=[ // Teil 2: Welt
  {id:'scroll',t:'Finde die Schriftrolle im Garten und bestehe ihre Prüfung',ok:()=>DW.scrollFound(),avail:()=>DW.scrollAvailable()||DW.scrollFound(),need:0},
  {id:'poles',t:'Bestehe eine Runde auf den Pfählen, ohne zu fallen',ok:()=>!!DW.day('_qpp'),need:0},
  {id:'ritual',t:'Verneige dich vor dem Altar, danach schlage die Glocke dreimal',ok:()=>(DW.day('_qb2')||0)>=3,need:4},
  {id:'level',t:'Erreiche auf den Pfählen eine neue Stufe',ok:()=>!!DW.day('_qlv'),need:0}];
function questToday(st){const d=new Date(),k=d.getDate()*7+d.getMonth()*3;const b=QB.filter(q=>st>=q.need&&(!q.avail||q.avail()));return{a:QA[k%QA.length],b:b[(k>>1)%b.length]};}
function qline(q){return (q.ok()?'✓ ':'○ ')+q.t;}
function meister(st){
  if(!window.MonkKit)return;
  MonkKit.load(()=>{if(!W)return;const o=MonkKit.npc('#3a3633','#d6a37c','#c9c4bb');if(!o)return;
    const inside=st>=3,p=W.meisterPos||(inside?[-1.7,.7,-.9]:[-3.4,0,2.6]);o.position.set(p[0],p[1],p[2]);o.rotation.y=inside?.35:.6;W.root.add(o);W.npc=o;
    const mx=new TH.AnimationMixer(o),A={};MonkKit.gltf.animations.forEach(c=>A[c.name]=mx.clipAction(c));if(A.Idle){A.Idle.play();A.Idle.time=1.3;}W.npcMix=mx;W.npcA=A;
    W.solids.push([p[0],p[2],.45]);
    W.inter.push({x:p[0],z:p[2],r:2.3,label:'Meister Shen',btn:'Sprechen',act:()=>talk(st)});
    const L=new TH.PointLight(0xffc890,.6,4,2);L.position.set(p[0],p[1]+2.2,p[2]+.8);W.root.add(L);});
}
function greet(st){
  const n=DW.name(),t=DW.tod();
  const a={dawn:`Du bist früh wach, ${n}. Gut so. Der Morgen gehört denen, die ihn sich holen.`,day:`Willkommen, ${n}. Der Tag ist lang, aber nicht endlos. Was hast du heute schon getan?`,dusk:`Die Sonne geht, ${n}. Schau zurück auf den Tag, aber ohne zu richten.`,night:`So spät noch hier, ${n}? Ruhe ist auch Training. Vergiss das nicht.`}[t];
  const dt=DW.doneToday(),b=!dt.n?'':dt.done>=dt.n?' Heute hast du alles getan, was du dir vorgenommen hast.':dt.done?` ${dt.done} von ${dt.n} Routinen sind erfüllt. Der Rest wartet.`:' Deine Routinen warten an ihren Orten.';
  return a+b;
}
function dlg(text,btns){const d=$('#wDlg');$('#wDlgK').textContent='Meister Shen';$('#wDlgT').textContent=text;const B=$('#wDlgB');B.innerHTML='';btns.forEach(([l,f,pri],i)=>{const b=document.createElement('button');b.textContent=(FINE&&i<9?(i+1)+'  ':'')+l;if(pri)b.className='pri';b.onclick=()=>{DW.tick();f();};B.appendChild(b);});d.hidden=false;$('#wPrompt').hidden=true;if(!W.talking)W.talkPos=W.av.position.clone();W.talking=true;}
function endTalk(){$('#wDlg').hidden=true;if(W){W.talking=false;W.near=null;if(W.camOv){W.camOv=null;if(W.fogSave)W.scene.fog.density=W.fogSave;}}}
function talk(st){
  const q=questToday(st),qs=DW.day('_qs')||0;// 0 offen, 1 angenommen, 2 erledigt
  const L=DW.lesson(),both=()=>q.a.ok()&&q.b.ok();
  const menu=(text)=>{const btns=[];
    if(qs===0)btns.push(['Gib mir einen Auftrag',()=>{DW.day('_qs',1);dlg('Zwei Dinge für heute. Erst im Leben, dann hier im Tempel.\n'+qline(q.a)+'\n'+qline(q.b),[['Ich mache es',()=>{endTalk();msg('Auftrag angenommen');}],['Zurück',()=>menu(greet(st))]]);},1]);
    else if(qs===1){const ok=both();btns.push([ok?'Auftrag erfüllt':'Mein Auftrag',()=>{if(ok){DW.day('_qs',2);endTalk();DW.questReward(12,'Auftrag erfüllt');pose('Stance',true);setTimeout(()=>W&&pose('Stance',false),1500);}else dlg('Noch nicht vollständig.\n'+qline(q.a)+'\n'+qline(q.b),[['Verstanden',()=>endTalk()]]);},ok]);}
    if(!W.scrollEarned&&!DW.scrollTried()&&DW.scrollAvailable())btns.push(['Die Schriftrolle?',()=>dlg('Die Rolle zeigt sich nur denen, die heute schon etwas getan haben. Erledige die Hälfte deiner Rituale, dann such im Garten. Sie leuchtet nicht. Schau genau.',[['Verstanden',()=>endTalk()]])]);
    btns.push([L.done?'Merksatz des Tages':'Lektion des Tages',()=>{if(L.done)dlg(`«${L.m}»`,[['Danke, Meister',()=>endTalk()]]);else{endTalk();DW.openLesson();}}]);
    {const ri=DW.rankInfo();btns.unshift([ri.max?'Mein Rang':ri.eligible?'Rangprüfung ablegen':'Mein Rang',()=>{
      if(ri.max){dlg(`Du bist ${ri.name}. Höher geht es nicht. Jetzt gibst du weiter, was du gelernt hast.`,[['Danke',()=>endTalk()]]);return;}
      if(!ri.eligible){dlg(`Du bist ${ri.name}. Für ${ri.nextName} brauchst du ${ri.next.days} Tage im Rang (jetzt ${ri.days}) und ${Math.round(ri.next.pct*100)} % erfüllte Tage in den letzten ${ri.next.win} Tagen (jetzt ${Math.round(ri.pct*100)} %). Geduld. Eine Gewohnheit braucht Zeit.`,[['Verstanden',()=>endTalk()]]);return;}
      const q=DW.examQ();dlg('Bevor ich dir den Schlüssel gebe, eine Frage:\n'+q.q,q.o.map((o,i)=>[o,()=>{if(i===q.a){DW.rankUp();const L=DW.lockedRooms();const ri2=DW.rankInfo();
        if(!L.length){dlg(`Du bist jetzt ${ri2.name}. Alle Türen stehen dir offen.`,[['Danke, Meister',()=>endTalk(),1]]);return;}
        dlg(`Richtig. Du bist jetzt ${ri2.name}. Welche Tür willst du öffnen? Dahinter wartet eine neue Routine.`,L.map(r=>[r.n,()=>{DW.openDoor(r.id);endTalk();msg(r.n+' ist offen. Geh hin und lege deine neue Routine an.');setTimeout(()=>{if(W){const keep={room:r.id};close();open(keep);}},1600);}]));}
        else dlg('Nicht ganz. Lies die Lektionen im Dojo noch einmal und komm morgen wieder.',[['Verstanden',()=>endTalk()]]);}]));},ri.eligible]);}
    const sto=DW.story();if(sto.length)btns.push(['Eure Geschichte, Meister',()=>{let i=sto.length-1;const show=()=>dlg(sto[i].t,[...(i>0?[['Früher',()=>{i--;show();}]]:[]),['Danke, Meister',()=>endTalk()]]);show();}]);
    btns.push(['Weisheit',()=>dlg(DW.wisdom(),[['Danke',()=>endTalk()],['Zurück',()=>menu(greet(st))]])]);
    dlg(text,btns);};
  if(qs===2)menu('Dein Auftrag für heute ist erfüllt. '+greet(st));else menu(greet(st));
}

/* ---------- Der Schatten ---------- */
const TAUNT=['Morgen ist auch noch ein Tag. Oder übermorgen.','Du hast es dir verdient, heute auszuruhen. Nicht wahr?','Niemand sieht es, wenn du heute auslässt.','Du bist zu müde. Zu beschäftigt. Zu spät dran.','Fang am Montag an. Montag ist ein guter Tag.'];
function shadowFoe(){
  const sh=DW.shadow();if(!(sh.dmg>0||sh.duel!=null||sh.miss>=2)||!window.MonkKit)return;
  W.tod.fogBoost=sh.dmg>0||sh.duel!=null;
  if(W.tod.fogBoost){W.scene.fog.density*=1.7;if(W.sky&&W.sky.material.color)W.sky.material.color.multiplyScalar(.7);W.hemi.intensity*=.75;}
  MonkKit.load(()=>{if(!W)return;const o=MonkKit.npc('#050506','#3a3036','#050506');if(!o)return;const p=sh.duel!=null?[0,groundH(0,7.2),7.2]:[3.2,groundH(3.2,9),9];
    o.position.set(p[0],p[1],p[2]);o.rotation.y=Math.PI;o.scale.multiplyScalar(1.22);W.root.add(o);W.foe=o;
    o.traverse(m=>{if(m.material){m.material.roughness=1;m.material.metalness=0;m.material.coloro.traverse(m=>{if(m.material){m.material.transparent=true;m.material.opacity=.88;m.material.roughness=1;}});o.traverse(m=>{if(m.material){m.material.transparent=true;m.material.opacity=.88;m.material.roughness=1;}});m.material.color.multiplyScalar(.35);}});
    const eyeM=new TH.MeshBasicMaterial({color:new TH.Color(3,.25,.1)});[-.045,.045].forEach(dx=>{const e=new TH.Mesh(new TH.SphereGeometry(.018,8,6),eyeM);e.position.set(dx,1.72,.12);o.add(e);});
    const L=new TH.PointLight(0xff3010,.9,4,2);L.position.set(0,1.6,.4);o.add(L);W.flick.push(L);
    const mx=new TH.AnimationMixer(o),A={};MonkKit.gltf.animations.forEach(c=>A[c.name]=mx.clipAction(c));if(A.Stance){A.Stance.play();A.Stance.setLoop(TH.LoopOnce);A.Stance.clampWhenFinished=true;}W.foeMix=mx;
    // Rauch
    const n=60,pp=new Float32Array(n*3);for(let i=0;i<n;i++){pp[i*3]=(Math.random()-.5)*1.2;pp[i*3+1]=Math.random()*2.2;pp[i*3+2]=(Math.random()-.5)*1.2;}
    const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(pp,3));W.smoke=new TH.Points(g,new TH.PointsMaterial({color:0x08060a,size:.55,transparent:true,opacity:.7,depthWrite:false}));W.smoke.position.copy(o.position);W.root.add(W.smoke);
    if(sh.duel!=null)W.solids.push([p[0],p[2],.6]);
    W.inter.push({x:p[0],z:p[2],r:2.4,label:'Der Schatten',btn:'Ansehen',act:()=>{
      const t=TAUNT[Math.floor(Math.random()*TAUNT.length)];
      const why=sh.duel!=null?`Hier endet dein Kapitel. Sieben perfekte Tage in Folge, dann lasse ich dich vorbei. Du stehst bei ${sh.duel} von 7.`:sh.dmg>0?`Ich habe mir genommen, was du liegen liessest. Jeder perfekte Tag nimmt mir wieder etwas weg.`:`Gestern warst du nicht da. Noch ein Tag, und ich nehme mir deinen Tempel.`;
      dlg('«'+t+'»\n\n'+why,[['Wer bist du?',()=>dlg('Ich bin jede Ausrede, die du dir je erzählt hast. Ich werde nie ganz verschwinden. Aber ich weiche denen, die jeden Tag zurückkommen.',[['Ich komme wieder',()=>endTalk()]])],['Ich komme wieder',()=>endTalk(),1]]);$('#wDlgK').textContent='Der Schatten';}});});
}

/* ---------- Interaktion ---------- */
function interactables(st){
  if(!W.pilgrim)W.inter=(W.inter||[]).concat([{x:9,z:7,r:3.2,label:'Pfähle · Stufe '+DW.level('poles'),btn:'Spielen · 1 Energie',act:()=>startPoles()}]);
  if(st>=4&&!W.pilgrim)W.inter.push({x:0,z:5.6,r:1.8,label:'Tempelglocke',btn:'Schlagen',act:()=>{DW.bell(1.4);W.shake=.6;DW.day('_qb',(DW.day('_qb')||0)+1);if(DW.day('_qa'))DW.day('_qb2',(DW.day('_qb2')||0)+1);pose('Stance',true);setTimeout(()=>W&&pose('Stance',false),1600);if(W.bell)W.bellSwing=1;}});
  // Schriftrolle des Tages: nur nach der Hälfte der Rituale, gut versteckt, ohne Leuchten
  const rp=DW.rituals();W.scrollEarned=rp.rest||rp.due===0||rp.done>=Math.ceil(rp.due/2);
  if(!DW.scrollTried()&&DW.scrollAvailable()&&W.scrollEarned){const d=new Date();const r=rng(d.getFullYear()*400+d.getMonth()*31+d.getDate());
    const spots=[[0,-6.2],[-6.4,-4.6],[6.6,-3.8],[-27,-9],[24,-16],[-21,19],[29,9],[-33,-2],[11,-28],[-14,-27],[18,26],[-9,31],[5.6,-10],[-30,14]];
    let si=Math.floor(r()*spots.length),s=spots[si];for(let k=0;k<spots.length&&(W.noGo.some(n=>Math.hypot(s[0]-n[0],s[1]-n[1])<n[2]+.5)||W.solids.some(q=>Math.hypot(s[0]-q[0],s[1]-q[1])<q[2]+.4)||(s[1]>23)||(W.ch===2&&Math.abs(s[0])<1.6&&s[1]>-6));k++){si=(si+1)%spots.length;s=spots[si];}
    const g=new TH.Group();g.position.set(s[0],groundH(s[0],s[1])+.07,s[1]);g.rotation.y=r()*6;W.root.add(g);
    const sc=new TH.Mesh(new TH.CylinderGeometry(.05,.05,.36,10),new TH.MeshStandardMaterial({color:'#d9caa8',roughness:.9}));sc.rotation.z=Math.PI/2;sc.castShadow=true;g.add(sc);
    [-.19,.19].forEach(dx=>{const e=new TH.Mesh(new TH.CylinderGeometry(.065,.065,.04,10),W.M.red);e.rotation.z=Math.PI/2;e.position.x=dx;g.add(e);});
    const gl=new TH.Mesh(new TH.SphereGeometry(.04,8,6),new TH.MeshBasicMaterial({color:0xfff0b0,transparent:true,opacity:0,fog:false}));gl.position.y=.12;g.add(gl);W.glint=gl;W.scroll=g;W.scrollSpot=s;
    W.inter.push({x:s[0],z:s[1],r:1.1,auto:true,act:()=>{W.root.remove(g);W.scroll=null;W.glint=null;W.keys={};W.mv.x=W.mv.z=0;DW.claimScroll();}});}
}
function msg(t){const m=$('#wMsg');m.textContent=t;m.classList.add('show');clearTimeout(W.mt);W.mt=setTimeout(()=>m.classList.remove('show'),2600);}

/* ---------- Bewegung & Kollision ---------- */
function blocked(x,z,px,pz){
  if(!W.pilgrim&&z>34){for(const s of W.solids){if(Math.hypot(x-s[0],z-s[1])<s[2])return true;}return vBlocked(x,z);}
  if(Math.hypot(x,z)>40)return true;if(!W.pilgrim&&z>25)return true;
  for(const s of W.solids){if(Math.hypot(x-s[0],z-s[1])<s[2])return true;}
  if(W.edgeZ&&z>W.edgeZ)return true;if(W.ch===2&&Math.hypot(x,z+12)<6.9)return true;if(W.ch===2&&Math.abs(x)<1.1&&z>-5&&z<14&&!(W.bridge&&z>W.bridge.z0&&z<W.bridge.z1))return true;
  if(W.ch===0&&W.platform){const inP=Math.abs(x)<5.5&&Math.abs(z)<4,wasP=Math.abs(px)<5.5&&Math.abs(pz)<4,steps=Math.abs(x)<2.1&&z>=3.6&&z<5.6;if(inP&&!wasP&&!(Math.abs(px)<2.1&&pz>=3.6))return true;if(!inP&&wasP&&!steps)return true;}
  if(W.ch===0&&W.walls){if(Math.abs(x)<4.3&&z<-2.4&&z>-2.85)return true;if(Math.abs(Math.abs(x)-4.1)<.2&&z>-2.6&&z<2.6)return true;}
  return false;
}
function heightAt(x,z){if(!W.pilgrim&&z>34){if(W.vBridge&&Math.abs(x)<1.2&&z>61.8&&z<66.2)return W.vBr0+.5*Math.sin((z-61.8)/4.4*Math.PI)+.05;return groundH(x,z);}if(W.ch===0&&W.rects.length){for(const q of W.rects){if(x>q.x0&&x<q.x1&&z>q.z0&&z<q.z1)return q.h;}}if(W.ch>0){let h=null;for(const q of W.rects){if(x>q.x0&&x<q.x1&&z>q.z0&&z<q.z1)h=Math.max(h||0,q.h);}if(W.bridge&&x>W.bridge.x0&&x<W.bridge.x1&&z>W.bridge.z0&&z<W.bridge.z1)return .15+.9*Math.sin((x-W.bridge.x0)/(W.bridge.x1-W.bridge.x0)*Math.PI)+.1;return h!=null?h:groundH(x,z);}if(Math.abs(x)<1.15&&z>5.8&&z<26)return groundH(x,z)+.1;if(W.platform){if(Math.abs(x)<5.5&&Math.abs(z)<4)return .7;if(Math.abs(x)<2.1&&z>=4&&z<5.6)return .7*(1-(z-4)/1.5);}return groundH(x,z);}

/* ---------- Steuerung ---------- */
function controls(){
  const joy=$('#wJoy'),knob=joy.querySelector('.w-knob');W.mv={x:0,z:0};W.keys={};
  let jid=null,jx=0,jy=0,lid=null,lx=0,ly=0;
  const cv=$('#world');
  cv.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const left=e.pointerType!=='mouse'&&e.clientX<window.innerWidth*.45;if(e.pointerType==='mouse'&&cv.setPointerCapture)cv.setPointerCapture(e.pointerId);
    if(left&&jid===null){jid=e.pointerId;jx=e.clientX;jy=e.clientY;joy.style.left=(jx-60)+'px';joy.style.top=(jy-60)+'px';joy.classList.add('on');}
    else if(lid===null){lid=e.pointerId;lx=e.clientX;ly=e.clientY;}
    $('#wHint').classList.add('gone');});
  cv.addEventListener('pointermove',e=>{
    if(e.pointerId===jid){let dx=e.clientX-jx,dy=e.clientY-jy;const l=Math.hypot(dx,dy),m=50;if(l>m){dx=dx/l*m;dy=dy/l*m;}knob.style.transform=`translate(${dx}px,${dy}px)`;W.mv.x=dx/m;W.mv.z=dy/m;}
    if(e.pointerId===lid){W.yawTo=null;W.yaw-=(e.clientX-lx)*.006;W.pitch=Math.max(.05,Math.min(.9,W.pitch+(e.clientY-ly)*.004));lx=e.clientX;ly=e.clientY;}});
  const up=e=>{if(e.pointerId===jid){jid=null;W.mv.x=W.mv.z=0;knob.style.transform='';joy.classList.remove('on');}if(e.pointerId===lid)lid=null;};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  W.kd=e=>{const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;if(!$('#game').hidden)return;
    if(document.body.classList.contains('menuOver')){if(e.key==='Escape')DW.closeMenu();return;}
    if(document.querySelector('.ov:not([hidden]):not(#world),#dialog:not([hidden])'))return;
    const k=e.key.toLowerCase();if(['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))e.preventDefault();
    W.keys[k]=true;$('#wHint').classList.add('gone');
    if(!$('#wDlg').hidden){if(k==='escape'){endTalk();return;}const n=parseInt(e.key,10);if(n>=1&&n<=9){const b=[...document.querySelectorAll('#wDlgB button')].at(n-1);if(b)b.click();}return;}
    if((k==='e'||k==='enter'||k===' ')&&W.near&&!e.repeat)W.near.act();
    if(k==='escape'){if(document.body.classList.contains('menuOver'))DW.closeMenu();else DW.openMenu();}};
  W.ku=e=>{W.keys[e.key.toLowerCase()]=false;};
  W.wheel=e=>{if(!$('#wDlg').hidden)return;W.zoom=Math.max(3.5,Math.min(12,(W.zoom||6.5)+e.deltaY*.01));e.preventDefault();};cv.addEventListener('wheel',W.wheel,{passive:false});
  W.blur=()=>{W.keys={};};window.addEventListener('blur',W.blur);
  window.addEventListener('keydown',W.kd);window.addEventListener('keyup',W.ku);
  $('#wPromptB').onclick=()=>{if(W.near)W.near.act();};
  $('#wExit').onclick=()=>{DW.tick();DW.openMenu();};$('#wRank').onclick=()=>{DW.tick();if(W&&!W.ch)briefing(false);else DW.openMenu('missions');};
}

/* ---------- Loop ---------- */
function loop(){
  if(!W)return;W.raf=requestAnimationFrame(loop);if(document.body.classList.contains('menuOver')||document.hidden){W.clock.getDelta();return;}
  if(!$('#game').hidden)return;
  const dt=Math.min(.05,W.clock.getDelta()),t=W.clock.elapsedTime;
  let mx=W.mv.x,mz=W.mv.z;const K=W.keys;if(K.w||K.arrowup)mz=-1;if(K.s||K.arrowdown)mz=1;if(K.a||K.arrowleft)mx=-1;if(K.d||K.arrowright)mx=1;
  const ml=(W.med||W.tc||W.training)?0:Math.min(1,Math.hypot(mx,mz)),av=W.av;
  W.moving=ml>.08;W.run=!!K.shift;if(W.moving)W.kneel=0;
  if(ml>.08){const sy=Math.sin(W.yaw),cy=Math.cos(W.yaw);const dx=(mx*cy+mz*sy),dz=(-mx*sy+mz*cy);const sp=4.6*ml*dt*((K.shift)?1.8:1)*(W.inHut?.6:1);const nx=av.position.x+dx/ml*sp*ml,nz2=av.position.z+dz/ml*sp*ml;
    if(!blocked(nx,nz2,av.position.x,av.position.z)){av.position.x=nx;av.position.z=nz2;}else if(!blocked(nx,av.position.z,av.position.x,av.position.z))av.position.x=nx;else if(!blocked(av.position.x,nz2,av.position.x,av.position.z))av.position.z=nz2;
    const target=Math.atan2(dx,dz);let d=target-av.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;av.rotation.y+=d*Math.min(1,dt*10);W.walk+=dt*ml*9;}
  else W.walk*=.9;
  const gy=heightAt(av.position.x,av.position.z);av.position.y+=(gy+Math.abs(Math.sin(W.walk))*.06*ml-av.position.y)*Math.min(1,dt*14);
  if(W.mixer){kneelLoad();const A=W.acts,wk=Math.min(1,ml*1.2),kw=A.Kneel?kneelW(dt):0;W.mw=(W.mw||0)+((W.med&&A.Meditate?1:0)-(W.mw||0))*Math.min(1,dt*1.5);W.tw=(W.tw||0)+((W.tc&&A.TaiChi?1:0)-(W.tw||0))*Math.min(1,dt*2);if(A.TaiChi)A.TaiChi.setEffectiveWeight(W.tw);const mw=Math.max(W.mw*W.mw*(3-2*W.mw),W.tw),ow=W.onceN&&A[W.onceN]?A[W.onceN].getEffectiveWeight():0,rest=(1-kw)*(1-mw)*(1-ow);if(A.Walk){A.Walk.setEffectiveWeight(wk*rest);A.Walk.timeScale=.6+ml*.9;}if(A.Idle)A.Idle.setEffectiveWeight((1-wk)*rest);if(A.Kneel)A.Kneel.setEffectiveWeight(kw*(1-mw));if(A.Meditate)A.Meditate.setEffectiveWeight(mw);W.mixer.update(dt);}
  if(av.userData.torso){const b=1+Math.sin(t*1.3)*.012;av.userData.torso.scale.set(b,1,b);av.rotation.z=Math.sin(W.walk)*.04*ml;}
  // Kamera
  const inHut=W.huts&&Object.values(W.huts).find(h=>av.position.x>h.x0-.2&&av.position.x<h.x1+.2&&av.position.z>h.z0-.2&&av.position.z<h.z1+.2);if(inHut!==W.inHut){if(W.inHut&&!inHut&&W.av){W.yawTo=W.av.rotation.y+Math.PI;}W.M.hid=W.M.hid||new TH.MeshBasicMaterial({colorWrite:false,depthWrite:false});if(W.inHut)W.inHut.roof.forEach(m=>{if(m.userData.mat)m.material=m.userData.mat;});if(inHut)inHut.roof.forEach(m=>{if(!m.userData.mat)m.userData.mat=m.material;m.material=W.M.hid;});W.inHut=inHut;}
  if(W.yawTo!=null&&!inHut){const dy=((W.yawTo-W.yaw+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;W.yaw+=dy*Math.min(1,dt*5);if(Math.abs(dy)<.02)W.yawTo=null;}
  let dist=inHut?3.4:(W.zoom||6.5);if(!inHut&&W.huts){const sx=Math.sin(W.yaw),sz=Math.cos(W.yaw);let f=1;for(let k=1;k<=24;k++){const q=k/24,px=av.position.x+sx*dist*q,pz=av.position.z+sz*dist*q;if(Object.values(W.huts).some(h=>px>h.x0-.35&&px<h.x1+.35&&pz>h.z0-.35&&pz<h.z1+.35)){f=Math.max(.25,(k-1)/24);break;}}dist*=f;}
  const cx=av.position.x+Math.sin(W.yaw)*dist*Math.cos(W.pitch),cz=av.position.z+Math.cos(W.yaw)*dist*Math.cos(W.pitch),cyy=av.position.y+1.4+Math.sin(W.pitch)*dist;
  const sh=W.shake>0?(Math.random()-.5)*W.shake*.15:0;W.shake=Math.max(0,(W.shake||0)-dt);
  if(W.camOv){W.cam.position.lerp(W.camOv.p,Math.min(1,dt*4));W.cam.lookAt(W.camOv.t);}
  else if(inHut){const d=2.6,sy=Math.sin(W.yaw),cy=Math.cos(W.yaw),so=.55,tx=Math.max(inHut.x0+.3,Math.min(inHut.x1-.3,av.position.x+sy*d+cy*so)),tz=Math.max(inHut.z0+.3,Math.min(inHut.z1-.3,av.position.z+cy*d-sy*so));W.cam.position.lerp(new TH.Vector3(tx,av.position.y+2.75,tz),Math.min(1,dt*8));W.cam.lookAt(av.position.x-sy*1.3,av.position.y+.75,av.position.z-cy*1.3);}
  else W.cam.position.lerp(new TH.Vector3(cx+sh,Math.max(cyy,groundH(cx,cz)+.6),cz),Math.min(1,dt*6));if(!W.camOv&&!inHut)W.cam.lookAt(av.position.x,av.position.y+1.5,av.position.z);
  W.dir.position.set(av.position.x+W.SUN.x*60,W.SUN.y*60,av.position.z+W.SUN.z*60);W.dir.target.position.set(av.position.x,0,av.position.z);
  (W.flames||[]).forEach((f,i)=>{f.scale.y=1.6+Math.sin(t*13+i*2)*.35;});
  W.flick.forEach((L,i)=>{const b=L.userData.b!=null?L.userData.b:(L.userData.b=L.intensity);L.intensity=b*(1+.27*Math.sin(t*9+i)*Math.sin(t*3.3+i));});
  if(W.bell&&W.bellSwing>0){W.bellSwing=Math.max(0,W.bellSwing-dt*.5);W.bell.rotation.x=Math.sin(t*9)*.25*W.bellSwing;}
  if(W.glint){const dd=Math.hypot(av.position.x-W.scrollSpot[0],av.position.z-W.scrollSpot[1]);W.glint.material.opacity=dd<5?Math.max(0,Math.sin(t*3))*.9*(1-dd/5):0;W.glint.scale.setScalar(1+Math.sin(t*6)*.4);}
  if(W.pts&&!RM){const a=W.pts.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]-=dt*.9;a[i]+=Math.sin(t+i)*.01;if(a[i+1]<0){a[i+1]=14;a[i]=av.position.x+(Math.random()-.5)*60;a[i+2]=av.position.z+(Math.random()-.5)*60;}}W.pts.geometry.attributes.position.needsUpdate=true;}
  // Interaktion
  let near=null;for(const it of W.inter){if(!it.hide&&Math.hypot(av.position.x-it.x,av.position.z-it.z)<it.r){if(it.auto){it.act();W.inter=W.inter.filter(x=>x!==it);break;}near=it;}}
  if(W.talking)near=W.near;if(near!==W.near){W.near=near;const p=$('#wPrompt');if(near){$('#wPromptT').textContent=near.label;$('#wPromptB').textContent=near.btn+(FINE?' · E':'');p.hidden=false;}else p.hidden=true;}
  $('#wEn').textContent=DW.energy();
  if(W.npcMix){W.npcMix.update(dt);const o=W.npc,dx=av.position.x-o.position.x,dz=av.position.z-o.position.z;if(Math.hypot(dx,dz)<5){let d=Math.atan2(dx,dz)-o.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;o.rotation.y+=d*Math.min(1,dt*3);}}
  if(W.foeMix){W.foeMix.update(dt);const o=W.foe;o.position.y+=Math.sin(t*1.7)*.0015;const dx=av.position.x-o.position.x,dz=av.position.z-o.position.z;let d=Math.atan2(dx,dz)-o.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;o.rotation.y+=d*Math.min(1,dt*2);}
  if(W.smoke){const a=W.smoke.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]+=dt*.35;a[i]+=Math.sin(t+i)*.004;if(a[i+1]>2.4)a[i+1]=0;}W.smoke.geometry.attributes.position.needsUpdate=true;}
  if(W.talking&&W.talkPos&&Math.hypot(av.position.x-W.talkPos.x,av.position.z-W.talkPos.z)>2.5)endTalk();
  if(W.fallTex)W.fallTex.offset.y+=dt*1.6;
  if(W.flagsArr.length&&!RM)W.flagsArr.forEach((f,i)=>{f.rotation.x=Math.sin(t*3+i*.7)*.25;});
  impUpdate();floatUpdate(W.clock.elapsedTime);lifeUpdate();vUpdate(.016,W.clock.elapsedTime);if(W.tc)tcTick();weatherUpdate(.016);if(W.med)medTick();try{sndUpdate(.016,W.moving);}catch(e){}W.R.render(W.scene,W.cam);
}

/* ---------- Öffnen / Schliessen ---------- */
function open(opts){opts=opts||{};
  if(!TH){DW.toast('3D ist auf diesem Gerät nicht verfügbar');return;}
  $('#world').hidden=false;document.body.classList.add('inworld');clearInterval(window._rkI);window._rkI=setInterval(()=>{if(W)rankHud();},2500);
  const cv=$('#wgl');W={noGo:[],rects:[],flagsArr:[],imps:[],solids:[],flick:[],inter:[],yaw:0,pitch:.32,walk:0,clock:new TH.Clock()};
  const R=new TH.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});R.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));R.setSize(window.innerWidth,window.innerHeight,false);
  R.shadowMap.enabled=true;R.shadowMap.type=TH.PCFSoftShadowMap;R.outputEncoding=TH.sRGBEncoding;R.toneMapping=TH.ACESFilmicToneMapping;R.toneMappingExposure=1.05;W.R=R;
  W.scene=new TH.Scene();W.cam=new TH.PerspectiveCamera(window.innerWidth<window.innerHeight?62:50,window.innerWidth/window.innerHeight,.1,700);W.root=new TH.Group();W.scene.add(W.root);
  W.tod=TOD[DW.tod()]||TOD.dusk;W.M=mats();W.pilgrim=opts.pilgrim||0;W.ch=W.pilgrim;window._worldCh=W.ch;const se=W.ch===3?Object.assign({},DW.season(),DW.seasonData('winter')||{},{winter:true}):DW.season();W.se=se;env(se);
  const st=5,ch=W.pilgrim;W.ch=ch;W.noGo=[];W.rects=[];W.flagsArr=[];
  if(ch>0){BUILD[ch](5);W.meisterPos=W.meisterPos||[-3,0,4];}else{W.ch=0;W.rects=[];temple(5);path();poles();kloster();rewards();dayGlow(true);life();beacon();weather();}
  W.noGo.push([ch===2?3.6:0,12,5],[ch===2?3.6:0,18,4]);
  const ng=(x,z,m)=>W.noGo.some(n=>Math.hypot(x-n[0],z-n[1])<n[2]+(m||0))||(W.edgeZ&&z>W.edgeZ-3);
  const r=rng(21);let c=0,tries=0;while(c<(ch===3?0:ch===1?6:14)&&tries<500){tries++;const a=r()*6.28,d=11+r()*20,x=Math.cos(a)*d,z=Math.sin(a)*d;if(ng(x,z,3))continue;if(Math.abs(x)<3.2&&z>3)continue;if(Math.hypot(x-9,z-7)<8)continue;if(W.solids.some(s=>Math.hypot(x-s[0],z-s[1])<4))continue;maple(x,z,.8+r()*.5,r()*6);c++;}
  c=0;tries=0;while(c<(ch===3?0:30)&&tries<800){tries++;const a=r()*6.28,d=24+r()*24,x=Math.cos(a)*d,z=Math.sin(a)*d;if(ng(x,z,3))continue;if(Math.abs(x)<4&&z>3)continue;if(W.solids.some(s=>Math.hypot(x-s[0],z-s[1])<3.5))continue;pine(x,z,.8+r()*.5,r()*6);c++;}
  if(ch!==3)grassField();
  {let room=opts.room;const h=new Date().getHours();if(!room&&h>=4&&h<12){const z=DW.rooms().find(r=>r.id==='zelle');if(z&&z.rit.some(x=>x.type==='window'&&x.due&&!x.done))room='zelle';}
   if(room){W.autoRoom=room;W.spawnRoom=room;}}
  if(!ch)W.meisterPos=[-4.2,0,8.6];if(W.spawnRoom){const id=W.spawnRoom,ins=W.roomSpot&&W.roomSpot[id],sp=ins?[ins[0],.35,ins[1]]:spotOf(id),P=RPOS[id];const tx=ins?(id==='zelle'?ins[0]-P.f[0]*1.1:P.c[0]-P.f[0]*2):P.c[0],tz=ins?ins[1]:P.c[1];W.spawnAt=[sp[0],sp[1],sp[2],tx-sp[0],tz-sp[2]];if(!ch&&id==='zelle'&&!DW.flag('tut')){const P2=RPOS.zelle;W.meisterPos=[P2.c[0]+P2.f[0]*1.5,.35,P2.c[1]+1.3];W.spawnAt[3]=W.meisterPos[0]-sp[0];W.spawnAt[4]=W.meisterPos[2]-sp[2];W.tutZelle=1;}}applyTod();avatar();interactables(5);meister(5);if(W.tutZelle&&W.npc){W.npc.rotation.y=Math.atan2(W.spawnAt[0]-W.meisterPos[0],W.spawnAt[2]-W.meisterPos[2]);}if(!ch)shadowFoe();controls();ptsHud();
  if(ch){const sp=[W.ch===2?3.6:0,12];W.inter.push({x:sp[0],z:sp[1]+1.5,r:1.4,label:'Heimweg ins Kloster',btn:'Zurück',act:()=>{close();open({room:'tor'});}});if(DW.pilgrimVisit(ch))setTimeout(()=>W&&msg('Pilgerreise: +20 Punkte'),1200);}
  if(!ch&&!DW.flag('tut')){setTimeout(()=>{if(!W)return;const n=DW.name();const steps=[`Willkommen im Kloster, ${n}. Ich bin Meister Shen. Hier hat jede Routine ihren Ort: Aufstehen am Bett, Essen am Herd.`,`Die Schlafzelle und die Küche stehen dir offen. Alle anderen Türen sind verschlossen. Mit jedem neuen Rang darfst du eine davon öffnen.`,`Trage deine Routinen dort ein, wo sie passieren. Jede bringt Punkte. Mit ihnen hilfst du dem Dorf unten im Tal.`,`Und nun geh. Ein Schritt nach dem anderen.`];let i=0;const nx=()=>{if(i>=steps.length){DW.flag('tut',1);endTalk();if(W)setTimeout(()=>W&&briefing(true),400);return;}dlgK('Meister Shen',steps[i++],[[i<steps.length?'Weiter':'Los geht es',nx,1]]);};nx();},900);}
  else if(!ch&&!opts.room&&!DW.day('_brief'))setTimeout(()=>{if(!W)return;if(new Date().getDay()===0&&!DW.day('_wk')&&DW.flag('tut'))weekReview();briefing(true);},1100);
  else if(W.autoRoom)setTimeout(()=>{if(W)roomDialog(W.autoRoom);},900);
  $('#wDlgX').onclick=()=>endTalk();
  if(W.spawnAt){const sp=W.spawnAt;W.cam.position.set(sp[0]+Math.sin(W.yaw)*2.6,sp[1]+2.7,sp[2]+Math.cos(W.yaw)*2.6);}else{W.cam.position.set(0,6,22);W.yaw=0;}
  W.onResize=()=>{R.setSize(window.innerWidth,window.innerHeight,false);W.cam.aspect=window.innerWidth/window.innerHeight;W.cam.fov=window.innerWidth<window.innerHeight?62:50;W.cam.updateProjectionMatrix();};window.addEventListener('resize',W.onResize);
  $('#wHint').textContent=matchMedia('(pointer:fine)').matches?'WASD laufen · Shift rennen · Maus ziehen umsehen · Rad zoomen · E benutzen · 1–9 im Dialog · Esc Menü':'Links ziehen zum Laufen · rechts wischen zum Umsehen';$('#wHint').classList.remove('gone');clearTimeout(window._hintT);window._hintT=setTimeout(()=>{const h=$('#wHint');if(h)h.classList.add('gone');},9000);if(DW.flag('tut')&&ch)msg('Pilgerreise');
  loop();
}
function close(){
  if(!W)return;cancelAnimationFrame(W.raf);window.removeEventListener('resize',W.onResize);window.removeEventListener('keydown',W.kd);window.removeEventListener('keyup',W.ku);window.removeEventListener('blur',W.blur);
  if(W.mixer&&W.model){W.mixer.stopAllAction();W.mixer.uncacheRoot(W.model);}
  if(W.av)W.scene.remove(W.av);
  W.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});Object.values(W.tex||{}).forEach(t=>t.dispose());Object.values(W.impT||{}).forEach(t=>t.dispose());W.R.dispose();
  W=null;$('#world').hidden=true;$('#wPrompt').hidden=true;$('#wDlg').hidden=true;document.body.classList.remove('inworld');DW.refresh();
}

/* =================== MINISPIEL: PFLAUMENBLÜTEN-PFÄHLE =================== */
let G=null;
function startPoles(){
  if(!DW.spendEnergy(1)){msg('Keine Energie mehr. Erledige Rituale, um neue zu bekommen.');return;}
  const cv=$('#gc'),x=cv.getContext('2d');$('#game').hidden=false;$('#gEnd').hidden=true;
  const lv=DW.level('poles'),N=Math.min(15,7+lv),r=rng(Date.now()%100000),lives=lv<=2?3:lv<=5?2:1;
  G={cv,x,N,lv,lives,lives0:lives,wind:0,windT:0,i:0,t:0,phase:0,speed:1.3+lv*.18,zone:Math.max(.13,.32-lv*.018),needle:0,state:'ready',hops:null,wob:0,poles:Array.from({length:N},(_,k)=>.38+r()*.16),last:performance.now(),best:DW.best('poles')};
  g3dStart();sizeG();$('#gInfo').textContent=G.lv>=3?'Tippe im hellen Bereich. Achte auf den Wind.':'Tippe, wenn die Nadel im hellen Bereich ist.';
  G.raf=requestAnimationFrame(gLoop);
}
function g3dStart(){
  if(!W||!W.model||!W.acts)return;
  const cv=$('#g3'),r=new TH.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));r.setSize(window.innerWidth,window.innerHeight,false);
  r.outputEncoding=TH.sRGBEncoding;r.toneMapping=TH.ACESFilmicToneMapping;r.toneMappingExposure=1.05;r.shadowMap.enabled=true;r.shadowMap.type=TH.PCFSoftShadowMap;
  const sc=new TH.Scene(),cam=new TH.PerspectiveCamera(window.innerWidth<window.innerHeight?50:38,window.innerWidth/window.innerHeight,.1,300);
  const url=DW.photo();if(url)new TH.TextureLoader().load(url,t=>{t.encoding=TH.sRGBEncoding;sc.background=t;});else sc.background=new TH.Color(DW.season().hor);
  sc.fog=new TH.Fog(new TH.Color(DW.season().fog),14,60);
  sc.add(new TH.HemisphereLight(new TH.Color(DW.season().hs),new TH.Color(DW.season().hg),.8));
  const d=new TH.DirectionalLight(0xffd2a0,2.6);d.position.set(-4,8,6);d.castShadow=true;d.shadow.mapSize.set(2048,2048);const c=d.shadow.camera;c.left=-14;c.right=14;c.top=10;c.bottom=-4;c.far=40;d.shadow.normalBias=.03;sc.add(d,d.target);
  const rim=new TH.DirectionalLight(0xffa060,1.2);rim.position.set(6,3,-6);sc.add(rim);
  // Boden mit Textur
  const gt=W.tex.groundD.clone();gt.needsUpdate=true;gt.repeat.set(20,6);const gn=W.tex.groundN.clone();gn.needsUpdate=true;gn.repeat.set(20,6);
  const ground=new TH.Mesh(new TH.PlaneGeometry(60,14),new TH.MeshStandardMaterial({map:gt,normalMap:gn,roughness:.95,color:'#c7b9a3'}));ground.rotation.x=-Math.PI/2;ground.position.set(G.N*.7,0,-2);ground.receiveShadow=true;sc.add(ground);
  // Pfähle aus Holz
  const GAP=1.35,tops=[];G.poles.forEach((ph,k)=>{const hgt=1.1+ph*2.6;tops.push(hgt);const m=new TH.Mesh(new TH.CylinderGeometry(.14,.17,hgt,18),W.M.wood);m.position.set(k*GAP,hgt/2,0);m.castShadow=m.receiveShadow=true;sc.add(m);
    const cap=new TH.Mesh(new TH.CylinderGeometry(.19,.19,.05,18),k===G.N-1?W.M.gold:W.M.wood);cap.position.set(k*GAP,hgt,0);cap.castShadow=true;sc.add(cap);
    const rk=new TH.Mesh(new TH.DodecahedronGeometry(.32,0),W.M.stone);rk.position.set(k*GAP+.1,.08,.1);rk.scale.y=.4;rk.receiveShadow=true;sc.add(rk);});
  // Steine und Laub im Hintergrund
  for(let i=0;i<26;i++){const rk=new TH.Mesh(new TH.DodecahedronGeometry(.2+Math.random()*.5,0),W.M.stone);rk.position.set(-3+Math.random()*(G.N*GAP+6),.05,-1.5-Math.random()*5);rk.scale.y=.5;rk.rotation.y=Math.random()*3;rk.castShadow=rk.receiveShadow=true;sc.add(rk);}
  const M=W.model,A=W.acts;G.m3={par:M.parent,rot:M.rotation.y};sc.add(M);M.rotation.set(0,Math.PI/2,0);
  if(A.Walk)A.Walk.setEffectiveWeight(0);if(A.Idle)A.Idle.setEffectiveWeight(0);if(A.Stance){A.Stance.reset();A.Stance.setEffectiveWeight(1);A.Stance.play();}
  G.t3={r,sc,cam,d,GAP,tops,camX:0};
}
function render3D(){
  const T=G.t3,M=W.model;let k=G.i,x0=k*T.GAP,y0=T.tops[k],px=x0,py=y0;
  if(G.state==='hop'){const u=G.hop,x1=(k+1)*T.GAP,y1=T.tops[k+1];px=x0+(x1-x0)*u;py=y0+(y1-y0)*u+Math.sin(u*Math.PI)*.7;}
  let ang=G.needle*.3+Math.sin(G.t*30)*G.wob*.2;
  if(G.state==='fall'){ang=G.fall*1.4;py=Math.max(0,py-G.fall*G.fall*3.2);px+=G.fall*.4;}
  M.position.set(px,py,0);M.rotation.set(0,Math.PI/2,0);M.rotateOnWorldAxis(new TH.Vector3(0,0,1),-ang);
  T.camX+=(px+.9-T.camX)*.08;T.cam.position.set(T.camX,y0+.7,8.2);T.cam.lookAt(T.camX,y0+.75,0);
  T.d.position.set(px-4,y0+8,6);T.d.target.position.set(px,y0,0);
  T.r.render(T.sc,T.cam);
}
function g3dEnd(){
  if(!G||!G.m3||!W||!W.model)return;const M=W.model;M.position.set(0,0,0);M.rotation.set(0,G.m3.rot,0);G.m3.par.add(M);M.scale.setScalar(.92);
  if(W.acts.Stance)W.acts.Stance.stop();if(W.acts.Idle)W.acts.Idle.setEffectiveWeight(1);
  const T=G.t3;if(T){T.sc.traverse(o=>{if(o.geometry&&o!==M)o.geometry.dispose();});T.r.dispose();G.t3=null;}G.m3=null;
}
function sizeG(){if(G.t3){G.t3.r.setSize(window.innerWidth,window.innerHeight,false);G.t3.cam.aspect=window.innerWidth/window.innerHeight;G.t3.cam.updateProjectionMatrix();}const d=Math.min(2,window.devicePixelRatio||1);G.W=window.innerWidth;G.H=window.innerHeight;G.cv.width=G.W*d;G.cv.height=G.H*d;G.x.setTransform(d,0,0,d,0,0);}
function gTap(){
  if(!G||G.state==='end')return;if(G.state==='ready'){G.state='play';$('#gInfo').textContent='';return;}
  if(G.state!=='play')return;
  if(Math.abs(G.needle)<G.zone){G.state='hop';G.hop=0;DW.tick();}else{G.lives--;G.wob=1;DW.tick();if(G.lives<=0){G.state='fall';G.fall=0;}}
}
function gLoop(now){
  if(!G)return;G.raf=requestAnimationFrame(gLoop);const dt=Math.min(.05,(now-G.last)/1000);G.last=now;G.t+=dt;
  if(G.lv>=3){G.windT-=dt;if(G.windT<=0){G.windT=1.5+Math.random()*2.5;G.windTo=(Math.random()*2-1)*Math.min(.45,.1+G.lv*.035);}G.wind+=((G.windTo||0)-G.wind)*Math.min(1,dt*1.5);}
  if(G.state==='play'){G.phase+=dt*G.speed;G.needle=Math.max(-1,Math.min(1,Math.sin(G.phase*2.2)*.75+Math.sin(G.phase*5.3)*.25*Math.min(1,G.i/4)+G.wind));}
  if(G.state==='hop'){G.hop+=dt*2.4;if(G.hop>=1){G.i++;G.speed+=.22;G.zone=Math.max(.1,G.zone-.018);G.phase=Math.random()*3;if(G.i>=G.N-1){G.state='end';endPoles(true);}else G.state='play';}}
  if(G.state==='fall'){G.fall+=dt*1.6;if(G.fall>=1.2){G.state='end';endPoles(false);}}
  G.wob=Math.max(0,G.wob-dt*1.8);if(G.m3&&W&&W.mixer)W.mixer.update(dt);drawG();
}
function drawG(){
  const {x,W:w,H:h}=G;
  if(G.t3){x.clearRect(0,0,w,h);const sh=x.createLinearGradient(0,0,0,h*.4);sh.addColorStop(0,'rgba(0,0,0,.55)');sh.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=sh;x.fillRect(0,0,w,h*.4);render3D();}else{
  const sky=x.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#1a1622');sky.addColorStop(.55,'#8a4a32');sky.addColorStop(1,'#20140f');x.fillStyle=sky;x.fillRect(0,0,w,h);
  x.fillStyle='rgba(255,120,70,.9)';x.beginPath();x.arc(w*.72,h*.36,Math.min(w,h)*.08,0,7);x.fill();
  const hills=(yb,amp,col,seed)=>{x.fillStyle=col;x.beginPath();x.moveTo(0,h);for(let i=0;i<=40;i++){const xx=i/40*w;x.lineTo(xx,yb-amp*(.5+.5*Math.sin(i*.7+seed)+.25*Math.sin(i*1.9+seed*2)));}x.lineTo(w,h);x.fill();};
  hills(h*.55,h*.12,'#3a2a2a',1);hills(h*.66,h*.08,'#24191a',3);hills(h*.78,h*.05,'#140e0d',5);
  // Pfähle
  const gap=Math.min(120,w*.28),cam=(G.i+(G.state==='hop'?G.hop:0))*gap,baseX=w*.32,ground=h*.92;
  G.poles.forEach((ph,k)=>{const px=baseX+k*gap-cam,top=ground-ph*h*.6;if(px<-40||px>w+40)return;const g=x.createLinearGradient(px-9,0,px+9,0);g.addColorStop(0,'#3a2216');g.addColorStop(.5,'#7a4a2a');g.addColorStop(1,'#2a160e');x.fillStyle=g;x.fillRect(px-9,top,18,ground-top);x.fillStyle='#8a5a34';x.fillRect(px-11,top-4,22,6);if(k===G.N-1){x.fillStyle='#d8b25a';x.fillRect(px-11,top-6,22,4);}});
  // Figur
  let k=G.i,ph=G.poles[k],px=baseX+k*gap-cam,py=ground-ph*h*.6;
  if(G.state==='hop'){const n=G.poles[k+1],nx=baseX+(k+1)*gap-cam,ny=ground-n*h*.6,u=G.hop;px=px+(nx-px)*u;py=py+(ny-py)*u-Math.sin(u*Math.PI)*h*.12;}
  let ang=G.needle*.35+Math.sin(G.t*30)*G.wob*.25;if(G.state==='fall'){ang=G.fall*1.6;py+=G.fall*G.fall*h*.4;}
  x.save();x.translate(px,py-4);x.rotate(ang);x.fillStyle='#120c0a';
  x.beginPath();x.arc(0,-62,9,0,7);x.fill();x.beginPath();x.moveTo(-14,-50);x.lineTo(14,-50);x.lineTo(18,-14);x.lineTo(-18,-14);x.closePath();x.fill();
  x.lineWidth=6;x.strokeStyle='#120c0a';x.lineCap='round';x.beginPath();x.moveTo(-3,-14);x.lineTo(-5,0);x.moveTo(3,-14);x.lineTo(14,-22);x.stroke();
  x.beginPath();x.moveTo(-13,-44);x.lineTo(-34,-38+G.needle*14);x.moveTo(13,-44);x.lineTo(34,-38-G.needle*14);x.stroke();x.restore();
  }
  // Waage
  const cx=w/2,cy=h*.2,R=Math.min(130,w*.33);x.lineWidth=10;x.lineCap='round';
  x.strokeStyle='rgba(255,255,255,.12)';x.beginPath();x.arc(cx,cy,R,Math.PI*1.1,Math.PI*1.9);x.stroke();
  const zA=G.zone*.4*Math.PI;x.strokeStyle='rgba(255,220,150,.85)';x.beginPath();x.arc(cx,cy,R,Math.PI*1.5-zA,Math.PI*1.5+zA);x.stroke();
  const na=Math.PI*1.5+G.needle*.4*Math.PI;x.strokeStyle='#ff4b2b';x.lineWidth=4;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(na)*(R+8),cy+Math.sin(na)*(R+8));x.stroke();
  x.fillStyle='#ecebe6';x.beginPath();x.arc(cx,cy,6,0,7);x.fill();
  x.font='700 15px Rubik,system-ui,sans-serif';x.textAlign='center';x.fillStyle='#ecebe6';x.fillText(`Stufe ${G.lv} · Pfahl ${Math.min(G.i+1,G.N)} / ${G.N}`,cx,cy+28);
  if(G.lv>=3){const wx=cx,wy=cy+70,L=G.wind*120;x.strokeStyle='rgba(180,220,255,.85)';x.lineWidth=3;x.beginPath();x.moveTo(wx,wy);x.lineTo(wx+L,wy);x.stroke();if(Math.abs(L)>4){x.beginPath();x.moveTo(wx+L,wy);x.lineTo(wx+L-Math.sign(L)*8,wy-5);x.lineTo(wx+L-Math.sign(L)*8,wy+5);x.closePath();x.fillStyle='rgba(180,220,255,.85)';x.fill();}x.font='600 11px Rubik,system-ui,sans-serif';x.fillStyle='rgba(180,220,255,.8)';x.fillText('Wind',wx,wy+18);}
  for(let l=0;l<G.lives0;l++){x.fillStyle=l<G.lives?'#ff4b2b':'rgba(255,255,255,.2)';x.beginPath();x.arc(cx-18+l*18,cy+46,5,0,7);x.fill();}
  if(G.state==='ready'){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,h*.45,w,70);x.fillStyle='#fff';x.font='800 22px Rubik,system-ui,sans-serif';x.fillText('Tippen zum Starten',cx,h*.45+44);}
}
function endPoles(win){
  const reached=win?G.N:G.i,perfect=win&&G.lives===G.lives0;DW.day('_qp',Math.max(DW.day('_qp')||0,reached));
  let chi=0,sub;
  if(win){chi=2*G.lv+(perfect?3:0);DW.setLevel('poles',G.lv+1);DW.day('_qlv',1);if(perfect)DW.day('_qpp',1);sub=`Stufe ${G.lv} bestanden${perfect?' · ohne Fehler':''} · Nächste: Stufe ${G.lv+1}`;}
  else sub=`${reached} von ${G.N} Pfählen · Stufe ${G.lv} nicht bestanden`;
  DW.setBest('poles',Math.max(G.best||0,G.lv-(win?0:1)));
  $('#gEnd').hidden=false;$('#gEndT').textContent=win?'Gemeistert':'Gefallen';$('#gEndS').textContent=sub;$('#gEndC').textContent=win?`+${chi} Chi`:'Kein Chi. Nur wer besteht, wird belohnt.';
  G.reward=chi;if(win)DW.bell(1.3);
}
$('#game').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;gTap();});
window.addEventListener('keydown',e=>{if(G&&!$('#game').hidden&&(e.key===' '||e.key==='Enter')){e.preventDefault();gTap();}});
$('#gExit').onclick=()=>finishG();
$('#gDone').onclick=()=>finishG();
$('#gAgain').onclick=()=>{const c=G&&G.reward;finishG(true);startPoles();};
function finishG(again){if(!G)return;cancelAnimationFrame(G.raf);g3dEnd();const chi=G.state==='end'?G.reward:0;G=null;$('#game').hidden=true;if(chi){DW.gameReward(chi,'Pflaumenblüten-Pfähle');if(W)msg('+'+chi+' Chi gutgeschrieben');}}
window.addEventListener('resize',()=>{if(G)sizeG();});

/* ---------- Wetter ---------- */
function weatherToday(){const d=new Date(),x=(d.getFullYear()*372+d.getMonth()*31+d.getDate())*9301%233280/233280;if(W.se.winter)return x<.3?'schnee':x<.4?'nebel':'klar';return x<.2?'regen':x<.3?'nebel':'klar';}
function weather(){if(W.ch)return;let fw=null;try{fw=localStorage.getItem('dw.weather');}catch(e){}const w=fw||weatherToday();W.weather=w;if(w==='klar')return;
  if(w==='nebel'){W.scene.fog.density*=3.6;W.scene.fog.color.lerp(new TH.Color('#c8ccd0'),.5);W.hemi.intensity*=.85;W.dir.intensity*=.45;return;}
  if(W.flies){W.flies.forEach(F=>W.root.remove(F.b));W.flies=null;}
  W.dir.intensity*=.45;W.hemi.intensity*=.8;W.scene.fog.density*=1.5;if(W.sky&&W.sky.material.color)W.sky.material.color.multiplyScalar(.75);
  const rain=w==='regen',n=rain?2600:1600,pos=new Float32Array(n*3),sp=new Float32Array(n);for(let i=0;i<n;i++){pos[i*3]=(Math.random()-.5)*24;pos[i*3+1]=Math.random()*12;pos[i*3+2]=(Math.random()-.5)*24;sp[i]=.7+Math.random()*.6;}
  const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(pos,3));
  const m=rain?new TH.PointsMaterial({color:0xdde6f0,size:.06,transparent:true,opacity:.8,depthWrite:false}):new TH.PointsMaterial({color:0xffffff,size:.11,map:softTex(),transparent:true,opacity:.9,depthWrite:false});
  if(rain){const tc=document.createElement('canvas');tc.width=4;tc.height=32;const x=tc.getContext('2d');const gr=x.createLinearGradient(0,0,0,32);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(255,255,255,1)');x.fillStyle=gr;x.fillRect(1,0,2,32);m.map=new TH.CanvasTexture(tc);m.size=.6;}
  const P=new TH.Points(g,m);P.frustumCulled=false;W.scene.add(P);W.wP={P,sp,rain};}
function weatherUpdate(dt){const w=W.wP;if(!w)return;const p=w.P.geometry.attributes.position,c=W.av?W.av.position:{x:0,z:0},t=performance.now()/1000;w.P.visible=!W.inHut;
  for(let i=0;i<p.count;i++){let y=p.getY(i)-(w.rain?11:1.1)*w.sp[i]*dt;let x=p.getX(i),z=p.getZ(i);if(!w.rain){x+=Math.sin(t*.7+i)*.004;}
    if(y<0){y=12;x=c.x+(Math.random()-.5)*24;z=c.z+(Math.random()-.5)*24;}p.setXYZ(i,x,y,z);}p.needsUpdate=true;}
/* ---------- Bitten der Mönche ---------- */
const NQ=[{who:'Schwester Lin',item:'Gebetskette',ask:'Ich habe meine Gebetskette verloren. Irgendwo draussen im Hof, glaube ich. Hilfst du mir suchen?',thx:'Meine Kette! Danke dir. Nimm das als Dank.'},
 {who:'Bruder Wei',item:'Besenstiel',ask:'Mein Ersatz-Besenstiel ist weg. Ich habe ihn heute Morgen irgendwo abgestellt.',thx:'Da ist er ja. Ohne Besen ist der Hof nicht der Hof.'},
 {who:'Novize Kai',item:'Schriftrolle',ask:'Shen hat mir eine Schriftrolle gegeben, und der Wind hat sie mir aus der Hand gerissen. Sie muss irgendwo im Hof liegen.',thx:'Puh, gerettet! Shen hätte mich die Treppe fegen lassen. Danke!'},
 {who:'Schwester Lin',item:'Teeschale',ask:'Ich habe meine Teeschale draussen stehen lassen. Würdest du sie mir bringen?',thx:'Danke. Komm doch einmal zum Tee vorbei.'},
 {who:'Novize Kai',item:'Glöckchen',ask:'Ich habe das kleine Glöckchen vom Tor verloren. Wenn Shen das merkt …',thx:'Du bist ein echter Freund. Hier, für dich.'}];
const NQSPOT=[[-6.5,17.5],[6.2,20.5],[8.5,4.5],[-3.2,2.6],[4.6,-3.4],[-8.8,22],[7.5,15],[-2.5,22.5]];
function nqToday(){const d=new Date(),i=(d.getFullYear()*372+d.getMonth()*31+d.getDate());return{q:NQ[i%NQ.length],spot:NQSPOT[(i*7)%NQSPOT.length]};}
function nqSetup(){if(W.ch)return;const st=DW.day('_nq')||0;if(st>=2)return;const{q,spot}=nqToday();const[x,z]=spot,y=groundH(x,z);
  const g=new TH.Group();const gm=new TH.MeshStandardMaterial({color:'#e9c46a',emissive:'#a8781a',emissiveIntensity:.6,metalness:.4,roughness:.4});
  if(q.item==='Gebetskette'){for(let i=0;i<14;i++){const a=i/14*6.28,b=new TH.Mesh(new TH.SphereGeometry(.03,8,6),new TH.MeshStandardMaterial({color:'#5a2a1a',roughness:.4}));b.position.set(Math.cos(a)*.12,.03,Math.sin(a)*.12);g.add(b);}}
  else if(q.item==='Besenstiel'){const m=new TH.Mesh(new TH.CylinderGeometry(.02,.02,1.2,6),W.M.wood);m.rotation.z=Math.PI/2;m.position.y=.03;g.add(m);}
  else if(q.item==='Schriftrolle'){const m=new TH.Mesh(new TH.CylinderGeometry(.04,.04,.36,10),new TH.MeshStandardMaterial({color:'#efe2c4'}));m.rotation.z=Math.PI/2;m.position.y=.04;g.add(m);}
  else if(q.item==='Teeschale'){const m=new TH.Mesh(new TH.SphereGeometry(.08,12,8,0,6.3,Math.PI/2,Math.PI/2),new TH.MeshStandardMaterial({color:'#3a5a4a',side:TH.DoubleSide}));m.rotation.x=Math.PI;m.position.y=.08;g.add(m);}
  else{const m=new TH.Mesh(new TH.SphereGeometry(.06,10,8,0,6.3,0,Math.PI*.6),gm);m.position.y=.06;g.add(m);}
  const glint=new TH.Sprite(new TH.SpriteMaterial({map:softTex(),color:0xffe7a0,transparent:true,depthWrite:false,blending:TH.AdditiveBlending}));glint.scale.setScalar(.5);glint.position.y=.25;g.add(glint);
  g.position.set(x,y,z);g.visible=st===1;W.root.add(g);W.nq={g,glint,q};
  W.inter.push({x,z,r:1.2,label:q.item,btn:'Aufheben',get hide(){return(DW.day('_nq')||0)!==1;},act:()=>{if((DW.day('_nq')||0)!==1)return;DW.day('_nq',2);g.visible=false;DW.bell(1);msg(`${q.item} gefunden. Bring sie zu ${q.who}.`);}});}
function nqDialog(N,name){const st=DW.day('_nq')||0,{q}=nqToday();if(q.who!==name||st>=3)return false;
  if(st===0){dlgK(name,q.ask,[['Ich helfe dir',()=>{endTalk();DW.day('_nq',1);if(W.nq)W.nq.g.visible=true;msg(`Such die ${q.item} im Hof. Sie glänzt ein wenig.`);},1],['Später',()=>endTalk()]]);return true;}
  if(st===1){dlgK(name,`Hast du die ${q.item} schon gefunden? Schau dich im Hof um.`,[['Ich suche weiter',()=>endTalk(),1]]);return true;}
  if(st===2){dlgK(name,q.thx,[['Gern geschehen',()=>{endTalk();DW.day('_nq',3);DW.stat('quest');DW.addCoins(8,'Dank von '+name);N.bowT=2.4;playOnce('Bow');sealCheck();},1]]);return true;}}
/* ---------- Siegel ---------- */
function sealCheck(){const S0=DW.seals(),got=S0.filter(x=>x.ok).map(x=>x.id);let known=[];try{known=JSON.parse(localStorage.getItem('dw.seals')||'null');}catch(e){}
  if(known===null){localStorage.setItem('dw.seals',JSON.stringify(got));return;}const nw=S0.filter(x=>x.ok&&!known.includes(x.id));if(!nw.length)return;localStorage.setItem('dw.seals',JSON.stringify(got));
  nw.forEach((x,i)=>setTimeout(()=>{if(!W)return;const el=document.createElement('div');el.className='w-seal';el.innerHTML=`<i>✦</i><div><small>Neues Siegel</small><b>${x.n}</b><span>${x.t}</span></div>`;$('#world').appendChild(el);bowl(.22);setTimeout(()=>el.classList.add('go'),3800);setTimeout(()=>el.remove(),4600);},1500+i*4800));}
function sealsUI(){const L=DW.seals(),n=L.filter(x=>x.ok).length;const o=ovl('wSeals',`<div><div class="mh"><div><h3>Siegel</h3><p>${n} von ${L.length} gesammelt.</p></div></div><div class="sg">${L.map(x=>`<div class="${x.ok?'ok':''}"><i>${x.ok?'✦':'·'}</i><b>${x.n}</b><small>${x.t}</small></div>`).join('')}</div><div class="row"><button class="btn" data-x>Schliessen</button></div></div>`);o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};}
/* ---------- Wochenrückblick ---------- */
function weekReview(){const w=DW.week();const best=w.full>=6?'Eine Woche wie aus Stein gemeisselt. So wird man Meister.':w.full>=4?'Eine gute Woche. Halte den Rhythmus.':w.full>=2?'Es war nicht jeder Tag leicht. Aber du bist geblieben.':'Diese Woche war schwer. Ein neuer Anfang ist kein Rückschritt.';
  const o=ovl('wWeek',`<div><div class="mh"><div><h3>Deine Woche</h3><p>Meister Shen schaut mit dir zurück.</p></div><span class="coin">${w.rank}</span></div>
   <div class="wk">${w.days.map(d=>`<div class="${d.full?'f':d.done?'p':''}"><i></i><small>${d.wd}</small></div>`).join('')}</div>
   <div class="ws"><span><b>${w.full}</b>vollendete Tage</span><span><b>${w.pts}</b>Punkte</span><span><b>${w.med}</b>Meditationen</span><span><b>${w.tr}</b>Trainings</span><span><b>${w.dank}</b>Dankbarkeit</span><span><b>${w.village}</b>Dorf-Events</span></div>
   <p style="margin-top:12px;font-style:italic">«${best}»</p><div class="row"><button class="btn primary" data-x>Weiter</button></div></div>`);o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};DW.day('_wk',1);bowl(.2);}
/* ---------- Tagebuch ---------- */
function journalUI(){const J=DW.journal();const ks=Object.keys(J).sort().reverse().slice(0,30);const fmt=k=>k.split('-').reverse().join('.');
  const o=ovl('wJour',`<div><h3>Tagebuch der Dankbarkeit</h3><p>${ks.length?'Was du an deinen Abenden festgehalten hast.':'Noch leer. Beim Abendritual kannst du jeden Tag einen Satz festhalten.'}</p><div class="sl">${ks.map(k=>`<div class="fr"><span><small>${fmt(k)}</small>${J[k].replace(/</g,'&lt;')}</span></div>`).join('')}</div><div class="row"><button class="btn" data-x>Schliessen</button></div></div>`);o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};}
/* ---------- Training mit Bruder Tao ---------- */
function trainForm(N){if(!W||!W.av||W.training)return;const o=N.o,av=W.av;const fx=o.position.x-1.3,fz=o.position.z+.2;av.position.set(fx,groundH(fx,fz),fz);av.rotation.y=o.rotation.y;W.training=1;
  const cx=(o.position.x+fx)/2;W.camOv={p:new TH.Vector3(cx-2.2,1.9,o.position.z-3.4),t:new TH.Vector3(cx,1,o.position.z)};
  if(N.A.Form){N.A.Form.reset();N.A.Form.play();}let reps=0;msg('Folge Bruder Tao. Drei Durchgänge.');
  const one=()=>{if(!W||!W.training)return;reps++;if(N.A.Form)N.A.Form.reset();playOnce('Form',()=>{if(!W)return;if(reps<3){setTimeout(one,250);}else{W.training=0;W.camOv=null;const r=DW.trainDone();playOnce('Bow');N.bowT=2.4;msg(r.first?`Gut gemacht. +${r.chi} Chi und Kraft.`:'Gut gemacht. Die Belohnung gibt es einmal am Tag, die Übung bleibt dir.');if(r.first)checkin('kraft',r.chi);ptsHud();}});};one();}
/* ---------- Tai Chi 8er-Form ---------- */
const TCQ=[[0,'Beginn','Füsse schulterbreit. Die Arme heben sich langsam bis auf Schulterhöhe und sinken wieder, die Knie beugen sich leicht.'],[7.5,'Affe abwehren','Eine Hand schiebt nach vorn, die andere zieht zurück zur Hüfte. Dann wechseln.'],[20,'Knie streifen','Schritt nach vorn. Die untere Hand streift am Knie vorbei, die obere schiebt nach vorn.'],[27,'Mähne des Wildpferds teilen','Die vordere Hand hebt sich schräg nach oben, die hintere sinkt zur Hüfte.'],[34,'Wolkenhände','Die Hände ziehen wie Wolken vor dem Gesicht vorbei. Die Hüfte dreht mit.'],[46.5,'Goldener Hahn','Ein Knie hebt sich, die Hand steigt mit. Halte das Gleichgewicht.'],[53.5,'Fersenstoss','Die Arme öffnen sich weit. Die Ferse stösst langsam nach vorn.'],[62,'Spatzenschwanz greifen','Abwehren, zurückrollen, drücken, stossen.'],[74.5,'Hände kreuzen','Die Hände kreuzen sich vor der Brust.'],[77.5,'Abschluss','Die Arme sinken. Atme aus. Steh still.']];
function tcChoose(N){const o=ovl('wTc',`<div><h3>Tai Chi mit Bruder Tao</h3><p>Die 8er-Form im Yang-Stil, ein Durchgang dauert etwa 80 Sekunden. Stell dich hin, mit etwas Platz um dich, und mach mit. Mit Kopfhörern hörst du die Ansagen.</p><div class="sl">${[3,5,10].map(m=>`<button class="btn" data-m="${m}">${m} Minuten <small>· ${Math.round(m*60/81)} Durchgänge</small></button>`).join('')}</div><div class="row"><button class="btn" data-x>Abbrechen</button></div></div>`);
  o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};o.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{o.hidden=true;tcStart(N,+b.dataset.m);});}
function tcStart(N,min){if(!W||!W.av)return;xclip('TaiChi',c=>{if(!W||!W.mixer)return;const a=W.acts.TaiChi||(W.acts.TaiChi=W.mixer.clipAction(c));a.setLoop(TH.LoopRepeat);a.reset();a.play();a.setEffectiveWeight(0);if(N.A.TaiChi){N.A.TaiChi.reset();N.A.TaiChi.play();}
  const o=N.o,av=W.av,fx=o.position.x-1.6,fz=o.position.z+.3;av.position.set(fx,groundH(fx,fz),fz);av.rotation.y=o.rotation.y;
  W.tc={t0:performance.now()/1000,dur:min*60,min,q:-1,N,len:c.duration};const cx=(o.position.x+fx)/2;W.camOv={p:new TH.Vector3(cx-3.4,1.8,o.position.z+3.4),t:new TH.Vector3(cx,.95,o.position.z)};
  const ov=ovl('wTcRun',`<div class="medbox"><div class="mt" id="tcT">${min}:00</div><b id="tcN" style="display:block;font-size:20px;color:#f2d48a;margin-bottom:4px">Beginn</b><p id="tcX">Füsse schulterbreit.</p><div class="row"><button class="btn" id="tcStop">Beenden</button></div></div>`);ov.classList.add('medrun');ov.onclick=null;
  $('#tcStop').onclick=()=>tcEnd(false);document.querySelectorAll('.w-top,.w-pts,.w-hint').forEach(e=>e.style.visibility='hidden');bowl(.3);});}
function tcTick(){const T=W.tc;if(!T)return;const el=performance.now()/1000-T.t0,left=Math.max(0,T.dur-el),lt=el%T.len;
  const tt=$('#tcT');if(tt)tt.textContent=`${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`;
  let qi=0;for(let i=0;i<TCQ.length;i++)if(lt>=TCQ[i][0])qi=i;const key=Math.floor(el/T.len)*100+qi;if(key!==T.q){T.q=key;$('#tcN').textContent=TCQ[qi][1];$('#tcX').textContent=TCQ[qi][2];say(TCQ[qi][1]+'. '+TCQ[qi][2]);}
  const a=W.camOv;if(a){const ang=Math.sin(el*.03)*.5;const cx=a.t.x,cz=a.t.z;a.p.set(cx-Math.cos(ang+.8)*4.6,1.8,cz+Math.sin(ang+.8)*4.6);}
  if(left<=0)tcEnd(true);}
function tcEnd(done){const T=W.tc;if(!T)return;W.tc=null;try{speechSynthesis.cancel();}catch(e){}const o=$('#wTcRun');if(o)o.hidden=true;document.querySelectorAll('.w-top,.w-pts,.w-hint').forEach(e=>e.style.visibility='');W.camOv=null;
  const m=(performance.now()/1000-T.t0)/60;if(done||m>=1){bowl(.3);T.N.bowT=2.4;playOnce('Bow');const r=DW.taichiDone(done?T.min:Math.floor(m));const p=[];if(r.chi)p.push(`+${r.chi} Chi und Kraft`);if(r.rit)p.push(`Routine «${r.rit}» erfüllt`);msg(p.length?'Gut geübt. '+p.join(' · ')+'.':'Gut geübt. Chi gibt es einmal am Tag.');if(r.chi)checkin('kraft',r.chi);ptsHud();sealCheck();}
  else msg('Tai Chi abgebrochen. Ab einer Minute zählt es.');}
/* ---------- Abendritual ---------- */
function evening(){const n=DW.name(),dt=DW.doneToday(),L=DW.todayList();const summ=!dt.n?'Heute standen keine festen Routinen an.':dt.done>=dt.n?`Du hast heute alles erfüllt. ${dt.n} von ${dt.n}.`:`${dt.done} von ${dt.n} Routinen erfüllt. ${L.filter(r=>!r.done).map(r=>r.name).join(', ')} blieb offen. Morgen ist ein neuer Tag.`;
  const o=ovl('wEve',`<div><h3>Abendritual</h3><p>${summ}</p><p style="margin-top:10px">Wofür bist du heute dankbar?</p><textarea id="eveTx" rows="3" style="width:100%;background:#0c0d0f;color:#ecebe6;border:1px solid var(--stroke);border-radius:14px;padding:10px;font:inherit;margin-bottom:12px" placeholder="Ein Satz genügt."></textarea><div class="row"><button class="btn" data-x>Später</button><button class="btn primary" id="eveOk">Licht löschen</button></div></div>`);
  o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};$('#eveTx').addEventListener('keydown',e=>e.stopPropagation());
  $('#eveOk').onclick=()=>{const t=$('#eveTx').value.trim();o.hidden=true;const r=DW.eveningDone(t);const f=document.createElement('div');f.style.cssText='position:absolute;inset:0;background:#000;opacity:0;transition:opacity 1.6s;z-index:8;display:grid;place-items:center;color:#f2d48a;font-size:18px;letter-spacing:.04em';f.textContent='Gute Nacht, '+n+'.';$('#world').appendChild(f);requestAnimationFrame(()=>f.style.opacity='1');bowl(.25);
    setTimeout(()=>{f.style.opacity='0';setTimeout(()=>f.remove(),1700);msg(r.first?`Der Tag ist abgeschlossen. +${r.chi} Chi und Ruhe.`:'Der Tag ist abgeschlossen.');if(r.first)checkin('ruhe',r.chi);ptsHud();},3200);};}
/* ---------- Geführte Meditation ---------- */
const MEDTXT={
 intro:['Setz dich bequem hin. Wenn du magst, schliess die Augen.','Wir beginnen mit dem Atem. Atme ein, wenn der Kreis grösser wird. Atme aus, wenn er kleiner wird.'],
 mid:['Spür, wie die Luft durch die Nase einströmt. Kühl beim Einatmen, warm beim Ausatmen.','Wenn Gedanken kommen, ist das in Ordnung. Bemerke sie, und kehr freundlich zum Atem zurück.','Lass die Schultern sinken. Lass den Kiefer locker.','Spür den Boden unter dir. Er trägt dich.','Mit jedem Ausatmen wirst du ein wenig ruhiger.','Höre auf die Geräusche um dich. Lass sie kommen und gehen.','Spür deinen Bauch, wie er sich hebt und senkt.','Du musst nichts tun. Nur atmen und da sein.','Bemerke, wie dein Herz schlägt. Ruhig und gleichmässig.','Wenn du abschweifst, beginne einfach von vorn. Einatmen. Ausatmen.'],
 end:['Langsam kommst du zurück. Beweg die Finger, die Zehen.','Nimm einen tiefen Atemzug. Und öffne die Augen, wenn du bereit bist.']};
const AUDK={};function say(t,key){if(key&&AUDK._none)key=null;if(key&&AUDK[key]!==false){let fb=false;const back=()=>{if(fb)return;fb=true;AUDK[key]=false;AUDK._none=true;say(t);};const a=new Audio('audio/'+key+'.mp3');a.onerror=back;a.play().then(()=>{AUDK[key]=true;}).catch(back);return;}try{if(!window.speechSynthesis||!DW.soundOn())return;const u=new SpeechSynthesisUtterance(t);u.lang='de-DE';u.rate=.82;u.pitch=.9;u.volume=.95;const v=speechSynthesis.getVoices().filter(v=>/^de/i.test(v.lang));const pick=v.find(x=>/Anna|Markus|Helena|Google|Petra|Yannick/i.test(x.name))||v[0];if(pick)u.voice=pick;speechSynthesis.speak(u);}catch(e){}}
function bowl(vol){const ac=DW.ac();if(!ac)return;if(ac.state==='suspended')ac.resume();const t=ac.currentTime,out=ac.createGain();out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(vol||.35,t+.02);out.gain.exponentialRampToValueAtTime(.0001,t+9);out.connect(ac.destination);
  [[220,1],[440*1.003,.5],[660*.998,.35],[1190,.18],[1760,.08]].forEach(([f,a],i)=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=a;const lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=3+i*.7;lg.gain.value=a*.25;lfo.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(out);o.start(t);lfo.start(t);o.stop(t+9.2);lfo.stop(t+9.2);});}
function medChoose(){const o=ovl('wMed',`<div><h3>Meditation in der Halle</h3><p>Setz Kopfhörer auf und mach mit. Meister Shen führt dich mit Stimme und Atemkreis. Die erste Meditation des Tages bringt Chi und Ruhe.</p><div class="sl">${[3,5,10].map(m=>`<button class="btn" data-m="${m}">${m} Minuten <small>· ${m*3} Chi</small></button>`).join('')}</div><div class="row"><button class="btn" data-x>Abbrechen</button></div></div>`);
  o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};o.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{o.hidden=true;medStart(+b.dataset.m);});}
function medFloor(x,z){const rc=new TH.Raycaster(new TH.Vector3(x,6,z),new TH.Vector3(0,-1,0));rc.camera=W.cam;let hs=[];try{hs=rc.intersectObjects(W.root.children,true);}catch(e){}const h=hs.find(i=>i.object.isMesh&&i.object.visible&&!i.object.isPoints&&i.face&&i.face.normal.y>.5);return h?h.point.y:.35;}
function medStart(min){if(!W||!W.av)return;const av=W.av;W.medBack={p:av.position.clone(),r:av.rotation.y,yaw:W.yaw};const x=0,z=-.1,y=Math.max(.35,medFloor(x,z));
  av.position.set(x,y,z);av.rotation.y=Math.PI;W.med={t0:performance.now()/1000,dur:min*60,next:0,said:{},min,y};W.kneel=0;
  W.camOv={p:new TH.Vector3(x,y+1.4,z+2.7),t:new TH.Vector3(x,y+.75,z-1.2)};W.medXZ=[x,z];
  const o=ovl('wMedRun',`<div class="medbox"><div class="breath"><i></i><b id="mBr">Einatmen</b></div><div class="mt" id="mT">${min}:00</div><p id="mTx">Setz dich bequem hin.</p><div class="row"><button class="btn" id="mStop">Beenden</button></div></div>`);o.classList.add('medrun');o.onclick=null;
  $('#mStop').onclick=()=>medEnd(false);document.querySelectorAll('.w-top,.w-pts,.w-hint,#wAct').forEach(e=>e.style.visibility='hidden');
  bowl(.4);setTimeout(()=>{say(MEDTXT.intro[0],'intro1');setTimeout(()=>W&&W.med&&say(MEDTXT.intro[1],'intro2'),9000);},2500);}
function medTick(){const M=W.med;if(!M)return;const now=performance.now()/1000,el=now-M.t0,left=Math.max(0,M.dur-el);
  W.av.position.y=M.y;const a=W.camOv;if(a){const ang=Math.sin(el*.04)*.32,r=3.3;const[mx0,mz0]=W.medXZ;a.p.set(mx0+Math.sin(ang)*r,M.y+2.0,mz0+Math.cos(ang)*r);a.t.set(mx0,M.y+.35,mz0-.9);}
  const cyc=10,ph=(el%cyc)/cyc,inh=ph<.4,sc=inh?(.55+.45*Math.sin(ph/.4*Math.PI/2)):(1-.45*Math.sin((ph-.4)/.6*Math.PI/2));const br=document.querySelector('#wMedRun .breath i');if(br)br.style.transform=`scale(${sc})`;const bl=$('#mBr');if(bl)bl.textContent=inh?'Einatmen':'Ausatmen';
  const tt=$('#mT');if(tt)tt.textContent=`${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`;
  if(el>22&&left>25&&el>M.next){M.k=M.k==null?Math.floor(Math.random()*MEDTXT.mid.length):M.k+1;const mi=M.k%MEDTXT.mid.length,t=MEDTXT.mid[mi];say(t,'mid'+(mi+1));$('#mTx').textContent=t;M.next=el+Math.max(30,Math.min(60,(M.dur-45)/8));}
  if(left<20&&!M.endSaid){M.endSaid=1;say(MEDTXT.end[0],'end1');setTimeout(()=>say(MEDTXT.end[1],'end2'),8000);$('#mTx').textContent=MEDTXT.end[0];}
  if(left<=0)medEnd(true);}
function medEnd(done){const M=W.med;if(!M)return;W.med=null;try{speechSynthesis.cancel();}catch(e){}const o=$('#wMedRun');if(o)o.hidden=true;document.querySelectorAll('.w-top,.w-pts,.w-hint,#wAct').forEach(e=>e.style.visibility='');
  W.camOv=null;const el=(performance.now()/1000-M.t0)/60;
  setTimeout(()=>{if(!W)return;if(W.medBack){W.av.position.y=W.medBack.p.y;}},1200);
  if(done||el>=1){bowl(.3);const r=DW.meditateDone(done?M.min:Math.floor(el));const parts=[];if(r.chi)parts.push(`+${r.chi} Chi und Ruhe`);if(r.rit)parts.push(`Routine «${r.rit}» erfüllt`);msg(parts.length?'Meditation beendet. '+parts.join(' · ')+'.':'Meditation beendet. Chi gibt es einmal pro Tag, die Ruhe bleibt dir.');if(r.chi)checkin('ruhe',r.chi);ptsHud();}
  else msg('Meditation abgebrochen. Ab einer Minute zählt sie.');}
/* ---------- Klangkulisse (prozedural) ---------- */
function noiseBuf(ac,brown){const n=ac.sampleRate*2,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[i]=l*3.5;}else d[i]=w;}return b;}
['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,()=>{try{const a=DW.ac();if(a&&a.state==='suspended')a.resume();}catch(e){}},{passive:true}));
function sndInit(){if(W.snd||!DW.soundOn())return;const ac=DW.ac();if(!ac)return;const S0={ac};W.snd=S0;
  const out=ac.createGain();out.gain.value=0;out.connect(ac.destination);S0.out=out;
  const loop=(buf)=>{const s=ac.createBufferSource();s.buffer=buf;s.loop=true;s.start();return s;};const br=noiseBuf(ac,true),wh=noiseBuf(ac,false);S0.wh=wh;
  // Wind
  const w=loop(br),wf=ac.createBiquadFilter();wf.type='lowpass';wf.frequency.value=380;const wg=ac.createGain();wg.gain.value=.12;w.connect(wf);wf.connect(wg);wg.connect(out);S0.wf=wf;S0.wg=wg;
  // Wasser (Teich)
  const q=loop(wh),qf=ac.createBiquadFilter();qf.type='bandpass';qf.frequency.value=1500;qf.Q.value=.8;const qg=ac.createGain();qg.gain.value=0;q.connect(qf);qf.connect(qg);qg.connect(out);S0.qg=qg;
  // Grillen (Nacht)
  const c=ac.createOscillator();c.frequency.value=4400;const cam=ac.createGain();cam.gain.value=0;const lfo=ac.createOscillator();lfo.frequency.value=28;const lg=ac.createGain();lg.gain.value=.5;lfo.connect(lg);lg.connect(cam.gain);c.connect(cam);const cg=ac.createGain();cg.gain.value=0;cam.connect(cg);cg.connect(out);c.start();lfo.start();S0.cg=cg;
  // Feuer (Küche)
  const f=loop(wh),ff=ac.createBiquadFilter();ff.type='lowpass';ff.frequency.value=700;const fg=ac.createGain();fg.gain.value=0;f.connect(ff);ff.connect(fg);fg.connect(out);S0.fg=fg;
  S0.nextBird=ac.currentTime+2;S0.nextStep=0;S0.nextCrack=0;}
function chirp(S0,pan){const ac=S0.ac,t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain(),p=ac.createStereoPanner?ac.createStereoPanner():null;const n=2+Math.floor(Math.random()*4),base=2400+Math.random()*2200;
  o.type='sine';g.gain.value=0;for(let i=0;i<n;i++){const tt=t+i*.11;o.frequency.setValueAtTime(base,tt);o.frequency.exponentialRampToValueAtTime(base*(1.3+Math.random()*.5),tt+.06);g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(.05,tt+.015);g.gain.linearRampToValueAtTime(0,tt+.08);}
  o.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(S0.out);}else g.connect(S0.out);o.start(t);o.stop(t+n*.11+.1);}
function blip(S0,freq,dur,vol,type,q){const ac=S0.ac,t=ac.currentTime,s=ac.createBufferSource();s.buffer=S0.wh;const f=ac.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;if(q)f.Q.value=q;const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(S0.out);s.start(t,Math.random()*1.5);s.stop(t+dur+.02);}
function sndUpdate(dt,moving){if(!W.snd){if(DW.soundOn()&&W.av&&!W.ch)sndInit();return;}const S0=W.snd,ac=S0.ac,t=ac.currentTime;if(ac.state==='suspended')return;
  const on=DW.soundOn()&&!document.body.classList.contains('menuOver')&&!document.hidden?1:0;S0.out.gain.value+=(on*.9-S0.out.gain.value)*Math.min(1,dt*2);if(!on)return;
  const night=W.tod&&W.tod.night,inH=!!W.inHut,P=W.av?W.av.position:{x:0,z:0};
  S0.wg.gain.value=(inH?.04:.11)*(1+.5*Math.sin(t*.13)*Math.sin(t*.07));S0.wf.frequency.value=inH?220:300+180*Math.sin(t*.09);
  const G=RPOS.garten.c,dp=Math.hypot(P.x-(G[0]-1),P.z-G[1]);S0.qg.gain.value=inH?0:Math.max(0,.07*(1-dp/11));
  S0.cg.gain.value=night&&!W.se.winter&&W.weather!=='regen'?(inH?.004:.012):0;if(W.weather==='regen'){S0.qg.gain.value=Math.max(S0.qg.gain.value,inH?.05:.11);}
  const K=RPOS.kueche.c,dk=Math.hypot(P.x-K[0],P.z-K[1]);S0.fg.gain.value=Math.max(0,.05*(1-dk/6));if(dk<5&&t>S0.nextCrack){blip(S0,2500+Math.random()*2000,.04,.12*(1-dk/5),'highpass');S0.nextCrack=t+.08+Math.random()*.5;}
  if(!night&&!W.se.winter&&W.weather!=='regen'&&t>S0.nextBird){chirp(S0,Math.random()*2-1);S0.nextBird=t+(inH?6:1.5)+Math.random()*(inH?8:4);}
  if(moving&&t>S0.nextStep){if(inH)blip(S0,500,.09,.25,'lowpass');else blip(S0,2600,.07,.18,'bandpass',.7);S0.nextStep=t+(W.run?.29:.42);}}
/* ---------- Markt, Münzen, Einrichten ---------- */
const SLOTS={z1:{n:'Zelle · beim Fenster',room:'zelle',u:.9,v:-2.6},z2:{n:'Zelle · neben der Tür',room:'zelle',u:2.0,v:1.3},z3:{n:'Zelle · hinten',room:'zelle',u:-.4,v:-2.7},z4:{n:'Zelle · am Kleiderständer',room:'zelle',u:.9,v:2.4},
  h1:{n:'Hof · links am Weg',x:-7.3,z:12.5},h2:{n:'Hof · rechts am Weg',x:7.3,z:12.5},
  g1:{n:'Garten · am Teich',x:-9.6,z:9.8,g:1},g2:{n:'Garten · links',x:-14.6,z:9.4,g:1},g3:{n:'Garten · hinten',x:-9.3,z:14.8,g:1},g4:{n:'Garten · Ecke',x:-14.8,z:14.8,g:1}};
function slotOk(s){return !SLOTS[s].g||(DW.rooms().find(r=>r.id==='garten')||{}).open;}
function slotPos(id){const S0=SLOTS[id];if(S0.room){const P=RPOS[S0.room];return[P.c[0]+P.f[0]*S0.u,.35,P.c[1]+S0.v];}return[S0.x,groundH(S0.x,S0.z),S0.z];}
function decorPlace(){if(!W||W.ch)return;if(W.decorG){W.root.remove(W.decorG);W.solids=W.solids.filter(x=>!x.deco);(W.imps||[]).filter(i=>i.deco).forEach(i=>i.m.visible=false);}const g=new TH.Group();W.decorG=g;W.root.add(g);
  const D=DW.decor();Object.entries(D).forEach(([sl,k],i)=>{if(!SLOTS[sl])return;const[x,y,z]=slotPos(sl),t=DW.itemType(k);const sv=W.solids.length;
    const root0=W.root;W.root=g;
    try{if(t==='plant'){W.put&&W.put('planter_pot_clay',x,y,z,i,1.9);W.root=root0;imp('bush_c',x,z,1.05,i*.31+.2);const it=W.imps[W.imps.length-1];it.m.position.y=y+.36;it.deco=1;W.solids.push(Object.assign([x,z,.3],{deco:1}));}
      else if(t==='lantern'){const st=W.M.stone;cyl(.16,.5,st,x,y,z,8,.22);box(.42,.08,.42,st,x,y+.5,z,1);lantern(x,y+.8,z,true);const cap=new TH.Mesh(new TH.ConeGeometry(.38,.3,4),st);cap.position.set(x,y+1.15,z);cap.rotation.y=Math.PI/4;g.add(cap);W.solids.push(Object.assign([x,z,.35],{deco:1}));}
      else if(W.put){const o=W.put(k,x,y,z,i*.7);if(o)W.solids.push(Object.assign([x,z,.3],{deco:1}));}}finally{W.root=root0;}
  });}
function thumb(k){W.thumbs=W.thumbs||{};if(W.thumbs[k])return W.thumbs[k];const t=DW.itemType(k);
  const icon={plant:'<svg viewBox="0 0 64 64"><path d="M20 40h24l-3 16H23z" fill="#b5653a"/><circle cx="32" cy="28" r="12" fill="#3f6a2e"/><circle cx="24" cy="32" r="8" fill="#4f7a36"/><circle cx="40" cy="32" r="8" fill="#355e26"/></svg>',
    lantern:'<svg viewBox="0 0 64 64"><path d="M30 44h4v14h-4z" fill="#8a8580"/><path d="M18 22h28l-14-10z" fill="#8a8580"/><rect x="22" y="22" width="20" height="18" rx="4" fill="#f2c96a"/><rect x="22" y="40" width="20" height="4" fill="#8a8580"/></svg>',
    food:'<svg viewBox="0 0 64 64"><ellipse cx="32" cy="34" rx="18" ry="9" fill="#f27a2a"/><path d="M14 34l-8-7v14z" fill="#f27a2a"/><circle cx="44" cy="32" r="2" fill="#111"/><circle cx="20" cy="50" r="3" fill="#c9a45a"/><circle cx="30" cy="54" r="3" fill="#c9a45a"/></svg>',
    robe:'<svg viewBox="0 0 64 64"><path d="M22 10l10 8 10-8 12 10-6 8-4-3v31H20V25l-4 3-6-8z" fill="#8a3a2a"/><path d="M32 18v38" stroke="#2a1a14" stroke-width="2"/></svg>'}[t];
  if(icon)return W.thumbs[k]='data:image/svg+xml;utf8,'+encodeURIComponent(icon.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));
  const gl=window._propsGL;if(!gl)return '';let src=null;gl.scene.traverse(o=>{if(!src&&o.name===k)src=o;});if(!src)return '';
  if(!W.tr){W.tr=new TH.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});W.tr.setSize(160,160);W.tr.outputEncoding=TH.sRGBEncoding;W.ts=new TH.Scene();W.ts.add(new TH.HemisphereLight(0xffffff,0x554433,1.1));const dl=new TH.DirectionalLight(0xfff0dd,1.6);dl.position.set(2,3,2);W.ts.add(dl);W.tc=new TH.PerspectiveCamera(30,1,.01,50);}
  const o=src.clone();o.position.set(0,0,0);W.ts.add(o);const bb=new TH.Box3().setFromObject(o),c=bb.getCenter(new TH.Vector3()),sz=bb.getSize(new TH.Vector3()).length();
  W.tc.position.set(c.x+sz*.9,c.y+sz*.75,c.z+sz*1.25);W.tc.lookAt(c);W.tr.render(W.ts,W.tc);const url=W.tr.domElement.toDataURL();W.ts.remove(o);return W.thumbs[k]=url;}
function ovl(id,html){let o=$('#'+id);if(!o){o=document.createElement('div');o.id=id;o.className='w-steps w-mkt';$('#world').appendChild(o);}o.innerHTML=html;o.hidden=false;o.onclick=e=>{if(e.target===o)o.hidden=true;};return o;}
function market(){const M=DW.market(),c=DW.coins();
  const o=ovl('wMkt',`<div><div class="mh"><div><h3>Markt im Dorf</h3><p>Das Angebot wechselt jeden Tag.</p></div><span class="coin">${c} Kupfer</span></div><div class="mg">${M.map(m=>`<button class="mc" data-k="${m.k}" ${m.own||c<m.p?'disabled':''}><img src="${thumb(m.k)}" alt=""><b>${m.n}</b><small>${m.own?'Besitzt du':m.p+' Kupfer'}</small></button>`).join('')}</div><p class="mf">Kupfer verdienst du, wenn du dem Dorf hilfst, für vollendete Tage und Wochen und für die Wochenprüfung im Dojo.</p><div class="row"><button class="btn" data-x>Schliessen</button></div></div>`);
  o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};
  o.querySelectorAll('.mc').forEach(b=>b.onclick=()=>{const m=DW.buy(b.dataset.k);if(!m)return;DW.bell(1);o.hidden=true;
    if(m.t==='robe'){msg(`${m.n} gehört jetzt dir. Wechseln kannst du sie im Avatar-Editor.`);}
    else if(m.t==='food'){msg('Koi-Futter gekauft. Füttere die Koi am Teich im Garten.');}
    else{slotPick(m.k,`${m.n} gekauft. Wo soll es stehen?`);}ptsHud();});}
function slotPick(k,title){const D=DW.decor();const tt=DW.itemType(k),free=Object.keys(SLOTS).filter(s=>slotOk(s)&&(tt==='lantern'?!SLOTS[s].room:true));
  const o=ovl('wSlot',`<div><h3>${title}</h3><p>Wähle einen Platz. Besetzte Plätze tauschen den Gegenstand aus.</p><div class="sl">${free.map(s=>`<button class="btn" data-s="${s}">${SLOTS[s].n}${D[s]?` <small>(${DW.itemName(D[s])})</small>`:''}</button>`).join('')}</div><div class="row"><button class="btn" data-x>Später</button></div></div>`);
  o.querySelector('[data-x]').onclick=()=>{o.hidden=true;msg('Liegt in deinem Lager. Aufstellen kannst du es in der Zelle oder im Garten unter «Einrichten».');};
  o.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{DW.place(b.dataset.s,k);o.hidden=true;decorPlace();DW.bell(.9);const[x,,z]=slotPos(b.dataset.s);msg(`Aufgestellt: ${SLOTS[b.dataset.s].n}`);});}
function furnishUI(room){const D=DW.decor(),items=DW.items(),mine=Object.keys(SLOTS).filter(slotOk);
  const o=ovl('wFur',`<div><h3>Einrichten</h3><p>Deine Plätze hier und was in deinem Lager liegt.</p><div class="sl">${mine.map(s=>`<div class="fr"><span>${SLOTS[s].n}<small>${D[s]?DW.itemName(D[s]):'leer'}</small></span>${D[s]?`<button class="btn" data-u="${s}">Wegräumen</button>`:''}</div>`).join('')}</div>
    <h3 style="margin-top:14px;font-size:15px">Lager</h3><div class="mg">${items.length?items.map((k,i)=>`<button class="mc" data-i="${k}"><img src="${thumb(k)}" alt=""><b>${DW.itemName(k)}</b><small>Aufstellen</small></button>`).join(''):'<p>Leer. Neues gibt es auf dem Markt im Dorf.</p>'}</div><div class="row"><button class="btn" data-x>Fertig</button></div></div>`);
  o.querySelector('[data-x]').onclick=()=>{o.hidden=true;};
  o.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{DW.unplace(b.dataset.u);decorPlace();furnishUI(room);});
  o.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{o.hidden=true;slotPick(b.dataset.i,`${DW.itemName(b.dataset.i)} aufstellen`);});}
/* ---------- Echte Objekte (Poly Haven, CC0) ---------- */
function stall(x,z){const M=W.M,wood=M.wood;[[-1.1,-.5],[1.1,-.5],[-1.1,.5],[1.1,.5]].forEach(([a,b])=>cyl(.05,2.2,wood,x+b,0,z+a,6));
  box(1.0,.85,2.3,new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#6a4a30',roughness:.85}),x,0,z,1);
  const cv=document.createElement('canvas');cv.width=64;cv.height=8;const c=cv.getContext('2d');for(let i=0;i<8;i++){c.fillStyle=i%2?'#efe2c4':'#a8322a';c.fillRect(i*8,0,8,8);}const tx=new TH.CanvasTexture(cv);tx.wrapS=TH.RepeatWrapping;tx.repeat.set(2,1);
  const aw=new TH.Mesh(new TH.PlaneGeometry(2.6,1.5),new TH.MeshStandardMaterial({map:tx,side:TH.DoubleSide,roughness:1}));aw.rotation.set(-Math.PI/2+.35,0,Math.PI/2);aw.rotation.order='YXZ';aw.rotation.set(-Math.PI/2+.35,Math.PI/2,0);aw.position.set(x+.15,2.25,z);aw.castShadow=true;W.root.add(aw);
  const sg=document.createElement('canvas');sg.width=256;sg.height=64;const g=sg.getContext('2d');g.fillStyle='#2a1a12';g.fillRect(0,0,256,64);g.fillStyle='#f2d48a';g.font='bold 34px serif';g.textAlign='center';g.fillText('MARKT',128,44);
  const sign=new TH.Mesh(new TH.PlaneGeometry(1.1,.28),new TH.MeshStandardMaterial({map:new TH.CanvasTexture(sg),roughness:.8}));sign.position.set(x+.56,1.55,z);sign.rotation.y=Math.PI/2;W.root.add(sign);
  W.solids.push([x,z-.7,.6],[x,z+.7,.6]);W.stallAt=[x,z];
  W.inter.push({x:x+1.3,z,r:1.7,label:'Marktstand',btn:'Ansehen',act:()=>market()});}
function props(){if(W.ch||!TH.GLTFLoader)return;const go=gl=>{if(!W)return;const L={};gl.scene.traverse(o=>{if(o.isMesh||o.isObject3D&&o.parent===gl.scene)L[o.name]=L[o.name]||o;});
  const at=(room,u,v)=>{const P=RPOS[room];return[P.c[0]+P.f[0]*u,P.c[1]+v];},open=DW.rooms().reduce((a,r)=>(a[r.id]=r.open,a),{});
  const PR={wooden_bookshelf_worn:.6,wooden_stool_02:.25,ceramic_pot:.42,wicker_basket_01:.25,wooden_bucket_01:.25,antique_ceramic_vase_01:.2,chinese_stool:.35,chinese_tea_table:.5,planter_pot_clay:.25};const put=(k,x,y,z,ry,s)=>{const src=L[k];if(!src)return;if(PR[k]&&y<.4)W.solids.push([x,z,PR[k]*(s||1)]);const o=src.clone();o.position.set(x,y,z);o.rotation.set(0,ry||0,0);if(s)o.scale.setScalar(s);o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});W.root.add(o);return o;};
  const room=(r,list)=>{if(!open[r])return;const f=RPOS[r].f[0];list.forEach(([k,u,v,y,ry,s])=>{const[x,z]=at(r,u,v);put(k,x,.35+y,z,(ry||0)*(f>0?1:-1)+(f<0?Math.PI:0),s);});};
  room('kueche',[['ceramic_pot',-1.5,0,.9,0,.62],['brass_pan_01',-1.5,.42,.9,-1.2],['brass_pot_02',-1.5,-.35,.9,0],['wooden_bowl_01',.35,1.05,.75,0],['carved_wooden_plate',.25,2.05,.75,0],['ceramic_pot',1.85,-2.55,0,.4],['wicker_basket_01',-.9,-2.7,0,.3],['wooden_bucket_01',-.6,.95,0,0]].concat(W.teaReward?[['tea_set_01',.3,1.65,.75,Math.PI/2]]:[]));
  room('zelle',[['wooden_candlestick',-1.5,.6,.5,0]]);
  room('bibliothek',[['chinese_tea_table',1.1,1.5,0,0],['brass_vase_03',1.1,1.5,.5,0,1.4],['brass_candleholders',-.5,-2.75,0,0],['wooden_candlestick',.4,.35,.75,0]]);
  room('bad',[['wooden_bucket_01',-.6,1.35,0,0],['wooden_stool_02',-.5,.95,0,0,1.6],['wooden_bowl_01',-.95,1.35,0,0]]);
  if(open.bibliothek&&L.wooden_bookshelf_worn){(W.libPrim||[]).forEach(m=>m.visible=false);const P=RPOS.bibliothek,f=P.f[0],ry=f>0?Math.PI/2:-Math.PI/2;
    [-1.55,0,1.55].forEach((v,i)=>{const x=P.c[0]+f*(-1.62),z=P.c[1]+v;put('wooden_bookshelf_worn',x,.35,z,ry);[.11,.39,.67,.96,1.28].forEach((h,k)=>[-.31,.31].forEach((o,j)=>{if((i+k+j)%5===4)return;const bk=put('book_encyclopedia_set_01',x+f*.04-(f>0?0:0),.35+h+.005,z+o*(f>0?-1:1),ry+((i+k+j)%3===0?Math.PI:0));if(bk){const sx=(i+k+j)%3===0?1:-1;bk.position.z+=-.27*(f>0?1:-1)*sx;bk.position.x+=f*.02;}}));});}
  (W.plantSpots||[]).forEach(([x,z],i)=>{put('planter_pot_clay',x,.35,z,i,1.9);imp('bush_c',x,z,1.05,i*.31+.2);const it=W.imps[W.imps.length-1];it.m.position.y=.35+.36;W.solids.push([x,z,.3]);});
  const G=RPOS.garten.c;[[2.6,1.2],[2.9,2],[-3.2,-1.8]].forEach(([a,b],i)=>put('planter_pot_clay',G[0]+a,0,G[1]+b,i,1.6+i*.3));
  if(W.stallAt){const[sx,sz]=W.stallAt;put('ceramic_pot',sx,.85,sz-.75,0,.5);put('wicker_basket_01',sx,.85,sz-.1,.4);put('tea_set_01',sx+.05,.85,sz+.55,Math.PI/2,.8);put('brass_pot_02',sx-.25,.85,sz+.2,0);}
  put('wooden_broom',2.7,0,24.9,0,1).rotation.z=.25;put('brass_vase_03',0,0,4.6,0,3.2);
  W.put=put;W.propsOk=1;decorPlace();};
  if(window._propsGL)go(window._propsGL);else new TH.GLTFLoader().load('props.glb',gl=>{window._propsGL=gl;go(gl);},undefined,e=>console.warn('props',e));}
/* ---------- Leben & Details ---------- */
function softTex(){if(W.softT)return W.softT;const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);W.softT=new TH.CanvasTexture(cv);return W.softT;}
function paintTex(kind){const cv=document.createElement('canvas');cv.width=128;cv.height=256;const x=cv.getContext('2d');
  x.fillStyle='#efe6d0';x.fillRect(0,0,128,256);x.fillStyle='#6b3a24';x.fillRect(0,0,128,10);x.fillRect(0,246,128,10);
  if(kind==='enso'){x.strokeStyle='rgba(20,18,16,.9)';x.lineCap='round';for(let i=0;i<46;i++){const a=-1+i*.12,w=10*Math.sin(Math.PI*i/46)+2;x.lineWidth=w;x.beginPath();x.arc(64,118,38,a,a+.14);x.stroke();}x.fillStyle='#b8322a';x.fillRect(84,196,14,14);}
  else{const g=x.createLinearGradient(0,40,0,220);g.addColorStop(0,'#efe6d0');g.addColorStop(1,'#d9cfb6');x.fillStyle=g;x.fillRect(0,12,128,232);
    [[.35,'rgba(60,58,55,.35)',150],[.55,'rgba(40,38,36,.55)',175],[.8,'rgba(25,24,22,.8)',205]].forEach(([s,c,b],k)=>{x.fillStyle=c;x.beginPath();x.moveTo(0,b);for(let i=0;i<=8;i++){const px=i*16,py=b-Math.abs(Math.sin(i*1.7+k*2))*60*s-20*s;x.lineTo(px,py);}x.lineTo(128,b+40);x.lineTo(0,b+40);x.fill();});
    x.fillStyle='#b8322a';x.beginPath();x.arc(92,52,9,0,6.3);x.fill();}
  const t=new TH.CanvasTexture(cv);t.encoding=TH.sRGBEncoding;return t;}
function bush(x,z,s){const r=rng(Math.abs(x*13.7+z*7.3)*100+1)();const k=s<.6?'bush_c':r<.45?'bush_a':r<.8?'bush_b':'bush_c';const h={bush_a:2.4,bush_b:2.05,bush_c:1.5}[k]*Math.max(.55,s)*.8;imp(k,x,z,h,r,Math.min(.6,.4*s));}
function flowerBed(x,z,w,d,cols,n){const pos=[],col=[],c=new TH.Color(),r=rng(x*3+z*11);for(let i=0;i<n;i++){const px=x+(r()-.5)*w,pz=z+(r()-.5)*d;pos.push(px,groundH(px,pz)+.12+r()*.18,pz);c.set(cols[Math.floor(r()*cols.length)]);col.push(c.r,c.g,c.b);}
  const g=new TH.BufferGeometry();g.setAttribute('position',new TH.Float32BufferAttribute(pos,3));g.setAttribute('color',new TH.Float32BufferAttribute(col,3));W.root.add(new TH.Points(g,new TH.PointsMaterial({size:.22,vertexColors:true,map:softTex(),transparent:true,alphaTest:.3,depthWrite:false})));
  bush(x,z,Math.min(w,d)*.35);}
function bambooLeafTex(){if(W.bLT)return W.bLT;const cv=document.createElement('canvas');cv.width=128;cv.height=128;const x=cv.getContext('2d');
  for(let k=0;k<7;k++){const a=-1.1+k*.36,l=48+Math.random()*12;x.save();x.translate(64,118);x.rotate(a);const gr=x.createLinearGradient(0,0,0,-l);gr.addColorStop(0,'#2e4a1a');gr.addColorStop(1,'#5e8a32');x.fillStyle=gr;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(7,-l*.5,0,-l);x.quadraticCurveTo(-7,-l*.5,0,0);x.fill();x.strokeStyle='rgba(30,50,15,.6)';x.lineWidth=1;x.beginPath();x.moveTo(0,0);x.lineTo(0,-l);x.stroke();x.restore();}
  const t=new TH.CanvasTexture(cv);t.encoding=TH.sRGBEncoding;return W.bLT=t;}
function bamboo(cx,cz,n,rad){const r=rng(cx*5+cz);const cv=document.createElement('canvas');cv.width=8;cv.height=64;const c=cv.getContext('2d');const gr=c.createLinearGradient(0,0,8,0);gr.addColorStop(0,'#4a5a28');gr.addColorStop(.5,'#8a9a52');gr.addColorStop(1,'#3e4e22');c.fillStyle=gr;c.fillRect(0,0,8,64);c.fillStyle='rgba(40,50,20,.9)';c.fillRect(0,0,8,3);c.fillStyle='rgba(200,210,150,.5)';c.fillRect(0,3,8,1);
  const st=new TH.CanvasTexture(cv);st.wrapT=TH.RepeatWrapping;st.repeat.set(1,7);const stem=new TH.MeshStandardMaterial({map:st,roughness:.55}),leafM=new TH.MeshStandardMaterial({map:bambooLeafTex(),alphaTest:.45,transparent:false,side:TH.DoubleSide,roughness:.85});
  const sg=new TH.CylinderGeometry(.035,.045,1,7),lg=new TH.PlaneGeometry(.75,.75);lg.translate(0,.33,0);const S=new TH.InstancedMesh(sg,stem,n),L=new TH.InstancedMesh(lg,leafM,n*10);const m=new TH.Matrix4(),q=new TH.Quaternion(),e=new TH.Euler(),sc=new TH.Vector3(),p=new TH.Vector3();let li=0;
  for(let i=0;i<n;i++){const a=r()*6.28,d=Math.sqrt(r())*rad,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d,h=4.5+r()*3.5,y0=groundH(x,z),lx=(r()-.5)*.1,lz=(r()-.5)*.1;e.set(lx,0,lz);q.setFromEuler(e);sc.set(1,h,1);p.set(x+lz*h*.5,y0+h/2,z-lx*h*.5);m.compose(p,q,sc);S.setMatrixAt(i,m);
    for(let k=0;k<10;k++){const t=.5+r()*.5,ly=y0+h*t;e.set(-.3-r()*.9,r()*6.28,(r()-.5)*.5,'YXZ');q.setFromEuler(e);const s2=.7+r()*.6;sc.set(s2,s2,s2);p.set(x+lz*h*t,ly,z-lx*h*t);m.compose(p,q,sc);L.setMatrixAt(li++,m);}W.solids.push([x,z,.12]);}
  S.castShadow=L.castShadow=true;S.receiveShadow=true;W.root.add(S,L);W.bambooL=L;}
function decorRoom(id,cx,cz,fx,ew,ed,y){const M=W.M,P=(u,v)=>[cx+fx*u,cz+v];const darkW=new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#5a3e2a',roughness:.8});
  const rugC={zelle:'#4a1a14',kueche:'#3a3822',bibliothek:'#1a2638',bad:'#22382f'}[id];
  {const rug=new TH.Mesh(new TH.PlaneGeometry(fx?2:3,fx?3:2),new TH.MeshStandardMaterial({color:rugC,roughness:1}));rug.rotation.x=-Math.PI/2;const[x,z]=P(.4,0);rug.position.set(x,y+.015,z);rug.receiveShadow=true;W.root.add(rug);
   const bd=new TH.Mesh(new TH.PlaneGeometry(fx?2.15:3.15,fx?3.15:2.15),new TH.MeshStandardMaterial({color:'#c9a45a',roughness:1}));bd.rotation.x=-Math.PI/2;bd.position.set(x,y+.012,z);W.root.add(bd);}
  // Papierlaterne an der Decke (Lichtquelle sichtbar)
  {const l=new TH.Mesh(new TH.CylinderGeometry(.15,.15,.3,14),M.paper);l.position.set(cx,y+2.3,cz);W.root.add(l);cyl(.01,.3,M.wood,cx,y+2.46,cz,4);}
  // Rollbild an der Seitenwand
  {const t=paintTex(id==='zelle'||id==='bad'?'enso':'mount');const sc=new TH.Mesh(new TH.PlaneGeometry(.62,1.24),new TH.MeshStandardMaterial({map:t,roughness:.9}));const[x,z]=P(.1,ed/2-.15);sc.position.set(x,y+1.55,z);sc.rotation.y=Math.PI;W.root.add(sc);
   const rod=new TH.Mesh(new TH.CylinderGeometry(.025,.025,.74,8),darkW);rod.rotation.z=Math.PI/2;rod.position.set(x,y+.92,z-.01);W.root.add(rod);}
  W.plantSpots=W.plantSpots||[];W.plantSpots.push(P(ew/2-.55,ed/2-.55));
  // Kerzen
  {const[x,z]=P(-ew/2+.45,ed/2-.45);[[0,0,.22],[.14,.08,.15],[-.1,.12,.1]].forEach(([a,b,h])=>{cyl(.04,h,new TH.MeshStandardMaterial({color:'#efe6d2',roughness:.6}),x+a,y,z+b,8);const fl=new TH.Mesh(new TH.SphereGeometry(.022,6,4),M.glow);fl.scale.y=1.6;fl.position.set(x+a,y+h+.03,z+b);W.root.add(fl);(W.flames=W.flames||[]).push(fl);});}
  // Sitzkissen
  {const[x,z]=P(.9,-1.6);const c=box(.6,.1,.6,new TH.MeshStandardMaterial({color:'#8a3a2a',roughness:1}),x,y,z,1);}
  if(id==='zelle'){const[x,z]=P(-.2,ed/2-.35);const rack=box(1,.05,.05,darkW,x,y+1.5,z,1);[-.45,.45].forEach(o=>cyl(.03,1.5,darkW,x+o,y,z,6));const robe=new TH.Mesh(new TH.PlaneGeometry(.7,1),new TH.MeshStandardMaterial({color:'#c98a2a',side:TH.DoubleSide,roughness:1}));robe.position.set(x,y+.98,z+.02);W.root.add(robe);
    const[sx,sz]=P(1.6,ed/2-.5);[-.08,.08].forEach(o=>box(.1,.03,.25,darkW,sx+o,y,sz,1));}
  if(id==='kueche'){const[x,z]=P(-ew/2+.5,-ed/2+.6);for(let i=0;i<9;i++){const lg=cyl(.07,.7,new TH.MeshStandardMaterial({color:'#6a4a2e',roughness:1}),x+(i%3)*.16-.16,y+.08+Math.floor(i/3)*.14,z,6);lg.rotation.x=Math.PI/2;lg.position.y=y+.08+Math.floor(i/3)*.14;}
    const[hx,hz]=P(.2,-ed/2+.25);for(let i=0;i<5;i++){const hb=new TH.Mesh(new TH.ConeGeometry(.07,.3,6),new TH.MeshStandardMaterial({color:i%2?'#6a7a3a':'#a8a07a',roughness:1}));hb.rotation.x=Math.PI;hb.position.set(hx-.5+i*.25,y+2,hz);W.root.add(hb);}box(1.4,.04,.04,darkW,hx,y+2.15,hz,1);
    const[bx,bz]=P(1.6,-ed/2+.6);[0,.3].forEach(o=>{const s=new TH.Mesh(new TH.SphereGeometry(.2,10,8),new TH.MeshStandardMaterial({color:'#8a7650',roughness:1}));s.scale.y=1.25;s.position.set(bx+o*.9,y+.24,bz);W.root.add(s);});
}
  if(id==='bibliothek'){const[x,z]=P(.4,0);const ink=box(.18,.04,.12,new TH.MeshStandardMaterial({color:'#111'}),x,y+.75,z+.35,1);cyl(.012,.25,darkW,x+.05,y+.79,z+.5,6).rotation.z=1.4;
    const[gx,gz]=P(1.5,ed/2-.6);for(let i=0;i<3;i++){const bk=cyl(.25,.4,new TH.MeshStandardMaterial({color:'#9a7a4a',roughness:1}),gx-i*.55,y,gz,10,.2);for(let k=0;k<4;k++){const s=new TH.Mesh(new TH.CylinderGeometry(.035,.035,.5,6),new TH.MeshStandardMaterial({color:'#e8dcc0'}));s.rotation.x=.3*(k-1.5);s.position.set(gx-i*.55+(k-1.5)*.08,y+.5,gz);W.root.add(s);}}}
  if(id==='bad'){const[x,z]=P(1.4,ed/2-.4);box(.8,.05,.05,darkW,x,y+1.1,z,1);[-.38,.38].forEach(o=>cyl(.025,1.1,darkW,x+o,y,z,6));const tw=new TH.Mesh(new TH.PlaneGeometry(.5,.6),new TH.MeshStandardMaterial({color:'#e9e6dc',side:TH.DoubleSide}));tw.position.set(x,y+.82,z+.02);W.root.add(tw);
    const st=new TH.Mesh(new TH.PlaneGeometry(1.4,1.2),new TH.MeshBasicMaterial({map:softTex(),color:0xffffff,transparent:true,opacity:.14,depthWrite:false}));const[tx,tz]=P(-ew/2+1.1,0);st.position.set(tx,y+1.2,tz);W.root.add(st);(W.steams=W.steams||[]).push(st);
    for(let i=0;i<5;i++){const r=new TH.Mesh(new TH.DodecahedronGeometry(.1+i*.02,0),M.stone);const[a,b]=P(-ew/2+.4,-ed/2+.4+i*.22);r.position.set(a,y+.06,b);W.root.add(r);}}
}
function koiTex(kind){const cv=document.createElement('canvas');cv.width=256;cv.height=128;const x=cv.getContext('2d');const base={kohaku:'#f4f1ea',sanke:'#f4f1ea',showa:'#1a1816',ogon:'#e8b84a',chagoi:'#b8743a'}[kind];x.fillStyle=base;x.fillRect(0,0,256,128);
  const blob=(col,n,rmin,rmax,top)=>{x.fillStyle=col;for(let i=0;i<n;i++){const u=top?(Math.random()<.5?Math.random()*60:196+Math.random()*60):Math.random()*256,v=14+Math.random()*96,r=rmin+Math.random()*(rmax-rmin);x.beginPath();x.ellipse(u,v,r*1.4,r,Math.random(),0,6.3);x.fill();if(u<40){x.beginPath();x.ellipse(u+256,v,r*1.4,r,0,0,6.3);x.fill();}if(u>216){x.beginPath();x.ellipse(u-256,v,r*1.4,r,0,0,6.3);x.fill();}}};
  if(kind==='kohaku')blob('#d8381e',7,12,26,true);if(kind==='sanke'){blob('#d8381e',6,12,24,true);blob('#141210',8,4,9,true);}if(kind==='showa'){blob('#e04a1e',6,12,22,true);blob('#f4f1ea',5,8,16,false);}
  if(kind==='ogon'){const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(255,240,180,.5)');g.addColorStop(1,'rgba(160,100,20,.3)');x.fillStyle=g;x.fillRect(0,0,256,128);}
  if(kind==='chagoi')blob('rgba(90,50,20,.35)',30,3,6,false);
  // Bauch hell
  const bg=x.createLinearGradient(80,0,176,0);bg.addColorStop(0,'rgba(255,255,255,0)');bg.addColorStop(.5,kind==='showa'?'rgba(240,236,228,.6)':'rgba(255,255,255,.55)');bg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=bg;x.fillRect(80,0,96,128);
  // Schuppen
  x.strokeStyle='rgba(0,0,0,.07)';for(let v=6;v<128;v+=7)for(let u=(v%14?0:4);u<256;u+=8){x.beginPath();x.arc(u,v,4,.2,2.9);x.stroke();}
  const t=new TH.CanvasTexture(cv);t.encoding=TH.sRGBEncoding;return t;}
function finMat(col){return new TH.MeshStandardMaterial({color:col,transparent:true,opacity:.72,side:TH.DoubleSide,roughness:.4,depthWrite:false});}
function koiFish(kind,L){const g=new TH.Group();const pr=[[0,.5],[.07,.46],[.12,.36],[.145,.18],[.14,0],[.115,-.18],[.07,-.34],[.035,-.44],[.02,-.5]].map(p=>new TH.Vector2(p[0]*L,p[1]*L));
  const body=new TH.Mesh(new TH.LatheGeometry(pr,18),new TH.MeshStandardMaterial({map:koiTex(kind),roughness:.35,metalness:.05}));body.rotation.x=Math.PI/2;body.scale.set(.9,1,.8);g.add(body);
  const fc={kohaku:'#f2e8e0',sanke:'#f2e8e0',showa:'#2a2420',ogon:'#f2c86a',chagoi:'#c8844a'}[kind];
  const ts=new TH.Shape();ts.moveTo(0,0);ts.quadraticCurveTo(L*.12,L*.1,L*.22,L*.14);ts.quadraticCurveTo(L*.16,0,L*.22,-L*.14);ts.quadraticCurveTo(L*.12,-L*.1,0,0);
  const tail=new TH.Group();const tm=new TH.Mesh(new TH.ShapeGeometry(ts),finMat(fc));tm.rotation.set(0,Math.PI/2,Math.PI/2);tail.add(tm);tail.position.z=-L*.48;g.add(tail);
  const ds=new TH.Shape();ds.moveTo(0,0);ds.lineTo(L*.32,0);ds.quadraticCurveTo(L*.12,L*.08,0,L*.07);const dor=new TH.Mesh(new TH.ShapeGeometry(ds),finMat(fc));dor.rotation.y=Math.PI/2;dor.position.set(0,L*.075,L*.12);g.add(dor);
  const ps=new TH.Shape();ps.moveTo(0,0);ps.quadraticCurveTo(L*.1,L*.02,L*.13,L*.08);ps.quadraticCurveTo(L*.04,L*.06,0,0);const pecs=[-1,1].map(sd=>{const m=new TH.Mesh(new TH.ShapeGeometry(ps),finMat(fc));m.rotation.set(Math.PI/2,0,sd>0?-.4:Math.PI+.4);m.position.set(sd*L*.07,-L*.03,L*.22);g.add(m);return m;});
  g.userData={tail,pecs,L};g.traverse(o=>{if(o.isMesh)o.castShadow=false;});return g;}
function padTex(){if(W.padT)return W.padT;const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');
  const g=x.createRadialGradient(128,128,10,128,128,128);g.addColorStop(0,'#5a8a3a');g.addColorStop(.7,'#3d6e2a');g.addColorStop(1,'#2a4e1c');x.fillStyle=g;x.beginPath();x.arc(128,128,126,0,6.3);x.fill();
  x.strokeStyle='rgba(170,200,110,.35)';x.lineWidth=2;for(let i=0;i<22;i++){const a=i/22*6.28;x.beginPath();x.moveTo(128,128);x.quadraticCurveTo(128+Math.cos(a+.15)*70,128+Math.sin(a+.15)*70,128+Math.cos(a)*122,128+Math.sin(a)*122);x.stroke();}
  for(let i=0;i<40;i++){x.fillStyle=`rgba(${Math.random()<.5?'140,90,40':'200,220,120'},${.08+Math.random()*.12})`;x.beginPath();x.arc(30+Math.random()*196,30+Math.random()*196,3+Math.random()*10,0,6.3);x.fill();}
  x.strokeStyle='#7a5a2a';x.lineWidth=3;x.beginPath();x.arc(128,128,124,0,6.3);x.stroke();
  const t=new TH.CanvasTexture(cv);t.encoding=TH.sRGBEncoding;return W.padT=t;}
function lilyFlower(col){const g=new TH.Group();const pg=new TH.SphereGeometry(.05,10,6,0,Math.PI*.55,0,Math.PI/2);
  const mOut=new TH.MeshStandardMaterial({color:col,roughness:.5,side:TH.DoubleSide}),mIn=new TH.MeshStandardMaterial({color:new TH.Color(col).lerp(new TH.Color('#ffffff'),.45),roughness:.5,side:TH.DoubleSide});
  [[10,.75,mOut,.95],[8,.45,mIn,.7],[6,.2,mIn,.5]].forEach(([n,tilt,m,sc],r)=>{for(let i=0;i<n;i++){const p=new TH.Mesh(pg,m);p.scale.set(.55*sc,1.9*sc,1*sc);const a=i/n*6.28+r*.3;const h=new TH.Group();h.rotation.y=a;p.rotation.set(-tilt,0,0);p.position.z=.012;h.add(p);g.add(h);}});
  const c=new TH.Mesh(new TH.SphereGeometry(.018,8,6),new TH.MeshStandardMaterial({color:'#f2c62a',emissive:'#a87a10',emissiveIntensity:.3}));c.position.y=.02;g.add(c);return g;}
function lilies(cx,cz){const mat=new TH.MeshStandardMaterial({map:padTex(),roughness:.55,metalness:0,side:TH.DoubleSide});const W0=W.lilyPads=[];
  [[.62,.38,.24],[-.52,.72,.2],[.18,-.86,.27],[-.95,-.25,.17],[.95,-.45,.14],[-.15,.2,.12],[.5,.95,.15],[-1.05,.45,.13]].forEach(([a,b,r],i)=>{const gap=.42+Math.random()*.25;
    const geo=new TH.CircleGeometry(r,28,gap/2,6.283-gap);const pos=geo.attributes.position;for(let k=0;k<pos.count;k++){const x=pos.getX(k),y=pos.getY(k),d=Math.hypot(x,y)/r;pos.setZ(k,d>.85?(d-.85)*r*.25:0);}geo.computeVertexNormals();
    const p=new TH.Mesh(geo,mat);p.rotation.x=-Math.PI/2;p.rotation.z=i*2.1;p.position.set(cx+a,.104+i*.0006,cz+b);p.receiveShadow=true;W.root.add(p);W0.push({m:p,o:i,b:p.rotation.z});
    if(i===0||i===2||i===4||i===6){const f=lilyFlower(['#f4a6c2','#fbf6ee','#f08aa8','#fff2d0'][i/2]);f.scale.setScalar(.9+(i%3)*.15);f.position.set(cx+a+r*.2,.11,cz+b-r*.15);W.root.add(f);W0.push({f,o:i});}
    if(i===5){const bud=new TH.Mesh(new TH.SphereGeometry(.03,8,6),new TH.MeshStandardMaterial({color:'#e88aa8'}));bud.scale.y=1.8;bud.position.set(cx+a,.15,cz+b);W.root.add(bud);}});}
function koi(cx,cz){const g=new TH.Group();W.root.add(g);
  for(let i=0;i<16;i++){const a=i/16*6.28,r=new TH.Mesh(new TH.DodecahedronGeometry(.28+((i*7)%3)*.06,0),W.M.stone);r.position.set(cx+Math.cos(a)*1.72,.08,cz+Math.sin(a)*1.72);r.scale.y=.55;r.rotation.y=i;r.castShadow=true;W.root.add(r);}
  const floor=new TH.Mesh(new TH.CircleGeometry(1.62,32),new TH.MeshStandardMaterial({color:'#131c18',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(cx,.012,cz);W.root.add(floor);
  for(let i=0;i<14;i++){const a=Math.random()*6.28,d=Math.random()*1.3,pb=new TH.Mesh(new TH.DodecahedronGeometry(.05+Math.random()*.06,0),W.M.stone);pb.position.set(cx+Math.cos(a)*d,.02,cz+Math.sin(a)*d);pb.scale.y=.4;W.root.add(pb);}
  const water=new TH.Mesh(new TH.CircleGeometry(1.6,40),new TH.MeshStandardMaterial({color:'#0b1f1d',roughness:.1,metalness:.1,transparent:true,opacity:.3,depthWrite:false}));water.rotation.x=-Math.PI/2;water.position.set(cx,.1,cz);water.renderOrder=2;W.root.add(water);W.water=water;
  lilies(cx,cz);
  W.ripples=[];for(let i=0;i<4;i++){const r=new TH.Mesh(new TH.RingGeometry(.9,1,32),new TH.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set(cx,.11,cz);W.root.add(r);W.ripples.push(r);}
  W.inter.push({x:cx,z:cz+2,r:2.4,label:'Koi-Teich',btn:'Füttern',act:()=>{if(!DW.feedKoi()){msg('Du hast kein Koi-Futter. Es gibt welches auf dem Markt im Dorf.');return;}W.koiFeed=7;W.kneel=6;W.ripT=0;{const ax=W.av?W.av.position.x-cx:0,az=W.av?W.av.position.z-cz:1,dd=Math.hypot(ax,az)||1;W.feedAt=[cx+ax/dd*1.05,cz+az/dd*1.05];}if(W.av){const tx=cx-W.av.position.x,tz=cz-W.av.position.z;W.av.rotation.y=Math.atan2(tx,tz);}DW.bell(.7);msg('Du kniest dich hin. Die Koi kommen zu dir. Noch '+DW.koiFood()+' Portionen.');}});
  W.kois=[];const kinds=['kohaku','sanke','showa','ogon','kohaku','chagoi'];kinds.forEach((kd,i)=>{const f=koiFish(kd,.42+(i%3)*.06);f.position.y=.05;W.root.add(f);const rr=.45+i*.17,oo=i*1.3;W.kois.push({f,c:[cx,cz],r:rr,s:(.22+i*.05)*(i%2?1:-1),o:oo,x:cx+Math.cos(oo)*rr,z:cz+Math.sin(oo)*rr*.85,h:oo});});}

function smoke(x,y,z,n,col){const arr=[];const m0=new TH.SpriteMaterial({map:softTex(),color:col||0xd8d4cc,transparent:true,opacity:0,depthWrite:false});for(let i=0;i<n;i++){const s=new TH.Sprite(m0.clone());s.userData={x,y,z,t:i/n};W.root.add(s);arr.push(s);}(W.smokes=W.smokes||[]).push(arr);}
function birds(){const g=new TH.Group();W.scene.add(g);W.birds=[];const m=new TH.MeshBasicMaterial({color:'#2a2622',side:TH.DoubleSide});const wg=new TH.BufferGeometry();wg.setAttribute('position',new TH.Float32BufferAttribute([0,0,0,.45,0,-.1,0,0,-.22],3));
  for(let i=0;i<8;i++){const b=new TH.Group();const l=new TH.Mesh(wg,m),r=new TH.Mesh(wg,m);r.scale.x=-1;b.add(l,r);const body=new TH.Mesh(new TH.ConeGeometry(.05,.3,5),m);body.rotation.x=Math.PI/2;b.add(body);g.add(b);W.birds.push({b,l,r,o:i*.42,h:(i%3)*.8,d:(i%2)*1.4});}}
function wingTex(c){const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.fillStyle=c;x.beginPath();x.ellipse(30,22,26,18,-.3,0,6.3);x.fill();x.beginPath();x.ellipse(24,46,16,13,.4,0,6.3);x.fill();x.strokeStyle='#1a1410';x.lineWidth=4;x.beginPath();x.ellipse(30,22,26,18,-.3,0,6.3);x.stroke();x.fillStyle='#1a1410';x.beginPath();x.arc(44,16,4,0,6.3);x.fill();return new TH.CanvasTexture(cv);}
function flutter(){if(W.tod.night||W.se.winter)return;W.flies=[];const cols=['#f2b23a','#f2f0ea','#e86a2a','#7ab8f2'];const g=new TH.PlaneGeometry(.16,.16);g.translate(.08,0,0);
  for(let i=0;i<7;i++){const m=new TH.MeshBasicMaterial({map:wingTex(cols[i%4]),transparent:true,alphaTest:.4,side:TH.DoubleSide});const b=new TH.Group(),l=new TH.Mesh(g,m),r=new TH.Mesh(g,m);r.scale.x=-1;b.add(l,r);W.root.add(b);const base=i<4?[RPOS.garten.c[0]+(i-1.5)*1.6,RPOS.garten.c[1]]:[(i-5)*6,8+i];W.flies.push({b,l,r,base,o:i*2.1});}}
function fireflies(){if(!W.tod.night||W.se.winter)return;const n=60,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=-20+Math.random()*40;p[i*3+1]=.3+Math.random()*2;p[i*3+2]=-6+Math.random()*30;}const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(p,3));
  W.ffly=new TH.Points(g,new TH.PointsMaterial({size:.16,map:softTex(),color:0xd8ff8a,transparent:true,depthWrite:false,blending:TH.AdditiveBlending}));W.ffly.userData.base=p.slice();W.root.add(W.ffly);}
const MONKSAY=['Guten Morgen. Der Tee ist heiss.','Shen sagt, du machst Fortschritte.','Der Hof wird nie ganz sauber. Darum fegen wir.','Langsam gehen ist auch gehen.','Hast du heute schon geatmet? Ich meine richtig.','Das Dorf spricht von dir.','Wer früh fegt, fegt in Ruhe.','Die Koi sind heute hungrig.'];
function npcs(){if(!window.MonkKit)return;MonkKit.load(()=>{if(!W||W.ch)return;W.npcs=W.npcs||[];
  const mk=(robe,skin,hair,cfg)=>{const o=MonkKit.npc(robe,skin,hair);if(!o)return;o.traverse(c=>{if(c.isMesh)c.castShadow=true;});W.root.add(o);const mx=new TH.AnimationMixer(o),A={};MonkKit.gltf.animations.forEach(c=>A[c.name]=mx.clipAction(c));
    ['Idle','Walk','Stance'].forEach(n=>{if(A[n]){A[n].play();A[n].setEffectiveWeight(0);}});const N=Object.assign({o,mx,A,i:0,wait:0,mode:cfg.mode,pts:cfg.pts,sp:cfg.sp||1,cur:null},cfg);o.position.set(cfg.pts[0][0],groundH(cfg.pts[0][0],cfg.pts[0][1]),cfg.pts[0][1]);
    const it={x:o.position.x,z:o.position.z,r:1.6,label:cfg.name,btn:cfg.mode==='train'?'Ansprechen':'Grüssen',act:()=>{if(cfg.mode!=='train'&&nqDialog(N,cfg.name))return;if(cfg.mode==='train'){dlgK('Bruder Tao','Tai Chi ist Meditation in Bewegung. Ich zeige dir die 8er-Form im Yang-Stil. Stell dich hin, Füsse schulterbreit, und mach mit. Oder wir üben die kurze Kung-Fu-Form.',[['Tai Chi · 8er-Form',()=>{endTalk();tcChoose(N);},1],['Kurze Kung-Fu-Form',()=>{endTalk();trainForm(N);}],['Grüssen',()=>{endTalk();N.bowT=2.4;playOnce('Bow');msg('Bruder Tao: «Wer übt, wird.»');}],['Gehen',()=>endTalk()]]);return;}const t=MONKSAY[Math.floor(Math.random()*MONKSAY.length)];msg(cfg.name+': «'+t+'»');DW.bell(.8);N.wait=Math.max(N.wait,3.2);N.face=true;N.bowT=2.2;playOnce('Bow');}};W.inter.push(it);N.it=it;
    if(cfg.mode==='sweep'){const br=new TH.Group();const st=new TH.Mesh(new TH.CylinderGeometry(.02,.02,1.4,6),W.M.wood);st.position.y=.7;br.add(st);const bh=new TH.Mesh(new TH.ConeGeometry(.16,.35,8),new TH.MeshStandardMaterial({color:'#b8a06a',roughness:1}));bh.position.y=.1;br.add(bh);let hand=null;o.traverse(c=>{if(c.isBone&&c.name==='handR')hand=c;});
      if(hand){const ws=new TH.Vector3();hand.getWorldScale(ws);const g2=new TH.Group();g2.add(br);br.position.set(0,-.95,0);g2.scale.setScalar(1/ws.x);g2.position.set(0,.06,0);g2.rotation.set(3.14,0,.15);hand.add(g2);N.broomHand=g2;}
      else{br.position.set(.25,0,.45);br.rotation.x=.5;o.add(br);}N.broom=br;}
    ['Sweep','Bow','Form','TaiChi'].forEach(n=>xclip(n,c=>{const a=mx.clipAction(c);a.play();a.setEffectiveWeight(0);A[n]=a;}));
    W.npcs.push(N);};
  mk('#c98a2a','#c99a72','#2a2420',{name:'Bruder Wei',mode:'sweep',pts:[[-4,9],[4,9],[4,13],[-4,13]],sp:.55});
  mk('#7a2e24','#a8784f','#1a1614',{name:'Schwester Lin',mode:'walk',pts:[[-5.8,7.2],[-5.8,18.5],[5.8,18.5],[5.8,7.2]],sp:1});
  mk('#4a4440','#e0b896','#c9c4bb',{name:'Bruder Tao',mode:'train',pts:[[RPOS.hof.c[0]-.5,RPOS.hof.c[1]+2.6]],face:[-1,0]});
  mk('#d9cfbd','#8a5a3a','#1a1614',{name:'Novize Kai',mode:'walk',pts:[[-6,11],[-3,16],[3,16],[3.2,10.5]],sp:.8});
});}
function setW(N,name){['Idle','Walk','Stance','Sweep','Bow','Form','TaiChi'].forEach(n=>{if(N.A[n])N.A[n].setEffectiveWeight(n===name?1:0);});if(N.cur!==name&&N.A[name]){N.A[name].reset();N.A[name].play();}N.cur=name;}
function life(){if(W.ch)return;
  const G=RPOS.garten.c;koi(G[0]-1,G[1]);
  bamboo(-20,10,26,3.2);bamboo(19,-16,18,2.6);
  const fc=W.se.winter?['#e9e6e0']:['#e8c02f','#f2f0ea','#d84a5a','#a86ad8','#f28a3a'];
  flowerBed(-7.5,5.2,2.2,1,fc,70);flowerBed(7.5,5.2,2.2,1,fc,70);flowerBed(-9,16,2,2,fc,60);flowerBed(G[0]+2,G[1]+3.6,2.5,1,fc,60);flowerBed(10,16,2,1.6,fc,50);
  [[-15.5,4],[-15.5,-4],[15.5,4],[15.5,-4],[-15.5,-14],[15.5,-14],[-8.5,22],[8.5,22],[-17,18],[17,20],[-5,-14],[5,-14]].forEach(([x,z],i)=>bush(x,z,.9+(i%3)*.2));
  smoke(RPOS.kueche.c[0]+1.2,5.1,RPOS.kueche.c[1]-1.2,10);box(.5,.9,.5,W.M.stone,RPOS.kueche.c[0]+1.2,4.3,RPOS.kueche.c[1]-1.2,1);
  [[-9.5,7],[9.8,6.4],[-16,15.5],[16.5,14]].forEach(([x,z],i)=>imp('gtree',x,z,3.4+(i%2)*.6,i*.37+.1,.6));
  [[-19,-4],[19.5,3],[-21,21],[21,-8],[2,-21],[-11,-21],[13,-20],[-22,8],[23,16]].forEach(([x,z],i)=>imp('btree',x,z,4.6+(i%3)*.8,i*.29+.05,.4));
  stall(-5.6,21.9);
  birds();flutter();fireflies();npcs();props();nqSetup();setTimeout(sealCheck,4000);}
function lifeUpdate(){const now=performance.now()/1000,dt=Math.min(.05,now-(W.lt||now));W.lt=now;const t=now;
  if(W.bcn&&W.bcn.visible){const c=W.bcn.children[0],r=W.bcn.children[1];c.rotation.y=t*.5;const near=W.av&&Math.hypot(W.av.position.x-W.bcn.position.x,W.av.position.z-W.bcn.position.z)<2.2;const tgt=near?.08:(W.bcnPulse>0?.6:.32);if(W.bcnPulse>0)W.bcnPulse-=dt;c.material.opacity+=(tgt+Math.sin(t*2.4)*.06-c.material.opacity)*.08;r.scale.setScalar(1+Math.sin(t*2.4)*.12);r.material.opacity=c.material.opacity*1.4;}
  if(W.nq&&W.nq.g.visible){W.nq.glint.material.opacity=.45+Math.sin(t*3)*.35;W.nq.g.rotation.y=t*.4;}
  if(W.bathW)W.bathW.rotation.z=t*.15;if(W.bathS)W.bathS.material.opacity=.45+Math.sin(t*20)*.1;
  if(W.koiFeed>0)W.koiFeed-=dt;
  if(W.lilyPads)W.lilyPads.forEach(L=>{if(L.m){L.m.rotation.z=L.b+Math.sin(t*.25+L.o)*.06;}else if(L.f){L.f.rotation.y=Math.sin(t*.2+L.o)*.2;}});
  if(W.kois)W.kois.forEach((k,i)=>{const fd=W.koiFeed>0&&W.feedAt;let tx,tz;const a=t*k.s+k.o;
    if(fd){tx=W.feedAt[0]+Math.cos(t*1.3+i*1.1)*.3;tz=W.feedAt[1]+Math.sin(t*1.7+i)*.22;}else{tx=k.c[0]+Math.cos(a)*k.r;tz=k.c[1]+Math.sin(a)*k.r*.85;}
    const dx=tx-k.x,dz=tz-k.z,d=Math.hypot(dx,dz),sp=fd?1.1:.45;if(d>.01){const st=Math.min(d,sp*dt);k.x+=dx/d*st;k.z+=dz/d*st;const ry=Math.atan2(dx,dz);let dr=ry-k.h;dr=((dr+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;k.h+=dr*Math.min(1,dt*3);}
    const r=Math.hypot(k.x-k.c[0],k.z-k.c[1]);if(r>1.35){k.x=k.c[0]+(k.x-k.c[0])/r*1.35;k.z=k.c[1]+(k.z-k.c[1])/r*1.35;}
    const wig=Math.sin(t*(fd?11:6)+k.o),U=k.f.userData;k.f.position.set(k.x,fd?.075:.05+Math.sin(t*.7+i)*.012,k.z);k.f.rotation.y=k.h+wig*.08;U.tail.rotation.y=wig*.55;U.pecs.forEach((p,j)=>p.rotation.y=Math.sin(t*4+j*3)*.4);});
  if(W.ripples&&W.feedAt){W.ripT=(W.ripT||0)+dt;W.ripples.forEach((r,i)=>{const ph=((W.ripT*.6+i/4)%1);const on=W.koiFeed>0;r.position.x=W.feedAt[0];r.position.z=W.feedAt[1];r.scale.setScalar(.05+ph*.5);r.material.opacity=on?(1-ph)*.35:0;});}
  if(W.smokes)W.smokes.forEach(arr=>arr.forEach(s=>{const u=s.userData;u.t=(u.t+dt*.12)%1;s.position.set(u.x+Math.sin(u.t*5+t*.3)*.4*u.t+u.t*1.2,u.y+u.t*4,u.z+u.t*.5);const k=.4+u.t*2.2;s.scale.set(k,k,k);s.material.opacity=Math.sin(u.t*Math.PI)*.32;}));
  if(W.birds)W.birds.forEach(B=>{const a=t*.12+B.o,R=26+B.d*2;B.b.position.set(Math.cos(a)*R,20+B.h+Math.sin(t*.7+B.o)*.8,-4+Math.sin(a)*R*.7);B.b.rotation.y=-a;const f=Math.sin(t*9+B.o*3)*.7;B.l.rotation.z=f;B.r.rotation.z=-f;});
  if(W.flies)W.flies.forEach(F=>{const a=t*.6+F.o;F.b.position.set(F.base[0]+Math.sin(a)*1.4+Math.sin(a*2.3)*.4,.5+Math.abs(Math.sin(a*1.7))*.9,F.base[1]+Math.cos(a*.8)*1.2);F.b.rotation.y=a;const f=Math.sin(t*22+F.o)*1.1;F.l.rotation.y=f;F.r.rotation.y=-f;});
  if(W.ffly){const p=W.ffly.geometry.attributes.position,b=W.ffly.userData.base;for(let i=0;i<p.count;i++){p.setXYZ(i,b[i*3]+Math.sin(t*.5+i)*.6,b[i*3+1]+Math.sin(t*.8+i*1.3)*.3,b[i*3+2]+Math.cos(t*.4+i)*.6);}p.needsUpdate=true;W.ffly.material.opacity=.6+Math.sin(t*3)*.3;}
  if(W.flames)W.flames.forEach((f,i)=>{f.scale.y=1.4+Math.sin(t*13+i*2)*.35;f.scale.x=1+Math.sin(t*9+i)*.12;});
  if(W.steams)W.steams.forEach((s,i)=>{s.position.y+=Math.sin(t*1.3+i)*.002;s.material.opacity=.1+Math.sin(t*1.1+i)*.05;s.lookAt(W.cam.position);});
  if(W.bambooL)W.bambooL.rotation.y=Math.sin(t*.5)*.004;
  if(W.npcs)W.npcs.forEach(N=>{N.mx.update(dt);const o=N.o;N.it.x=o.position.x;N.it.z=o.position.z;
    if(N.face&&W.av){const tgt=Math.atan2(W.av.position.x-o.position.x,W.av.position.z-o.position.z);o.rotation.y+=(((tgt-o.rotation.y+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)*Math.min(1,dt*5);}
    if(N.mode==='train'){if(W.tc&&N.A.TaiChi){setW(N,'TaiChi');return;}if(N.bowT>0){N.bowT-=dt;setW(N,N.A.Bow?'Bow':'Idle');return;}setW(N,N.A.Form?'Form':N.A.Stance?'Stance':'Idle');if(!N.A.Form&&N.A.Stance&&N.A.Stance.time>N.A.Stance.getClip().duration-.05)N.A.Stance.time=0;if(!N.face&&N.face0==null){o.rotation.y=Math.atan2(N.facev?N.facev[0]:-1,0);}if(N.wait>0){N.wait-=dt;if(N.wait<=0)N.face=false;}return;}
    if(N.bowT>0){N.bowT-=dt;setW(N,N.A.Bow?'Bow':'Idle');if(N.wait>0)N.wait-=dt;return;}
    if(N.wait>0){N.wait-=dt;setW(N,N.mode==='sweep'&&!N.face&&N.A.Sweep?'Sweep':'Idle');if(N.wait<=0)N.face=false;return;}
    const p=N.pts[(N.i+1)%N.pts.length],dx=p[0]-o.position.x,dz=p[1]-o.position.z,d=Math.hypot(dx,dz);
    if(W.av&&Math.hypot(W.av.position.x-o.position.x,W.av.position.z-o.position.z)<1.1){setW(N,'Idle');return;}
    if(d<.15){N.i=(N.i+1)%N.pts.length;N.wait=N.mode==='sweep'?4+Math.random()*4:2+Math.random()*4;return;}
    const s=N.sp*dt;let ux=dx/d,uz=dz/d;const free=(a,b)=>!blocked(o.position.x+a*.45,o.position.z+b*.45,o.position.x,o.position.z);
    if(!free(ux,uz)){let ok=false;for(const da of [.6,-.6,1.2,-1.2,1.8,-1.8]){const c=Math.cos(da),sn=Math.sin(da),ax=ux*c-uz*sn,az=ux*sn+uz*c;if(free(ax,az)){ux=ax;uz=az;ok=true;break;}}if(!ok){N.stuck=(N.stuck||0)+dt;if(N.stuck>1.5){N.i=(N.i+1)%N.pts.length;N.stuck=0;}setW(N,'Idle');return;}}N.stuck=0;
    setW(N,'Walk');o.position.x+=ux*Math.min(s,d);o.position.z+=uz*Math.min(s,d);o.position.y=groundH(o.position.x,o.position.z)+(W.rects.length?0:0);
    const ry=Math.atan2(ux,uz);o.rotation.y+=(((ry-o.rotation.y+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)*Math.min(1,dt*6);if(N.A.Walk)N.A.Walk.timeScale=N.sp*.95;
    if(N.broom&&!N.broomHand)N.broom.rotation.z=Math.sin(t*3.2)*.45;});
}

window.DWWorld={open,close,refreshRoom,goRoom,checkin};
})();
