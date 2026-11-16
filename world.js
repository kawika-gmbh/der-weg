/* Der Weg – Spielmodus: begehbare Welt + Minispiel Pflaumenblüten-Pfähle */
(function(){
'use strict';
const TH=window.THREE;
const $=s=>document.querySelector(s);
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
    const L=new TH.PointLight(0xffb070,1.2,7,2);L.position.set(cx,y+2.2,cz);W.root.add(L);W.flick.push(L);}
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
  W.roomSpot[id]=spot;
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
    const hm=new TH.Mesh(new TH.BoxGeometry(2.2*s,1.6*s,1.8*s),M.plaster);hm.position.set(x,base+.8*s,z);g.add(hm);
    const rf=new TH.Mesh(new TH.ConeGeometry(1.8*s,1.1*s,4),M.roof);rf.position.set(x,base+1.6*s+.5*s,z);rf.rotation.y=Math.PI/4;g.add(rf);
    if(W.tod.night||lamp){const l=new TH.Mesh(new TH.BoxGeometry(.3,.3,.05),M.glow);l.position.set(x,base+.8*s,z+.92*s);g.add(l);}}
  if(lvl>=1){const w=new TH.Mesh(new TH.CylinderGeometry(.8,.8,.6,12),M.stone);w.position.set(0,base+.3,60);g.add(w);for(let i=0;i<5;i++){const f=new TH.Mesh(new TH.PlaneGeometry(6,3),new TH.MeshStandardMaterial({color:i%2?'#8a8a3a':'#6f7a2e'}));f.rotation.x=-Math.PI/2;f.position.set(-16+i*6.5,base+.05,74);g.add(f);}}
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
    W.inter.push({x:sp[0],z:sp[2],r:ins?1.3:1.8,label:r.open?what+' · '+r.n:r.n+' · verschlossen',btn:r.open?'Benutzen':'Ansehen',act:()=>roomDialog(id)});});
}
function roomDialog(id){
  const r=DW.rooms().find(x=>x.id===id);$('#wDlgK').textContent=r.n;
  if(!r.open){dlgK(r.n,`Diese Tür ist verschlossen. Hier lernst du: ${r.d}. Mit jedem neuen Rang darfst du eine Tür öffnen. Sprich mit Meister Shen, wenn du bereit bist.`,[['Verstanden',()=>endTalk(),1]]);return;}
  const btns=[];let text=r.d+'.';
  if(!r.rit.length)text+=' Hier hast du noch keine Routine.';
  r.rit.forEach(x=>{const st=x.done?'✓ erledigt':!x.due?'heute nicht fällig':x.sub;text+=`\n${x.done?'✓':'○'} ${x.name} · ${st}`;
    if(!x.done&&x.due)btns.push([x.label+': '+x.name,()=>{endTalk();DW.doRitual(x.id);setTimeout(refreshRoom,400);},1]);});
  r.rit.forEach(x=>{if(x.editable)btns.push(['Bearbeiten: '+x.name,()=>{endTalk();DW.editRitual(x.id);}]);});
  if(DW.slotsFree()>0)btns.push(['Neue Routine hier',()=>{endTalk();DW.newRitual(id);}]);
  r.arch.forEach(x=>{if(DW.slotsFree()>0)btns.push(['Zurückholen: '+x.name,()=>{DW.unarchive(x.id);roomDialog(id);}]);});
  if(id==='halle')btns.push(['Verneigen',()=>{endTalk();pose('Stance',true);setTimeout(()=>W&&pose('Stance',false),1800);DW.bell(1.1);DW.day('_qa',1);DW.day('_qb2',0);msg('Ein Moment der Stille.');}]);
  if(id==='tor'){const v=DW.village(),cost=Object.entries(v.ev.cost).map(([k,c])=>`${v.paid[k]||0}/${c} ${DW.pts().find(p=>p.k===k).n}`).join(' · ');text+=`\n\nDas Dorf im Tal (${v.stufe}, ${v.done} Hilfen): ${v.ev.n}. ${v.ok?'Diese Woche bereits erledigt.':'Benötigt: '+cost+'.'}`;
    if(!v.ok)btns.push(['Punkte investieren',()=>{const res=DW.invest();endTalk();msg(res.full?'Das Dorf dankt dir! '+v.ev.rw:res.any?'Investiert. Es fehlt noch etwas.':'Dir fehlen die passenden Punkte.');if(res.full){DW.bell(1.4);}}]);}
  if(id==='tor')DW.pilgrims().forEach(p=>{if(p.open)btns.push(['Pilgerreise: '+p.n+(p.visited?' (diese Woche besucht)':''),()=>{endTalk();close();open({pilgrim:p.ch});}]);else text+=`\n· ${p.n}: ab Rang ${p.rankName}`;});
  btns.push(['Gehen',()=>endTalk()]);
  dlgK(r.n,text,btns);
}
function dlgK(k,text,btns){dlg(text,btns);$('#wDlgK').textContent=k;}
function refreshRoom(){if(W)ptsHud();}
function ptsHud(){let el=$('#wPts');if(!el){el=document.createElement('div');el.id='wPts';el.className='w-pts';$('#world').appendChild(el);}el.innerHTML=DW.pts().map(p=>`<span><i style="background:${p.c}"></i>${p.n.slice(0,3)} <b>${p.v}</b></span>`).join('');}

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
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=groundH(x,z);p.setY(i,y);uv.setXY(i,x/2.3,z/2.3);const k=Math.hypot(x,z)>40?.55:.85+r()*.2;const m=se.winter?[1.2,1.25,1.3]:[1,1,1];col.push(k*m[0],k*m[1],k*m[2]);}
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
  const b=st===0?' Diese Ruinen waren einmal ein Tempel. Jedes Ritual, das du lebst, setzt einen Stein zurück.':st<3?' Die Mauern wachsen. Langsam, aber sie wachsen.':st<5?' Sieh dich um. Das hast du mit deinen Ritualen gebaut.':' Der Tempel steht. Jetzt geht es darum, ihn zu halten.';
  return a+b;
}
function dlg(text,btns){const d=$('#wDlg');$('#wDlgK').textContent='Meister Shen';$('#wDlgT').textContent=text;const B=$('#wDlgB');B.innerHTML='';btns.forEach(([l,f,pri])=>{const b=document.createElement('button');b.textContent=l;if(pri)b.className='pri';b.onclick=()=>{DW.tick();f();};B.appendChild(b);});d.hidden=false;$('#wPrompt').hidden=true;if(!W.talking)W.talkPos=W.av.position.clone();W.talking=true;}
function endTalk(){$('#wDlg').hidden=true;if(W){W.talking=false;W.near=null;}}
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
  cv.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const left=e.clientX<window.innerWidth*.45;
    if(left&&jid===null){jid=e.pointerId;jx=e.clientX;jy=e.clientY;joy.style.left=(jx-60)+'px';joy.style.top=(jy-60)+'px';joy.classList.add('on');}
    else if(lid===null){lid=e.pointerId;lx=e.clientX;ly=e.clientY;}
    $('#wHint').classList.add('gone');});
  cv.addEventListener('pointermove',e=>{
    if(e.pointerId===jid){let dx=e.clientX-jx,dy=e.clientY-jy;const l=Math.hypot(dx,dy),m=50;if(l>m){dx=dx/l*m;dy=dy/l*m;}knob.style.transform=`translate(${dx}px,${dy}px)`;W.mv.x=dx/m;W.mv.z=dy/m;}
    if(e.pointerId===lid){W.yaw-=(e.clientX-lx)*.006;W.pitch=Math.max(.05,Math.min(.9,W.pitch+(e.clientY-ly)*.004));lx=e.clientX;ly=e.clientY;}});
  const up=e=>{if(e.pointerId===jid){jid=null;W.mv.x=W.mv.z=0;knob.style.transform='';joy.classList.remove('on');}if(e.pointerId===lid)lid=null;};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  W.kd=e=>{W.keys[e.key.toLowerCase()]=true;if(e.key==='e'&&W.near)W.near.act();};W.ku=e=>{W.keys[e.key.toLowerCase()]=false;};
  window.addEventListener('keydown',W.kd);window.addEventListener('keyup',W.ku);
  $('#wPromptB').onclick=()=>{if(W.near)W.near.act();};
  $('#wExit').onclick=close;
}

/* ---------- Loop ---------- */
function loop(){
  if(!W)return;W.raf=requestAnimationFrame(loop);
  if(!$('#game').hidden)return;
  const dt=Math.min(.05,W.clock.getDelta()),t=W.clock.elapsedTime;
  let mx=W.mv.x,mz=W.mv.z;const K=W.keys;if(K.w||K.arrowup)mz=-1;if(K.s||K.arrowdown)mz=1;if(K.a||K.arrowleft)mx=-1;if(K.d||K.arrowright)mx=1;
  const ml=Math.min(1,Math.hypot(mx,mz)),av=W.av;
  if(ml>.08){const sy=Math.sin(W.yaw),cy=Math.cos(W.yaw);const dx=(mx*cy+mz*sy),dz=(-mx*sy+mz*cy);const sp=4.6*ml*dt;const nx=av.position.x+dx/ml*sp*ml,nz2=av.position.z+dz/ml*sp*ml;
    if(!blocked(nx,nz2,av.position.x,av.position.z)){av.position.x=nx;av.position.z=nz2;}else if(!blocked(nx,av.position.z,av.position.x,av.position.z))av.position.x=nx;else if(!blocked(av.position.x,nz2,av.position.x,av.position.z))av.position.z=nz2;
    const target=Math.atan2(dx,dz);let d=target-av.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;av.rotation.y+=d*Math.min(1,dt*10);W.walk+=dt*ml*9;}
  else W.walk*=.9;
  const gy=heightAt(av.position.x,av.position.z);av.position.y+=(gy+Math.abs(Math.sin(W.walk))*.06*ml-av.position.y)*Math.min(1,dt*14);
  if(W.mixer){const A=W.acts,wk=Math.min(1,ml*1.2);if(A.Walk){A.Walk.setEffectiveWeight(wk);A.Walk.timeScale=.6+ml*.9;}if(A.Idle)A.Idle.setEffectiveWeight(1-wk);W.mixer.update(dt);}
  if(av.userData.torso){const b=1+Math.sin(t*1.3)*.012;av.userData.torso.scale.set(b,1,b);av.rotation.z=Math.sin(W.walk)*.04*ml;}
  // Kamera
  const inHut=W.huts&&Object.values(W.huts).find(h=>av.position.x>h.x0-.2&&av.position.x<h.x1+.2&&av.position.z>h.z0-.2&&av.position.z<h.z1+.2);if(inHut!==W.inHut){if(W.inHut)W.inHut.roof.forEach(m=>m.visible=true);if(inHut)inHut.roof.forEach(m=>m.visible=false);W.inHut=inHut;}
  const dist=inHut?3.4:6.5,cx=av.position.x+Math.sin(W.yaw)*dist*Math.cos(W.pitch),cz=av.position.z+Math.cos(W.yaw)*dist*Math.cos(W.pitch),cyy=av.position.y+1.4+Math.sin(W.pitch)*dist;
  const sh=W.shake>0?(Math.random()-.5)*W.shake*.15:0;W.shake=Math.max(0,(W.shake||0)-dt);
  if(inHut){const hx=(inHut.x0+inHut.x1)/2,hz=(inHut.z0+inHut.z1)/2;const tx=Math.max(inHut.x0+.4,Math.min(inHut.x1-.4,hx+(hx-av.position.x)*.6)),tz=Math.max(inHut.z0+.4,Math.min(inHut.z1-.4,hz+(hz-av.position.z)*.6));W.cam.position.lerp(new TH.Vector3(tx,3.15,tz),Math.min(1,dt*6));}
  else W.cam.position.lerp(new TH.Vector3(cx+sh,Math.max(cyy,groundH(cx,cz)+.6),cz),Math.min(1,dt*6));W.cam.lookAt(av.position.x,av.position.y+1.5,av.position.z);
  W.dir.position.set(av.position.x+W.SUN.x*60,W.SUN.y*60,av.position.z+W.SUN.z*60);W.dir.target.position.set(av.position.x,0,av.position.z);
  (W.flames||[]).forEach((f,i)=>{f.scale.y=1.6+Math.sin(t*13+i*2)*.35;});
  W.flick.forEach((L,i)=>L.intensity=1.1+.3*Math.sin(t*9+i)*Math.sin(t*3.3+i));
  if(W.bell&&W.bellSwing>0){W.bellSwing=Math.max(0,W.bellSwing-dt*.5);W.bell.rotation.x=Math.sin(t*9)*.25*W.bellSwing;}
  if(W.glint){const dd=Math.hypot(av.position.x-W.scrollSpot[0],av.position.z-W.scrollSpot[1]);W.glint.material.opacity=dd<5?Math.max(0,Math.sin(t*3))*.9*(1-dd/5):0;W.glint.scale.setScalar(1+Math.sin(t*6)*.4);}
  if(W.pts&&!RM){const a=W.pts.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]-=dt*.9;a[i]+=Math.sin(t+i)*.01;if(a[i+1]<0){a[i+1]=14;a[i]=av.position.x+(Math.random()-.5)*60;a[i+2]=av.position.z+(Math.random()-.5)*60;}}W.pts.geometry.attributes.position.needsUpdate=true;}
  // Interaktion
  let near=null;for(const it of W.inter){if(Math.hypot(av.position.x-it.x,av.position.z-it.z)<it.r){if(it.auto){it.act();W.inter=W.inter.filter(x=>x!==it);break;}near=it;}}
  if(W.talking)near=W.near;if(near!==W.near){W.near=near;const p=$('#wPrompt');if(near){$('#wPromptT').textContent=near.label;$('#wPromptB').textContent=near.btn;p.hidden=false;}else p.hidden=true;}
  $('#wEn').textContent=DW.energy();
  if(W.npcMix){W.npcMix.update(dt);const o=W.npc,dx=av.position.x-o.position.x,dz=av.position.z-o.position.z;if(Math.hypot(dx,dz)<5){let d=Math.atan2(dx,dz)-o.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;o.rotation.y+=d*Math.min(1,dt*3);}}
  if(W.foeMix){W.foeMix.update(dt);const o=W.foe;o.position.y+=Math.sin(t*1.7)*.0015;const dx=av.position.x-o.position.x,dz=av.position.z-o.position.z;let d=Math.atan2(dx,dz)-o.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;o.rotation.y+=d*Math.min(1,dt*2);}
  if(W.smoke){const a=W.smoke.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]+=dt*.35;a[i]+=Math.sin(t+i)*.004;if(a[i+1]>2.4)a[i+1]=0;}W.smoke.geometry.attributes.position.needsUpdate=true;}
  if(W.talking&&W.talkPos&&Math.hypot(av.position.x-W.talkPos.x,av.position.z-W.talkPos.z)>2.5)endTalk();
  if(W.fallTex)W.fallTex.offset.y+=dt*1.6;
  if(W.flagsArr.length&&!RM)W.flagsArr.forEach((f,i)=>{f.rotation.x=Math.sin(t*3+i*.7)*.25;});
  impUpdate();W.R.render(W.scene,W.cam);
}

/* ---------- Öffnen / Schliessen ---------- */
function open(opts){opts=opts||{};
  if(!TH){DW.toast('3D ist auf diesem Gerät nicht verfügbar');return;}
  $('#world').hidden=false;document.body.classList.add('inworld');
  const cv=$('#wgl');W={noGo:[],rects:[],flagsArr:[],imps:[],solids:[],flick:[],inter:[],yaw:0,pitch:.32,walk:0,clock:new TH.Clock()};
  const R=new TH.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});R.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));R.setSize(window.innerWidth,window.innerHeight,false);
  R.shadowMap.enabled=true;R.shadowMap.type=TH.PCFSoftShadowMap;R.outputEncoding=TH.sRGBEncoding;R.toneMapping=TH.ACESFilmicToneMapping;R.toneMappingExposure=1.05;W.R=R;
  W.scene=new TH.Scene();W.cam=new TH.PerspectiveCamera(window.innerWidth<window.innerHeight?62:50,window.innerWidth/window.innerHeight,.1,700);W.root=new TH.Group();W.scene.add(W.root);
  W.tod=TOD[DW.tod()]||TOD.dusk;W.M=mats();W.pilgrim=opts.pilgrim||0;W.ch=W.pilgrim;window._worldCh=W.ch;const se=W.ch===3?Object.assign({},DW.season(),DW.seasonData('winter')||{},{winter:true}):DW.season();W.se=se;env(se);
  const st=5,ch=W.pilgrim;W.ch=ch;W.noGo=[];W.rects=[];W.flagsArr=[];
  if(ch>0){BUILD[ch](5);W.meisterPos=W.meisterPos||[-3,0,4];}else{W.ch=0;W.rects=[];temple(5);path();poles();kloster();}
  W.noGo.push([ch===2?3.6:0,12,5],[ch===2?3.6:0,18,4]);
  const ng=(x,z,m)=>W.noGo.some(n=>Math.hypot(x-n[0],z-n[1])<n[2]+(m||0))||(W.edgeZ&&z>W.edgeZ-3);
  const r=rng(21);let c=0,tries=0;while(c<(ch===3?0:ch===1?6:14)&&tries<500){tries++;const a=r()*6.28,d=11+r()*20,x=Math.cos(a)*d,z=Math.sin(a)*d;if(ng(x,z,3))continue;if(Math.abs(x)<3.2&&z>3)continue;if(Math.hypot(x-9,z-7)<8)continue;if(W.solids.some(s=>Math.hypot(x-s[0],z-s[1])<4))continue;maple(x,z,.8+r()*.5,r()*6);c++;}
  c=0;tries=0;while(c<(ch===3?0:30)&&tries<800){tries++;const a=r()*6.28,d=24+r()*24,x=Math.cos(a)*d,z=Math.sin(a)*d;if(ng(x,z,3))continue;if(Math.abs(x)<4&&z>3)continue;if(W.solids.some(s=>Math.hypot(x-s[0],z-s[1])<3.5))continue;pine(x,z,.8+r()*.5,r()*6);c++;}
  if(ch!==3)grassField();
  {let room=opts.room;const h=new Date().getHours();if(!room&&h>=4&&h<12){const z=DW.rooms().find(r=>r.id==='zelle');if(z&&z.rit.some(x=>x.type==='window'&&x.due&&!x.done))room='zelle';}
   if(room){W.autoRoom=room;W.spawnRoom=room;}}
  if(!ch)W.meisterPos=[-4.2,0,8.6];if(W.spawnRoom){const id=W.spawnRoom,ins=W.roomSpot&&W.roomSpot[id],sp=ins?[ins[0],.35,ins[1]]:spotOf(id),P=RPOS[id];const tx=ins?(id==='zelle'?ins[0]-P.f[0]*1.1:P.c[0]-P.f[0]*2):P.c[0],tz=ins?ins[1]:P.c[1];W.spawnAt=[sp[0],sp[1],sp[2],tx-sp[0],tz-sp[2]];}applyTod();avatar();interactables(5);meister(5);if(!ch)shadowFoe();controls();ptsHud();
  if(ch){const sp=[W.ch===2?3.6:0,12];W.inter.push({x:sp[0],z:sp[1]+1.5,r:1.4,label:'Heimweg ins Kloster',btn:'Zurück',act:()=>{close();open({room:'tor'});}});if(DW.pilgrimVisit(ch))setTimeout(()=>W&&msg('Pilgerreise: +20 Punkte'),1200);}
  if(W.autoRoom)setTimeout(()=>{if(W)roomDialog(W.autoRoom);},900);
  $('#wDlgX').onclick=()=>endTalk();
  W.cam.position.set(0,6,22);W.yaw=0;
  W.onResize=()=>{R.setSize(window.innerWidth,window.innerHeight,false);W.cam.aspect=window.innerWidth/window.innerHeight;W.cam.fov=window.innerWidth<window.innerHeight?62:50;W.cam.updateProjectionMatrix();};window.addEventListener('resize',W.onResize);
  $('#wHint').classList.remove('gone');msg(st===0?'Die Ruinen deines Tempels. Baue sie mit deinen Ritualen auf.':'Willkommen in deiner Welt');
  loop();
}
function close(){
  if(!W)return;cancelAnimationFrame(W.raf);window.removeEventListener('resize',W.onResize);window.removeEventListener('keydown',W.kd);window.removeEventListener('keyup',W.ku);
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

window.DWWorld={open,close,refreshRoom};
})();
