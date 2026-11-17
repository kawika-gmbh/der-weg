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
function groundH(x,z){const r=Math.hypot(x,z);return (W&&W.pilgrim?0:-sst(27,38,z)*28)+sst(24,60,r)*(nz(x,z)+1.2)*1.6-sst(60,110,r)*2+(r>24?0:nz(x*3,z*3)*.04);}

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
const IMP={maple:[512,320],fir_a:[256,736],fir_b:[256,592],fir_c:[256,584]};
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
    const halo=new TH.Mesh(new TH.TorusGeometry(.42,.025,8,40),M.gold);halo.position.set(0,1.05,-.25);add(halo,g);}
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
    W.solids.push([bx,cz+(fx?-1.2:0),.7]);box(.5,.5,.5,darkW,bx,y,cz+(fx?.6:1.2),1);const c=new TH.Mesh(new TH.CylinderGeometry(.05,.05,.15,8),new TH.MeshStandardMaterial({color:'#efe6d2'}));c.position.set(bx,y+.58,cz+(fx?.6:1.2));W.root.add(c);
    const fl=new TH.Mesh(new TH.SphereGeometry(.03,6,4),M.glow);fl.position.set(bx,y+.7,cz+(fx?.6:1.2));W.root.add(fl);spot=[bx+fx*1.1,cz+(fx?-1.2:0)];}
  if(id==='kueche'){box(1.4,.9,1,M.stone,bx,y,cz,1.2);const pot=new TH.Mesh(new TH.CylinderGeometry(.32,.26,.35,16),new TH.MeshStandardMaterial({color:'#2a2a2c',metalness:.6,roughness:.5}));pot.position.set(bx,y+1.08,cz);W.root.add(pot);
    const fire=new TH.Mesh(new TH.BoxGeometry(.5,.18,.05),M.glow);fire.position.set(bx+fx*.52,y+.3,cz+fz*.52);fire.rotation.y=fx?Math.PI/2:0;W.root.add(fire);const L=new TH.PointLight(0xff7a30,1,4,2);L.position.set(bx+fx*.9,y+.5,cz);W.root.add(L);W.flick.push(L);
    W.solids.push([bx,cz,.9]);box(fx?1:1.6,.75,fx?1.6:1,darkW,cx+fx*.3,y,cz+(fx?1.6:0)+(fz?0:0),1);const jar=new TH.Mesh(new TH.CylinderGeometry(.18,.22,.5,12),new TH.MeshStandardMaterial({color:'#8a5a3a',roughness:.7}));jar.position.set(cx+fx*.3,y+1,cz+(fx?1.6:0));W.root.add(jar);spot=[bx+fx*1.2,cz];}
  if(id==='bibliothek'){for(let i=0;i<3;i++){const sx=fx?bx:cx-1.6+i*1.6,sz=fx?cz-1.6+i*1.6:bz;box(fx?.4:1.4,2.2,fx?1.4:.4,darkW,sx,y,sz,1);for(let k=0;k<4;k++)for(let b=0;b<5;b++){const bk=new TH.Mesh(new TH.BoxGeometry(fx?.25:.18,.32,fx?.18:.25),new TH.MeshStandardMaterial({color:['#7a2a1c','#2a4a6a','#4a6a3a','#8a6a2a','#5a3a6a'][(b+k+i)%5],roughness:.8}));bk.position.set(sx+(fx?fx*.1:-.5+b*.25),y+.35+k*.5,sz+(fx?-.5+b*.25:fz*.1));W.root.add(bk);}W.solids.push([sx,sz,.8]);}
    box(fx?.9:1.4,.75,fx?1.4:.9,darkW,cx+fx*.4,y,cz+(fx?0:0),1);const sc=new TH.Mesh(new TH.CylinderGeometry(.05,.05,.5,8),new TH.MeshStandardMaterial({color:'#e9dcc0'}));sc.rotation.z=Math.PI/2;sc.position.set(cx+fx*.4,y+.8,cz);W.root.add(sc);W.solids.push([cx+fx*.4,cz,.6]);spot=[cx+fx*1.4,cz];}
  if(id==='bad'){const tub=new TH.Mesh(new TH.CylinderGeometry(.9,.85,.7,20,1,true),darkW);tub.position.set(bx,y+.35,cz);W.root.add(tub);const wt=new TH.Mesh(new TH.CircleGeometry(.85,20),new TH.MeshPhongMaterial({color:'#2a5560',shininess:80}));wt.rotation.x=-Math.PI/2;wt.position.set(bx,y+.6,cz);W.root.add(wt);W.solids.push([bx,cz,1]);
    const bucket=new TH.Mesh(new TH.CylinderGeometry(.2,.17,.35,12),darkW);bucket.position.set(bx+fx*.2,y+.18,cz+(fx?1.2:0)+(fz?1.2:0));W.root.add(bucket);spot=[bx+fx*1.3,cz];}
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
  const v=DW.village(),lvl=v.lvl,n=[4,9,15,24][lvl],r=rng(77),M=W.M,base=-27;
  const g=new TH.Group();W.root.add(g);
  const lamp=lvl>=3;
  for(let i=0;i<n;i++){const a=r()*6.28,d=4+r()*(8+lvl*4),x=Math.cos(a)*d,z=50+Math.sin(a)*d*.6,s=1.6+r()*1.1;
    const gb=groundH(x,z)-.1;const hm=new TH.Mesh(new TH.BoxGeometry(2.2*s,1.6*s,1.8*s),M.plaster);hm.position.set(x,gb+.8*s,z);hm.castShadow=true;g.add(hm);
    const rf=new TH.Mesh(new TH.ConeGeometry(1.8*s,1.1*s,4),M.roof);rf.position.set(x,gb+1.6*s+.5*s,z);rf.rotation.y=Math.PI/4;g.add(rf);
    if(W.tod.night||lamp){const l=new TH.Mesh(new TH.BoxGeometry(.3,.3,.05),M.glow);l.position.set(x,gb+.8*s,z+.92*s);g.add(l);}}
  W.villageAt=[0,groundH(0,50),50];
  if(lvl>=1){const w=new TH.Mesh(new TH.CylinderGeometry(.8,.8,.6,12),M.stone);w.position.set(0,groundH(0,50)+.3,50);g.add(w);for(let i=0;i<5;i++){const f=new TH.Mesh(new TH.PlaneGeometry(6,3),new TH.MeshStandardMaterial({color:i%2?'#8a8a3a':'#6f7a2e'}));f.rotation.x=-Math.PI/2;f.position.set(-16+i*6.5,base+.05,74);g.add(f);}}
  if(lvl>=2){const b=new TH.Mesh(new TH.BoxGeometry(8,.3,1.5),M.red);b.position.set(12,base+.6,58);g.add(b);const m=new TH.Mesh(new TH.BoxGeometry(4,2.4,3),M.plaster);m.position.set(-4,base+1.2,56);g.add(m);}
  if(lvl>=3)for(let i=0;i<12;i++){const l=new TH.Mesh(new TH.SphereGeometry(.25,8,6),M.paper);l.position.set(-12+i*2,base+4+Math.sin(i)*.5,62);g.add(l);}
  const smoke=new TH.Mesh(new TH.PlaneGeometry(70,30),new TH.MeshBasicMaterial({color:0xcfd6dc,transparent:true,opacity:.18,depthWrite:false}));smoke.position.set(0,base+6,48);g.add(smoke);
}
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
  if(!r.open&&id!=='tor'){dlgK(r.n,`Diese Tür ist verschlossen. Hier lernst du: ${r.d}. Mit jedem neuen Rang darfst du eine Tür öffnen. Sprich mit Meister Shen, wenn du bereit bist.`,[['Verstanden',()=>endTalk(),1]]);return;}
  const btns=[];let text=r.d+'.';
  if(!r.open)text='Das Tor ins Tal ist noch verschlossen, Schritte-Routinen lernst du ab einem höheren Rang. Doch von hier siehst du das Dorf, und es braucht deine Hilfe.';
  else if(!r.rit.length)text+=' Hier hast du noch keine Routine.';
  r.rit.forEach(x=>{const st=x.done?'✓ erledigt':!x.due?'heute nicht fällig':x.sub;text+=`\n${x.done?'✓':'○'} ${x.name} · ${st}`;
    if(!x.done&&x.due)btns.push([x.label+': '+x.name,()=>{endTalk();DW.doRitual(x.id);setTimeout(refreshRoom,400);},1]);});
  r.rit.forEach(x=>{if(x.editable)btns.push(['Bearbeiten: '+x.name,()=>{endTalk();DW.editRitual(x.id);}]);});
  if(r.open&&DW.slotsFree()>0)btns.push(['Neue Routine hier',()=>{endTalk();DW.newRitual(id);}]);
  r.arch.forEach(x=>{if(r.open&&DW.slotsFree()>0)btns.push(['Zurückholen: '+x.name,()=>{DW.unarchive(x.id);roomDialog(id);}]);});
  if(id==='halle')btns.push(['Verneigen',()=>{endTalk();pose('Stance',true);setTimeout(()=>W&&pose('Stance',false),1800);DW.bell(1.1);DW.day('_qa',1);DW.day('_qb2',0);msg('Ein Moment der Stille.');}]);
  if(id==='tor'&&W.villageAt){W.camOv={p:new TH.Vector3(2.5,6.5,29),t:new TH.Vector3(W.villageAt[0],W.villageAt[1]-4,W.villageAt[2]-12)};W.fogSave=W.fogSave||W.scene.fog.density;W.scene.fog.density=W.fogSave*.35;}
  if(id==='tor'){const v=DW.village(),cost=Object.entries(v.ev.cost).map(([k,c])=>`${v.paid[k]||0}/${c} ${DW.pts().find(p=>p.k===k).n}`).join(' · ');text+=`\n\nDas Dorf im Tal (${v.stufe}, ${v.done} Hilfen): ${v.ev.n}. ${v.ok?'Diese Woche bereits erledigt.':'Benötigt: '+cost+'.'}`;
    if(!v.ok)btns.push(['Punkte investieren',()=>{const res=DW.invest();endTalk();msg(res.full?'Das Dorf dankt dir! '+v.ev.rw:res.any?'Investiert. Es fehlt noch etwas.':'Dir fehlen die passenden Punkte.');if(res.full){DW.bell(1.4);}}]);}
  if(id==='tor'){const st=DW.stepsToday();btns.splice(Math.max(0,btns.length),0,[st?`Schritte heute: ${st} (anpassen)`:'Schritte von heute eintragen',()=>{endTalk();stepsDlg();},!st]);}
  if(id==='tor')DW.pilgrims().forEach(p=>{if(p.open&&r.open)btns.push(['Pilgerreise: '+p.n+(p.visited?' (diese Woche besucht)':''),()=>{endTalk();close();open({pilgrim:p.ch});}]);else text+=`\n· ${p.n}: ab Rang ${p.rankName}`;});
  btns.push(['Gehen',()=>endTalk()]);
  dlgK(r.n,text,btns);
}
function dlgK(k,text,btns){dlg(text,btns);$('#wDlgK').textContent=k;}
function refreshRoom(){if(W){ptsHud();dayGlow(false);beacon();}}
/* ---------- Tagesbeginn: interaktiv ---------- */
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
  btns.push(['Übersicht im Menü',()=>{endTalk();DW.openMenu('missions');}]);
  btns.push([first?'Ich schaue mich erst um':'Danke',()=>{endTalk();beacon();}]);
  dlgK(first?'Tagesbeginn':'Heute',t+extra,btns);}
/* ---------- Leuchtfeuer zum nächsten Ziel ---------- */
function beacon(force){if(!W||W.ch)return;const L=DW.todayList().filter(r=>!r.done);if(!W.bcn){const g=new TH.Group();const m=new TH.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.35,depthWrite:false,blending:TH.AdditiveBlending,side:TH.DoubleSide});
    const c=new TH.Mesh(new TH.CylinderGeometry(.35,.6,7,20,1,true),m);c.position.y=3.5;g.add(c);const ring=new TH.Mesh(new TH.RingGeometry(.55,.75,32),m.clone());ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);W.root.add(g);W.bcn=g;}
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
  if(has('medizin')){const h=hut('kueche'),x=h.c[0]+h.f[0]*.3,z=h.c[1]+1.15;const tp=new TH.Mesh(new TH.SphereGeometry(.13,16,12),new TH.MeshStandardMaterial({color:'#3d5a4a',roughness:.4,metalness:.2}));tp.scale.y=.8;tp.position.set(x,y+.86,z);W.root.add(tp);const sp=new TH.Mesh(new TH.CylinderGeometry(.02,.035,.16,8),tp.material);sp.position.set(x+.13,y+.9,z);sp.rotation.z=-1;W.root.add(sp);
    const st=new TH.Mesh(new TH.PlaneGeometry(.12,.35),new TH.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false}));st.position.set(x,y+1.15,z);W.root.add(st);W.steam=st;}
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
function ptsHud(){rankHud();let el=$('#wPts');if(!el){el=document.createElement('div');el.id='wPts';el.className='w-pts';$('#world').appendChild(el);}el.innerHTML=DW.pts().map(p=>`<span><i style="background:${p.c}"></i>${p.n.slice(0,3)} <b>${p.v}</b></span>`).join('');}

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
  if(Math.hypot(x,z)>40)return true;if(!W.pilgrim&&z>25)return true;
  for(const s of W.solids){if(Math.hypot(x-s[0],z-s[1])<s[2])return true;}
  if(W.edgeZ&&z>W.edgeZ)return true;if(W.ch===2&&Math.hypot(x,z+12)<6.9)return true;if(W.ch===2&&Math.abs(x)<1.1&&z>-5&&z<14&&!(W.bridge&&z>W.bridge.z0&&z<W.bridge.z1))return true;
  if(W.ch===0&&W.platform){const inP=Math.abs(x)<5.5&&Math.abs(z)<4,wasP=Math.abs(px)<5.5&&Math.abs(pz)<4,steps=Math.abs(x)<2.1&&z>=3.6&&z<5.6;if(inP&&!wasP&&!(Math.abs(px)<2.1&&pz>=3.6))return true;if(!inP&&wasP&&!steps)return true;}
  if(W.ch===0&&W.walls){if(Math.abs(x)<4.3&&z<-2.4&&z>-2.85)return true;if(Math.abs(Math.abs(x)-4.1)<.2&&z>-2.6&&z<2.6)return true;}
  return false;
}
function heightAt(x,z){if(W.ch===0&&W.rects.length){for(const q of W.rects){if(x>q.x0&&x<q.x1&&z>q.z0&&z<q.z1)return q.h;}}if(W.ch>0){let h=null;for(const q of W.rects){if(x>q.x0&&x<q.x1&&z>q.z0&&z<q.z1)h=Math.max(h||0,q.h);}if(W.bridge&&x>W.bridge.x0&&x<W.bridge.x1&&z>W.bridge.z0&&z<W.bridge.z1)return .15+.9*Math.sin((x-W.bridge.x0)/(W.bridge.x1-W.bridge.x0)*Math.PI)+.1;return h!=null?h:groundH(x,z);}if(Math.abs(x)<1.15&&z>5.8&&z<26)return groundH(x,z)+.1;if(W.platform){if(Math.abs(x)<5.5&&Math.abs(z)<4)return .7;if(Math.abs(x)<2.1&&z>=4&&z<5.6)return .7*(1-(z-4)/1.5);}return groundH(x,z);}

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
    if(e.pointerId===lid){W.yaw-=(e.clientX-lx)*.006;W.pitch=Math.max(.05,Math.min(.9,W.pitch+(e.clientY-ly)*.004));lx=e.clientX;ly=e.clientY;}});
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
  const ml=Math.min(1,Math.hypot(mx,mz)),av=W.av;
  if(ml>.08){const sy=Math.sin(W.yaw),cy=Math.cos(W.yaw);const dx=(mx*cy+mz*sy),dz=(-mx*sy+mz*cy);const sp=4.6*ml*dt*((K.shift)?1.8:1)*(W.inHut?.6:1);const nx=av.position.x+dx/ml*sp*ml,nz2=av.position.z+dz/ml*sp*ml;
    if(!blocked(nx,nz2,av.position.x,av.position.z)){av.position.x=nx;av.position.z=nz2;}else if(!blocked(nx,av.position.z,av.position.x,av.position.z))av.position.x=nx;else if(!blocked(av.position.x,nz2,av.position.x,av.position.z))av.position.z=nz2;
    const target=Math.atan2(dx,dz);let d=target-av.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;av.rotation.y+=d*Math.min(1,dt*10);W.walk+=dt*ml*9;}
  else W.walk*=.9;
  const gy=heightAt(av.position.x,av.position.z);av.position.y+=(gy+Math.abs(Math.sin(W.walk))*.06*ml-av.position.y)*Math.min(1,dt*14);
  if(W.mixer){const A=W.acts,wk=Math.min(1,ml*1.2);if(A.Walk){A.Walk.setEffectiveWeight(wk);A.Walk.timeScale=.6+ml*.9;}if(A.Idle)A.Idle.setEffectiveWeight(1-wk);W.mixer.update(dt);}
  if(av.userData.torso){const b=1+Math.sin(t*1.3)*.012;av.userData.torso.scale.set(b,1,b);av.rotation.z=Math.sin(W.walk)*.04*ml;}
  // Kamera
  const inHut=W.huts&&Object.values(W.huts).find(h=>av.position.x>h.x0-.2&&av.position.x<h.x1+.2&&av.position.z>h.z0-.2&&av.position.z<h.z1+.2);if(inHut!==W.inHut){W.M.hid=W.M.hid||new TH.MeshBasicMaterial({colorWrite:false,depthWrite:false});if(W.inHut)W.inHut.roof.forEach(m=>{if(m.userData.mat)m.material=m.userData.mat;});if(inHut)inHut.roof.forEach(m=>{if(!m.userData.mat)m.userData.mat=m.material;m.material=W.M.hid;});W.inHut=inHut;}
  const dist=inHut?3.4:(W.zoom||6.5),cx=av.position.x+Math.sin(W.yaw)*dist*Math.cos(W.pitch),cz=av.position.z+Math.cos(W.yaw)*dist*Math.cos(W.pitch),cyy=av.position.y+1.4+Math.sin(W.pitch)*dist;
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
  let near=null;for(const it of W.inter){if(Math.hypot(av.position.x-it.x,av.position.z-it.z)<it.r){if(it.auto){it.act();W.inter=W.inter.filter(x=>x!==it);break;}near=it;}}
  if(W.talking)near=W.near;if(near!==W.near){W.near=near;const p=$('#wPrompt');if(near){$('#wPromptT').textContent=near.label;$('#wPromptB').textContent=near.btn+(FINE?' · E':'');p.hidden=false;}else p.hidden=true;}
  $('#wEn').textContent=DW.energy();
  if(W.npcMix){W.npcMix.update(dt);const o=W.npc,dx=av.position.x-o.position.x,dz=av.position.z-o.position.z;if(Math.hypot(dx,dz)<5){let d=Math.atan2(dx,dz)-o.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;o.rotation.y+=d*Math.min(1,dt*3);}}
  if(W.foeMix){W.foeMix.update(dt);const o=W.foe;o.position.y+=Math.sin(t*1.7)*.0015;const dx=av.position.x-o.position.x,dz=av.position.z-o.position.z;let d=Math.atan2(dx,dz)-o.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;o.rotation.y+=d*Math.min(1,dt*2);}
  if(W.smoke){const a=W.smoke.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]+=dt*.35;a[i]+=Math.sin(t+i)*.004;if(a[i+1]>2.4)a[i+1]=0;}W.smoke.geometry.attributes.position.needsUpdate=true;}
  if(W.talking&&W.talkPos&&Math.hypot(av.position.x-W.talkPos.x,av.position.z-W.talkPos.z)>2.5)endTalk();
  if(W.fallTex)W.fallTex.offset.y+=dt*1.6;
  if(W.flagsArr.length&&!RM)W.flagsArr.forEach((f,i)=>{f.rotation.x=Math.sin(t*3+i*.7)*.25;});
  impUpdate();floatUpdate(W.clock.elapsedTime);lifeUpdate();W.R.render(W.scene,W.cam);
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
  if(ch>0){BUILD[ch](5);W.meisterPos=W.meisterPos||[-3,0,4];}else{W.ch=0;W.rects=[];temple(5);path();poles();kloster();rewards();dayGlow(true);life();beacon();}
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
  else if(!ch&&!opts.room&&!DW.day('_brief'))setTimeout(()=>{if(W)briefing(true);},1100);
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

/* ---------- Leben & Details ---------- */
function softTex(){if(W.softT)return W.softT;const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);W.softT=new TH.CanvasTexture(cv);return W.softT;}
function paintTex(kind){const cv=document.createElement('canvas');cv.width=128;cv.height=256;const x=cv.getContext('2d');
  x.fillStyle='#efe6d0';x.fillRect(0,0,128,256);x.fillStyle='#6b3a24';x.fillRect(0,0,128,10);x.fillRect(0,246,128,10);
  if(kind==='enso'){x.strokeStyle='rgba(20,18,16,.9)';x.lineCap='round';for(let i=0;i<46;i++){const a=-1+i*.12,w=10*Math.sin(Math.PI*i/46)+2;x.lineWidth=w;x.beginPath();x.arc(64,118,38,a,a+.14);x.stroke();}x.fillStyle='#b8322a';x.fillRect(84,196,14,14);}
  else{const g=x.createLinearGradient(0,40,0,220);g.addColorStop(0,'#efe6d0');g.addColorStop(1,'#d9cfb6');x.fillStyle=g;x.fillRect(0,12,128,232);
    [[.35,'rgba(60,58,55,.35)',150],[.55,'rgba(40,38,36,.55)',175],[.8,'rgba(25,24,22,.8)',205]].forEach(([s,c,b],k)=>{x.fillStyle=c;x.beginPath();x.moveTo(0,b);for(let i=0;i<=8;i++){const px=i*16,py=b-Math.abs(Math.sin(i*1.7+k*2))*60*s-20*s;x.lineTo(px,py);}x.lineTo(128,b+40);x.lineTo(0,b+40);x.fill();});
    x.fillStyle='#b8322a';x.beginPath();x.arc(92,52,9,0,6.3);x.fill();}
  const t=new TH.CanvasTexture(cv);t.encoding=TH.sRGBEncoding;return t;}
function bush(x,z,s,col){const g=new TH.IcosahedronGeometry(1,2);const m=new TH.MeshLambertMaterial({color:col||'#22381a'});const r=rng(x*13+z*7);
  for(let i=0;i<3;i++){const b=new TH.Mesh(g,m);const k=s*(.55+r()*.45);b.scale.set(k,k*.8,k);b.position.set(x+(r()-.5)*s,groundH(x,z)+k*.55,z+(r()-.5)*s);b.castShadow=true;b.receiveShadow=true;W.root.add(b);}}
function flowerBed(x,z,w,d,cols,n){const pos=[],col=[],c=new TH.Color(),r=rng(x*3+z*11);for(let i=0;i<n;i++){const px=x+(r()-.5)*w,pz=z+(r()-.5)*d;pos.push(px,groundH(px,pz)+.12+r()*.18,pz);c.set(cols[Math.floor(r()*cols.length)]);col.push(c.r,c.g,c.b);}
  const g=new TH.BufferGeometry();g.setAttribute('position',new TH.Float32BufferAttribute(pos,3));g.setAttribute('color',new TH.Float32BufferAttribute(col,3));W.root.add(new TH.Points(g,new TH.PointsMaterial({size:.22,vertexColors:true,map:softTex(),transparent:true,alphaTest:.3,depthWrite:false})));
  bush(x,z,Math.min(w,d)*.35,'#2a4420');}
function bamboo(cx,cz,n,rad){const r=rng(cx*5+cz),stem=new TH.MeshStandardMaterial({color:'#4f6a2a',roughness:.6}),leafM=new TH.MeshStandardMaterial({color:'#2f5a1e',side:TH.DoubleSide,roughness:.9});
  const sg=new TH.CylinderGeometry(.05,.06,1,6),lg=new TH.PlaneGeometry(.5,.12);const S=new TH.InstancedMesh(sg,stem,n),L=new TH.InstancedMesh(lg,leafM,n*14);const m=new TH.Matrix4(),q=new TH.Quaternion(),e=new TH.Euler(),sc=new TH.Vector3(),p=new TH.Vector3();let li=0;
  for(let i=0;i<n;i++){const a=r()*6.28,d=Math.sqrt(r())*rad,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d,h=4+r()*3,y0=groundH(x,z);e.set((r()-.5)*.08,0,(r()-.5)*.08);q.setFromEuler(e);sc.set(1,h,1);p.set(x,y0+h/2,z);m.compose(p,q,sc);S.setMatrixAt(i,m);
    for(let k=0;k<14;k++){const ly=y0+h*(.45+r()*.55);e.set((r()-.5)*.6,r()*6.28,-.5-r()*.5);q.setFromEuler(e);sc.set(1,1,1);p.set(x+(r()-.5)*.5,ly,z+(r()-.5)*.5);m.compose(p,q,sc);L.setMatrixAt(li++,m);}W.solids.push([x,z,.12]);}
  S.castShadow=L.castShadow=true;W.root.add(S,L);W.bambooL=L;}
function decorRoom(id,cx,cz,fx,ew,ed,y){const M=W.M,P=(u,v)=>[cx+fx*u,cz+v];const darkW=new TH.MeshStandardMaterial({map:W.tex.woodD,color:'#5a3e2a',roughness:.8});
  const rugC={zelle:'#4a1a14',kueche:'#3a3822',bibliothek:'#1a2638',bad:'#22382f'}[id];
  {const rug=new TH.Mesh(new TH.PlaneGeometry(fx?2:3,fx?3:2),new TH.MeshStandardMaterial({color:rugC,roughness:1}));rug.rotation.x=-Math.PI/2;const[x,z]=P(.4,0);rug.position.set(x,y+.015,z);rug.receiveShadow=true;W.root.add(rug);
   const bd=new TH.Mesh(new TH.PlaneGeometry(fx?2.15:3.15,fx?3.15:2.15),new TH.MeshStandardMaterial({color:'#c9a45a',roughness:1}));bd.rotation.x=-Math.PI/2;bd.position.set(x,y+.012,z);W.root.add(bd);}
  // Papierlaterne an der Decke (Lichtquelle sichtbar)
  {const l=new TH.Mesh(new TH.CylinderGeometry(.15,.15,.3,14),M.paper);l.position.set(cx,y+2.3,cz);W.root.add(l);cyl(.01,.3,M.wood,cx,y+2.46,cz,4);}
  // Rollbild an der Seitenwand
  {const t=paintTex(id==='zelle'||id==='bad'?'enso':'mount');const sc=new TH.Mesh(new TH.PlaneGeometry(.62,1.24),new TH.MeshStandardMaterial({map:t,roughness:.9}));const[x,z]=P(.1,ed/2-.15);sc.position.set(x,y+1.55,z);sc.rotation.y=Math.PI;W.root.add(sc);
   const rod=new TH.Mesh(new TH.CylinderGeometry(.025,.025,.74,8),darkW);rod.rotation.z=Math.PI/2;rod.position.set(x,y+.92,z-.01);W.root.add(rod);}
  // Pflanze im Topf
  {const[x,z]=P(ew/2-.55,ed/2-.55);cyl(.2,.32,new TH.MeshStandardMaterial({color:'#3a4a5a',roughness:.5}),x,y,z,12,.15);const fol=new TH.MeshStandardMaterial({color:'#3f6a2e',roughness:1,flatShading:true});[[0,.62,0,.28],[.12,.82,.06,.2],[-.1,.78,-.08,.2]].forEach(([a,b,c,s])=>{const f=new TH.Mesh(new TH.IcosahedronGeometry(s,1),fol);f.position.set(x+a,y+b,z+c);f.castShadow=true;W.root.add(f);});W.solids.push([x,z,.3]);}
  // Kerzen
  {const[x,z]=P(-ew/2+.45,ed/2-.45);[[0,0,.22],[.14,.08,.15],[-.1,.12,.1]].forEach(([a,b,h])=>{cyl(.04,h,new TH.MeshStandardMaterial({color:'#efe6d2',roughness:.6}),x+a,y,z+b,8);const fl=new TH.Mesh(new TH.SphereGeometry(.022,6,4),M.glow);fl.scale.y=1.6;fl.position.set(x+a,y+h+.03,z+b);W.root.add(fl);(W.flames=W.flames||[]).push(fl);});}
  // Sitzkissen
  {const[x,z]=P(.9,-1.6);const c=box(.6,.1,.6,new TH.MeshStandardMaterial({color:'#8a3a2a',roughness:1}),x,y,z,1);}
  if(id==='zelle'){const[x,z]=P(-.2,ed/2-.35);const rack=box(1,.05,.05,darkW,x,y+1.5,z,1);[-.45,.45].forEach(o=>cyl(.03,1.5,darkW,x+o,y,z,6));const robe=new TH.Mesh(new TH.PlaneGeometry(.7,1),new TH.MeshStandardMaterial({color:'#c98a2a',side:TH.DoubleSide,roughness:1}));robe.position.set(x,y+.98,z+.02);W.root.add(robe);
    const[sx,sz]=P(1.6,ed/2-.5);[-.08,.08].forEach(o=>box(.1,.03,.25,darkW,sx+o,y,sz,1));}
  if(id==='kueche'){const[x,z]=P(-ew/2+.5,-ed/2+.6);for(let i=0;i<9;i++){const lg=cyl(.07,.7,new TH.MeshStandardMaterial({color:'#6a4a2e',roughness:1}),x+(i%3)*.16-.16,y+.08+Math.floor(i/3)*.14,z,6);lg.rotation.x=Math.PI/2;lg.position.y=y+.08+Math.floor(i/3)*.14;}
    const[hx,hz]=P(.2,-ed/2+.25);for(let i=0;i<5;i++){const hb=new TH.Mesh(new TH.ConeGeometry(.07,.3,6),new TH.MeshStandardMaterial({color:i%2?'#6a7a3a':'#a8a07a',roughness:1}));hb.rotation.x=Math.PI;hb.position.set(hx-.5+i*.25,y+2,hz);W.root.add(hb);}box(1.4,.04,.04,darkW,hx,y+2.15,hz,1);
    const[bx,bz]=P(1.6,-ed/2+.6);[0,.3].forEach(o=>{const s=new TH.Mesh(new TH.SphereGeometry(.2,10,8),new TH.MeshStandardMaterial({color:'#8a7650',roughness:1}));s.scale.y=1.25;s.position.set(bx+o*.9,y+.24,bz);W.root.add(s);});
    const[tx,tz]=P(.3,1.15);[-.3,.3].forEach(o=>{const bw=new TH.Mesh(new TH.SphereGeometry(.1,12,8,0,6.3,Math.PI/2,Math.PI/2),new TH.MeshStandardMaterial({color:'#e9e2d2',side:TH.DoubleSide}));bw.rotation.x=Math.PI;bw.position.set(tx,y+.95,tz+o+.3);W.root.add(bw);});}
  if(id==='bibliothek'){const[x,z]=P(.4,0);const ink=box(.18,.04,.12,new TH.MeshStandardMaterial({color:'#111'}),x,y+.75,z+.35,1);cyl(.012,.25,darkW,x+.05,y+.79,z+.5,6).rotation.z=1.4;
    const[gx,gz]=P(1.5,ed/2-.6);for(let i=0;i<3;i++){const bk=cyl(.25,.4,new TH.MeshStandardMaterial({color:'#9a7a4a',roughness:1}),gx-i*.55,y,gz,10,.2);for(let k=0;k<4;k++){const s=new TH.Mesh(new TH.CylinderGeometry(.035,.035,.5,6),new TH.MeshStandardMaterial({color:'#e8dcc0'}));s.rotation.x=.3*(k-1.5);s.position.set(gx-i*.55+(k-1.5)*.08,y+.5,gz);W.root.add(s);}}}
  if(id==='bad'){const[x,z]=P(1.4,ed/2-.4);box(.8,.05,.05,darkW,x,y+1.1,z,1);[-.38,.38].forEach(o=>cyl(.025,1.1,darkW,x+o,y,z,6));const tw=new TH.Mesh(new TH.PlaneGeometry(.5,.6),new TH.MeshStandardMaterial({color:'#e9e6dc',side:TH.DoubleSide}));tw.position.set(x,y+.82,z+.02);W.root.add(tw);
    const st=new TH.Mesh(new TH.PlaneGeometry(1.4,1.2),new TH.MeshBasicMaterial({map:softTex(),color:0xffffff,transparent:true,opacity:.14,depthWrite:false}));const[tx,tz]=P(-ew/2+1.1,0);st.position.set(tx,y+1.2,tz);W.root.add(st);(W.steams=W.steams||[]).push(st);
    for(let i=0;i<5;i++){const r=new TH.Mesh(new TH.DodecahedronGeometry(.1+i*.02,0),M.stone);const[a,b]=P(-ew/2+.4,-ed/2+.4+i*.22);r.position.set(a,y+.06,b);W.root.add(r);}}
}
function koi(cx,cz){const g=new TH.Group();W.root.add(g);
  const ring=[];for(let i=0;i<16;i++){const a=i/16*6.28,r=new TH.Mesh(new TH.DodecahedronGeometry(.28+((i*7)%3)*.06,0),W.M.stone);r.position.set(cx+Math.cos(a)*1.72,.08,cz+Math.sin(a)*1.72);r.scale.y=.55;r.rotation.y=i;r.castShadow=true;W.root.add(r);}
  const water=new TH.Mesh(new TH.CircleGeometry(1.6,32),new TH.MeshStandardMaterial({color:'#123a40',roughness:.05,metalness:.35,transparent:true,opacity:.78}));water.rotation.x=-Math.PI/2;water.position.set(cx,.09,cz);W.root.add(water);
  const pad=new TH.MeshStandardMaterial({color:'#3f7a3a',roughness:.8});[[.6,.4],[-.5,.7],[.2,-.8]].forEach(([a,b],i)=>{const p=new TH.Mesh(new TH.CircleGeometry(.22,12,0,5.6),pad);p.rotation.x=-Math.PI/2;p.rotation.z=i*2;p.position.set(cx+a,.1,cz+b);W.root.add(p);if(i!==1){const f=new TH.Mesh(new TH.ConeGeometry(.07,.1,6),new TH.MeshStandardMaterial({color:'#f2a6c0'}));f.position.set(cx+a,.15,cz+b);W.root.add(f);}});
  W.kois=[];const cols=['#f27a2a','#f2f0ea','#e85a2a','#f2c84a'];for(let i=0;i<4;i++){const f=new TH.Group();const b=new TH.Mesh(new TH.SphereGeometry(.09,10,8),new TH.MeshStandardMaterial({color:cols[i],roughness:.4}));b.scale.set(.8,.5,2.2);f.add(b);const t=new TH.Mesh(new TH.ConeGeometry(.06,.14,6),b.material);t.rotation.x=Math.PI/2;t.position.z=-.24;f.add(t);f.position.y=.04;W.root.add(f);W.kois.push({f,c:[cx,cz],r:.5+i*.25,s:(.25+i*.07)*(i%2?1:-1),o:i*1.7});}}
function smoke(x,y,z,n,col){const arr=[];const m0=new TH.SpriteMaterial({map:softTex(),color:col||0xd8d4cc,transparent:true,opacity:0,depthWrite:false});for(let i=0;i<n;i++){const s=new TH.Sprite(m0.clone());s.userData={x,y,z,t:i/n};W.root.add(s);arr.push(s);}(W.smokes=W.smokes||[]).push(arr);}
function birds(){const g=new TH.Group();W.scene.add(g);W.birds=[];const m=new TH.MeshBasicMaterial({color:'#2a2622',side:TH.DoubleSide});const wg=new TH.BufferGeometry();wg.setAttribute('position',new TH.Float32BufferAttribute([0,0,0,.45,0,-.1,0,0,-.22],3));
  for(let i=0;i<8;i++){const b=new TH.Group();const l=new TH.Mesh(wg,m),r=new TH.Mesh(wg,m);r.scale.x=-1;b.add(l,r);const body=new TH.Mesh(new TH.ConeGeometry(.05,.3,5),m);body.rotation.x=Math.PI/2;b.add(body);g.add(b);W.birds.push({b,l,r,o:i*.42,h:(i%3)*.8,d:(i%2)*1.4});}}
function wingTex(c){const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.fillStyle=c;x.beginPath();x.ellipse(30,22,26,18,-.3,0,6.3);x.fill();x.beginPath();x.ellipse(24,46,16,13,.4,0,6.3);x.fill();x.strokeStyle='#1a1410';x.lineWidth=4;x.beginPath();x.ellipse(30,22,26,18,-.3,0,6.3);x.stroke();x.fillStyle='#1a1410';x.beginPath();x.arc(44,16,4,0,6.3);x.fill();return new TH.CanvasTexture(cv);}
function flutter(){if(W.tod.night||W.se.winter)return;W.flies=[];const cols=['#f2b23a','#f2f0ea','#e86a2a','#7ab8f2'];const g=new TH.PlaneGeometry(.16,.16);g.translate(.08,0,0);
  for(let i=0;i<7;i++){const m=new TH.MeshBasicMaterial({map:wingTex(cols[i%4]),transparent:true,alphaTest:.4,side:TH.DoubleSide});const b=new TH.Group(),l=new TH.Mesh(g,m),r=new TH.Mesh(g,m);r.scale.x=-1;b.add(l,r);W.root.add(b);const base=i<4?[RPOS.garten.c[0]+(i-1.5)*1.6,RPOS.garten.c[1]]:[(i-5)*6,8+i];W.flies.push({b,l,r,base,o:i*2.1});}}
function fireflies(){if(!W.tod.night||W.se.winter)return;const n=60,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=-20+Math.random()*40;p[i*3+1]=.3+Math.random()*2;p[i*3+2]=-6+Math.random()*30;}const g=new TH.BufferGeometry();g.setAttribute('position',new TH.BufferAttribute(p,3));
  W.ffly=new TH.Points(g,new TH.PointsMaterial({size:.16,map:softTex(),color:0xd8ff8a,transparent:true,depthWrite:false,blending:TH.AdditiveBlending}));W.ffly.userData.base=p.slice();W.root.add(W.ffly);}
const MONKSAY=['Guten Morgen. Der Tee ist heiss.','Shen sagt, du machst Fortschritte.','Der Hof wird nie ganz sauber. Darum fegen wir.','Langsam gehen ist auch gehen.','Hast du heute schon geatmet? Ich meine richtig.','Das Dorf spricht von dir.','Wer früh fegt, fegt in Ruhe.','Die Koi sind heute hungrig.'];
function npcs(){if(!window.MonkKit)return;MonkKit.load(()=>{if(!W||W.ch)return;W.npcs=[];
  const mk=(robe,skin,hair,cfg)=>{const o=MonkKit.npc(robe,skin,hair);if(!o)return;o.traverse(c=>{if(c.isMesh)c.castShadow=true;});W.root.add(o);const mx=new TH.AnimationMixer(o),A={};MonkKit.gltf.animations.forEach(c=>A[c.name]=mx.clipAction(c));
    ['Idle','Walk','Stance'].forEach(n=>{if(A[n]){A[n].play();A[n].setEffectiveWeight(0);}});const N=Object.assign({o,mx,A,i:0,wait:0,mode:cfg.mode,pts:cfg.pts,sp:cfg.sp||1,cur:null},cfg);o.position.set(cfg.pts[0][0],groundH(cfg.pts[0][0],cfg.pts[0][1]),cfg.pts[0][1]);
    const it={x:o.position.x,z:o.position.z,r:1.6,label:cfg.name,btn:'Grüssen',act:()=>{const t=MONKSAY[Math.floor(Math.random()*MONKSAY.length)];msg(cfg.name+': «'+t+'»');DW.bell(.8);N.wait=Math.max(N.wait,3);N.face=true;}};W.inter.push(it);N.it=it;
    if(cfg.mode==='sweep'){const br=new TH.Group();const st=new TH.Mesh(new TH.CylinderGeometry(.02,.02,1.4,6),W.M.wood);st.position.y=.7;br.add(st);const bh=new TH.Mesh(new TH.ConeGeometry(.16,.35,8),new TH.MeshStandardMaterial({color:'#b8a06a',roughness:1}));bh.position.y=.1;br.add(bh);br.position.set(.25,0,.45);br.rotation.x=.5;o.add(br);N.broom=br;}
    W.npcs.push(N);};
  mk('#c98a2a','#c99a72','#2a2420',{name:'Bruder Wei',mode:'sweep',pts:[[-4,9],[4,9],[4,13],[-4,13]],sp:.55});
  mk('#7a2e24','#a8784f','#1a1614',{name:'Schwester Lin',mode:'walk',pts:[[-7,5],[-7,19],[7,19],[7,5]],sp:1});
  mk('#4a4440','#e0b896','#c9c4bb',{name:'Bruder Tao',mode:'train',pts:[[RPOS.hof.c[0]-.5,RPOS.hof.c[1]+2.6]],face:[-1,0]});
  mk('#d9cfbd','#8a5a3a','#1a1614',{name:'Novize Kai',mode:'walk',pts:[[RPOS.garten.c[0]+2.6,RPOS.garten.c[1]-2.2],[RPOS.garten.c[0]+5.5,RPOS.garten.c[1]+3],[-2,16],[-4,6]],sp:.8});
});}
function setW(N,name){['Idle','Walk','Stance'].forEach(n=>{if(N.A[n])N.A[n].setEffectiveWeight(n===name?1:0);});if(N.cur!==name&&N.A[name]){N.A[name].reset();N.A[name].play();}N.cur=name;}
function life(){if(W.ch)return;
  const G=RPOS.garten.c;koi(G[0]-1,G[1]);
  bamboo(-20,10,26,3.2);bamboo(19,-16,18,2.6);
  const fc=W.se.winter?['#e9e6e0']:['#e8c02f','#f2f0ea','#d84a5a','#a86ad8','#f28a3a'];
  flowerBed(-7.5,5.2,2.2,1,fc,70);flowerBed(7.5,5.2,2.2,1,fc,70);flowerBed(-9,16,2,2,fc,60);flowerBed(G[0]+2,G[1]+3.6,2.5,1,fc,60);flowerBed(10,16,2,1.6,fc,50);
  [[-15.5,4],[-15.5,-4],[15.5,4],[15.5,-4],[-15.5,-14],[15.5,-14],[-8.5,22],[8.5,22],[-17,18],[17,20],[-5,-14],[5,-14]].forEach(([x,z],i)=>bush(x,z,.9+(i%3)*.2));
  smoke(RPOS.kueche.c[0]+1.2,5.1,RPOS.kueche.c[1]-1.2,10);box(.5,.9,.5,W.M.stone,RPOS.kueche.c[0]+1.2,4.3,RPOS.kueche.c[1]-1.2,1);
  birds();flutter();fireflies();npcs();}
function lifeUpdate(){const now=performance.now()/1000,dt=Math.min(.05,now-(W.lt||now));W.lt=now;const t=now;
  if(W.bcn&&W.bcn.visible){const c=W.bcn.children[0],r=W.bcn.children[1];c.rotation.y=t*.5;const near=W.av&&Math.hypot(W.av.position.x-W.bcn.position.x,W.av.position.z-W.bcn.position.z)<2.2;const tgt=near?.08:(W.bcnPulse>0?.6:.32);if(W.bcnPulse>0)W.bcnPulse-=dt;c.material.opacity+=(tgt+Math.sin(t*2.4)*.06-c.material.opacity)*.08;r.scale.setScalar(1+Math.sin(t*2.4)*.12);r.material.opacity=c.material.opacity*1.4;}
  if(W.kois)W.kois.forEach(k=>{const a=t*k.s+k.o,x=k.c[0]+Math.cos(a)*k.r,z=k.c[1]+Math.sin(a)*k.r*.8;k.f.position.x=x;k.f.position.z=z;k.f.rotation.y=Math.atan2(-Math.sin(a)*k.s,Math.cos(a)*k.s*.8)+(k.s>0?0:0);k.f.children[1].rotation.y=Math.sin(t*8+k.o)*.4;});
  if(W.smokes)W.smokes.forEach(arr=>arr.forEach(s=>{const u=s.userData;u.t=(u.t+dt*.12)%1;s.position.set(u.x+Math.sin(u.t*5+t*.3)*.4*u.t+u.t*1.2,u.y+u.t*4,u.z+u.t*.5);const k=.4+u.t*2.2;s.scale.set(k,k,k);s.material.opacity=Math.sin(u.t*Math.PI)*.32;}));
  if(W.birds)W.birds.forEach(B=>{const a=t*.12+B.o,R=26+B.d*2;B.b.position.set(Math.cos(a)*R,20+B.h+Math.sin(t*.7+B.o)*.8,-4+Math.sin(a)*R*.7);B.b.rotation.y=-a;const f=Math.sin(t*9+B.o*3)*.7;B.l.rotation.z=f;B.r.rotation.z=-f;});
  if(W.flies)W.flies.forEach(F=>{const a=t*.6+F.o;F.b.position.set(F.base[0]+Math.sin(a)*1.4+Math.sin(a*2.3)*.4,.5+Math.abs(Math.sin(a*1.7))*.9,F.base[1]+Math.cos(a*.8)*1.2);F.b.rotation.y=a;const f=Math.sin(t*22+F.o)*1.1;F.l.rotation.y=f;F.r.rotation.y=-f;});
  if(W.ffly){const p=W.ffly.geometry.attributes.position,b=W.ffly.userData.base;for(let i=0;i<p.count;i++){p.setXYZ(i,b[i*3]+Math.sin(t*.5+i)*.6,b[i*3+1]+Math.sin(t*.8+i*1.3)*.3,b[i*3+2]+Math.cos(t*.4+i)*.6);}p.needsUpdate=true;W.ffly.material.opacity=.6+Math.sin(t*3)*.3;}
  if(W.flames)W.flames.forEach((f,i)=>{f.scale.y=1.4+Math.sin(t*13+i*2)*.35;f.scale.x=1+Math.sin(t*9+i)*.12;});
  if(W.steams)W.steams.forEach((s,i)=>{s.position.y+=Math.sin(t*1.3+i)*.002;s.material.opacity=.1+Math.sin(t*1.1+i)*.05;s.lookAt(W.cam.position);});
  if(W.bambooL)W.bambooL.rotation.y=Math.sin(t*.5)*.004;
  if(W.npcs)W.npcs.forEach(N=>{N.mx.update(dt);const o=N.o;N.it.x=o.position.x;N.it.z=o.position.z;
    if(N.face&&W.av){const tgt=Math.atan2(W.av.position.x-o.position.x,W.av.position.z-o.position.z);o.rotation.y+=(((tgt-o.rotation.y+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)*Math.min(1,dt*5);}
    if(N.mode==='train'){setW(N,N.A.Stance?'Stance':'Idle');if(N.A.Stance&&N.A.Stance.time>N.A.Stance.getClip().duration-.05)N.A.Stance.time=0;if(!N.face&&N.face0==null){o.rotation.y=Math.atan2(N.facev?N.facev[0]:-1,0);}if(N.wait>0){N.wait-=dt;if(N.wait<=0)N.face=false;}return;}
    if(N.wait>0){N.wait-=dt;setW(N,'Idle');if(N.wait<=0)N.face=false;return;}
    const p=N.pts[(N.i+1)%N.pts.length],dx=p[0]-o.position.x,dz=p[1]-o.position.z,d=Math.hypot(dx,dz);
    if(W.av&&Math.hypot(W.av.position.x-o.position.x,W.av.position.z-o.position.z)<1.1){setW(N,'Idle');return;}
    if(d<.15){N.i=(N.i+1)%N.pts.length;N.wait=N.mode==='sweep'?1.5+Math.random()*2:2+Math.random()*4;return;}
    setW(N,'Walk');const s=N.sp*dt;o.position.x+=dx/d*Math.min(s,d);o.position.z+=dz/d*Math.min(s,d);o.position.y=groundH(o.position.x,o.position.z)+(W.rects.length?0:0);
    const ry=Math.atan2(dx,dz);o.rotation.y+=(((ry-o.rotation.y+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)*Math.min(1,dt*6);if(N.A.Walk)N.A.Walk.timeScale=N.sp*.95;
    if(N.broom)N.broom.rotation.z=Math.sin(t*3.2)*.45;});
}

window.DWWorld={open,close,refreshRoom,goRoom,checkin};
})();
