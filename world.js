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
function groundH(x,z){const r=Math.hypot(x,z);return sst(24,60,r)*(nz(x,z)+1.2)*5+sst(70,150,r)*(nz(x*.5,z*.5)+1.3)*30+(r>24?0:nz(x*3,z*3)*.04);}

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
    plaster:S({color:'#d9d0bf',roughness:.95,normalMap:T.stoneN,normalScale:new TH.Vector2(.15,.15)}),
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
function uvBox(geo,w,h,d,ts){const uv=geo.attributes.uv;const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/ts,uv.getY(i)*dims[f][1]/ts);}uv.needsUpdate=true;return geo;}
function add(m,p){m.castShadow=true;m.receiveShadow=true;(p||W.root).add(m);return m;}
function box(w,h,d,mat,x,y,z,ts){const g=uvBox(new TH.BoxGeometry(w,h,d),w,h,d,ts||2);const m=new TH.Mesh(g,mat);m.position.set(x,y+h/2,z);return add(m);}
function cyl(r,h,mat,x,y,z,seg,r2){const g=new TH.CylinderGeometry(r,r2==null?r:r2,h,seg||16);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*2*r/1.8,uv.getY(i)*h/1.8);const m=new TH.Mesh(g,mat);m.position.set(x,y+h/2,z);return add(m);}
function roofGeo(w,d,h){
  const g=new TH.PlaneGeometry(2,2,40,40);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){const u=p.getX(i),v=p.getZ(i),r=Math.max(Math.abs(u),Math.abs(v));const y=h*Math.pow(1-r,1.55)+h*.42*Math.pow(Math.abs(u*v),5)*Math.pow(r,3)+h*.06*(1-r);p.setXYZ(i,u*w/2,y,v*d/2);uv.setXY(i,u*w/4.4,v*d/4.4);}
  g.computeVertexNormals();return g;
}
function roof(w,d,h,x,y,z){const m=new TH.Mesh(roofGeo(w,d,h),W.M.roof);m.position.set(x,y,z);add(m);const u=new TH.Mesh(roofGeo(w,d,h),W.M.wood);u.position.set(x,y-.2,z);u.receiveShadow=true;W.root.add(u);return m;}

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
  const tint=new TH.Color(W.se.light).lerp(new TH.Color('#ffffff'),.45).multiplyScalar(.82);
  const m=new TH.Mesh(new TH.PlaneGeometry(w,h),new TH.MeshBasicMaterial({map:t,alphaTest:.45,side:TH.DoubleSide,color:tint}));
  m.geometry.translate(0,h/2,0);m.position.set(x,groundH(x,z)-.05,z);m.castShadow=true;
  m.customDepthMaterial=new TH.MeshDepthMaterial({depthPacking:TH.RGBADepthPacking,map:t,alphaTest:.45});
  W.root.add(m);W.imps.push({k,m,t,x,z,off:Math.floor(seed*8)%8,cur:-1});if(solidR)W.solids.push([x,z,solidR]);
}
function maple(x,z,s,seed){imp('maple',x,z,5.6*s,seed,.45*s);}
function pine(x,z,s,seed){const r=Math.floor(seed*97)%3;imp(['fir_a','fir_b','fir_c'][r],x,z,(r===0?16:12.5)*s,seed,.4*s);}
function impUpdate(){const c=W.cam.position;for(const it of W.imps){const dx=c.x-it.x,dz=c.z-it.z;it.m.rotation.y=Math.atan2(dx,dz);let i=(Math.round(Math.atan2(dx,dz)/(Math.PI/4))+it.off)%8;if(i<0)i+=8;if(i!==it.cur){it.cur=i;it.t.offset.set((i%4)*.25,i<4?.5:0);}}}
function grassField(){
  const g1=new TH.PlaneGeometry(.9,.7);g1.translate(0,.35,0);const g2=g1.clone();g2.rotateY(Math.PI/2);
  const merged=mergeGeos([g1,g2]);const N=2600,inst=new TH.InstancedMesh(merged,W.M.grass,N);const r=rng(4),m=new TH.Matrix4(),q=new TH.Quaternion(),sc=new TH.Vector3(),p=new TH.Vector3();let c=0;
  for(let i=0;i<N*3&&c<N;i++){const a=r()*6.28,d=8+r()*32,x=Math.cos(a)*d,z=Math.sin(a)*d;if(Math.abs(x)<2.2&&z>4)continue;if(Math.abs(x)<7&&Math.abs(z)<6)continue;if(Math.hypot(x-9,z-7)<3)continue;
    const s=.7+r()*.9;p.set(x,groundH(x,z),z);q.setFromAxisAngle(new TH.Vector3(0,1,0),r()*6.28);sc.set(s,s*(.8+r()*.5),s);m.compose(p,q,sc);inst.setMatrixAt(c++,m);}
  inst.count=c;inst.receiveShadow=true;W.root.add(inst);
}
function mergeGeos(gs){const pos=[],uv=[],nrm=[],idx=[];let o=0;gs.forEach(g=>{const P=g.attributes.position,U=g.attributes.uv,Nn=g.attributes.normal;for(let i=0;i<P.count;i++){pos.push(P.getX(i),P.getY(i),P.getZ(i));uv.push(U.getX(i),U.getY(i));nrm.push(Nn.getX(i),Nn.getY(i),Nn.getZ(i));}const I=g.index.array;for(let i=0;i<I.length;i++)idx.push(I[i]+o);o+=P.count;});const g=new TH.BufferGeometry();g.setAttribute('position',new TH.Float32BufferAttribute(pos,3));g.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));g.setAttribute('normal',new TH.Float32BufferAttribute(nrm,3));g.setIndex(idx);return g;}

/* ---------- Tempel (nach Baustufe) ---------- */
function temple(st){
  const M=W.M;W.platform=st>=1;W.walls=st>=3;
  if(st===0){const r=rng(5);for(let i=0;i<14;i++){const s=.4+r()*.7;const b=box(s*1.4,s*.6,s,M.stone,(r()-.5)*11,-.1,(r()-.5)*8,1.5);b.rotation.set(r()*.3,r()*3,r()*.3);}
    [[-2.5,-1.5,1.1],[1.8,-2.4,.6],[3.4,1.2,1.5]].forEach(([x,z,h])=>{cyl(.24,h,M.red,x,0,z,14);W.solids.push([x,z,.4]);});return;}
  box(11,.7,8,M.stone,0,0,0,2);[0,1,2].forEach(i=>box(4.2,.23,.5,M.stone,0,.7-(i+1)*.23,4.25+i*.5,2));
  [[-4.2,6.2],[4.2,6.2]].forEach(([x,z])=>{box(.6,.7,.6,M.stone,x,0,z,1);box(.9,.15,.9,M.stone,x,.7,z,1);box(.5,.45,.5,M.stone,x,.85,z,1);box(.95,.2,.95,M.stone,x,1.3,z,1);W.solids.push([x,z,.6]);
    if(st>=5){const g=new TH.Mesh(new TH.BoxGeometry(.3,.3,.3),M.glow);g.position.set(x,1.07,z);W.root.add(g);}});
  if(st<2)return;
  const ph=3.4,b=.7,xs=[-4.2,-1.4,1.4,4.2];
  xs.forEach(x=>[-2.8,2.8].forEach(z=>{cyl(.22,ph,M.red,x,b,z,16);W.solids.push([x,z,.35]);}));
  [-2.8,2.8].forEach(z=>box(9.2,.35,.4,M.wood,0,b+ph,z,1.8));[-4.2,4.2].forEach(x=>box(.4,.35,6,M.wood,x,b+ph,0,1.8));
  if(st===2){[[-5,3.4],[5,3.4],[-5,-3.4],[5,-3.4]].forEach(([x,z])=>cyl(.07,5.2,M.wood,x,b,z,6));return;}
  box(8.4,ph,.25,M.plaster,0,b,-2.6);box(.25,ph,5,M.plaster,-4.1,b,0);box(.25,ph,5,M.plaster,4.1,b,0);
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
  W.inter.push({x:0,z:-.6,r:1.3,label:'Vor dem Altar',btn:'Verneigen',act:()=>{pose('Stance',true);setTimeout(()=>W&&pose('Stance',false),1800);DW.bell(1.1);msg('Ein Moment der Stille.');}});
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

/* ---------- Himmel, Licht, Boden ---------- */
function env(se){
  const sc=W.scene;sc.fog=new TH.FogExp2(new TH.Color(se.fog),.014);
  const SUN=new TH.Vector3(-.48,.26,-.84).normalize();W.SUN=SUN;
  const sky=new TH.Mesh(new TH.SphereGeometry(400,32,16),new TH.ShaderMaterial({side:TH.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new TH.Color(se.top)},hor:{value:new TH.Color(se.hor)},bot:{value:new TH.Color(se.bot)},sunCol:{value:new TH.Color(se.sun)},sunDir:{value:SUN}},
    vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:'uniform vec3 top;uniform vec3 hor;uniform vec3 bot;uniform vec3 sunCol;uniform vec3 sunDir;varying vec3 vW;void main(){vec3 d=normalize(vW);float h=d.y;vec3 c=h>0.?mix(hor,top,pow(h,.5)):mix(hor,bot,pow(-h,.35));float s=max(dot(d,sunDir),0.);c+=sunCol*(pow(s,5.)*.5+pow(s,60.)*1.5);gl_FragColor=vec4(c,1.);}'}));
  sc.add(sky);W.sky=sky;
  sc.add(new TH.HemisphereLight(new TH.Color(se.hs),new TH.Color(se.hg),.75));
  const d=new TH.DirectionalLight(new TH.Color(se.light),2.4);d.castShadow=true;d.shadow.mapSize.set(2048,2048);const c=d.shadow.camera;c.left=-22;c.right=22;c.top=22;c.bottom=-22;c.near=1;c.far=120;d.shadow.bias=-.0005;d.shadow.normalBias=.03;sc.add(d,d.target);W.dir=d;
  const f=new TH.DirectionalLight(0x8090b0,.35);f.position.set(10,14,30);sc.add(f);
  // Boden
  const g=new TH.PlaneGeometry(320,320,220,220);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv,col=[];const r=rng(2);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=groundH(x,z);p.setY(i,y);uv.setXY(i,x/2.3,z/2.3);const k=Math.hypot(x,z)>40?.55:.85+r()*.2;const m=se.winter?[1.2,1.25,1.3]:[1,1,1];col.push(k*m[0],k*m[1],k*m[2]);}
  g.setAttribute('color',new TH.Float32BufferAttribute(col,3));g.computeVertexNormals();
  const gm=new TH.MeshStandardMaterial({map:W.tex.groundD,normalMap:W.tex.groundN,roughness:.95,vertexColors:true,color:se.winter?'#d8dde3':'#c7b9a3'});
  const ground=new TH.Mesh(g,gm);ground.receiveShadow=true;W.root.add(ground);
  // Berge
  const rr=rng(31);for(let i=0;i<16;i++){const a=Math.PI*(.8+1.4*i/15)+rr()*.1,dist=150+rr()*70,rad=30+rr()*30,h=55+rr()*55;const cg=new TH.ConeGeometry(rad,h,8,5);const cp=cg.attributes.position,cc=[];const rock=new TH.Color('#4a4642'),snow=new TH.Color('#d9dee4');
    for(let k=0;k<cp.count;k++){const y=cp.getY(k);if(y<h/2-.01){cp.setX(k,cp.getX(k)*(.85+rr()*.3));cp.setZ(k,cp.getZ(k)*(.85+rr()*.3));}const t=(cp.getY(k)+h/2)/h;const c2=rock.clone().lerp(snow,sst(.6,.78,t));cc.push(c2.r,c2.g,c2.b);}
    cg.setAttribute('color',new TH.Float32BufferAttribute(cc,3));cg.computeVertexNormals();const mm=new TH.Mesh(cg,new TH.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}));mm.position.set(Math.cos(a)*dist,h/2-6,Math.sin(a)*dist);sc.add(mm);}
  // Partikel
  const n=500,pp=new Float32Array(n*3);for(let i=0;i<n;i++){pp[i*3]=(Math.random()-.5)*60;pp[i*3+1]=Math.random()*14;pp[i*3+2]=(Math.random()-.5)*60;}
  const pg=new TH.BufferGeometry();pg.setAttribute('position',new TH.BufferAttribute(pp,3));
  const cv=document.createElement('canvas');cv.width=cv.height=32;const x=cv.getContext('2d');const gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,32,32);
  const pc=new TH.Color(se.pc);W.pts=new TH.Points(pg,new TH.PointsMaterial({size:se.ps*.8,map:new TH.CanvasTexture(cv),color:pc,transparent:true,depthWrite:false,blending:se.add?TH.AdditiveBlending:TH.NormalBlending}));sc.add(W.pts);
}

/* ---------- Avatar ---------- */
function avatar(){
  const g=new TH.Group();W.scene.add(g);W.av=g;g.position.set(0,0,12);g.rotation.y=Math.PI;
  const fb=DW.avatarGroup();fb.traverse(o=>{if(o.isMesh)o.castShadow=true;});g.add(fb);
  if(!TH.GLTFLoader)return;
  const done=gl=>{if(!W||W.av!==g)return;g.remove(fb);const m=gl.scene;m.scale.setScalar(.92);
    const U=window.__monkU||(window.__monkU={value:new TH.Color()});U.value.set(DW.robe()).convertSRGBToLinear();
    m.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const mt=o.material;if(mt&&!mt.userData.tinted){mt.userData.tinted=1;mt.roughness=Math.max(.55,mt.roughness||0);
      mt.onBeforeCompile=sh=>{sh.uniforms.robeTint=U;sh.fragmentShader='uniform vec3 robeTint;\n'+sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n{vec3 c=diffuseColor.rgb;float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b));float sat=(mx-mn)/(mx+.001);float k=smoothstep(.12,.28,mx)*(1.-smoothstep(.1,.2,sat));float lum=dot(c,vec3(.333));diffuseColor.rgb=mix(c,robeTint*clamp(lum/.5,0.,1.6),k);}');};mt.needsUpdate=true;}}});
    g.add(m);W.model=m;const mx=new TH.AnimationMixer(m),A={};gl.animations.forEach(c=>A[c.name]=mx.clipAction(c));
    W.mixer=mx;W.acts=A;['Idle','Walk'].forEach(n=>{if(A[n]){A[n].play();A[n].setEffectiveWeight(n==='Idle'?1:0);}});
    if(A.Stance){A.Stance.setLoop(TH.LoopOnce);A.Stance.clampWhenFinished=true;}};
  if(window.__monkU)window.__monkU.value.set(DW.robe()).convertSRGBToLinear();
  if(window.__monk)done(window.__monk);
  else{const L=new TH.GLTFLoader(),ok=gl=>{window.__monk=gl;done(gl);};
    const fromB64=()=>{const parse=()=>{const b=atob(window.__monkB64),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);L.parse(u.buffer,'',ok,()=>{});};
      if(window.__monkB64)return parse();const sc=document.createElement('script');sc.src='monk.js';sc.onload=parse;document.head.appendChild(sc);};
    L.load('monk.glb',ok,undefined,fromB64);}
}
function pose(name,on){const A=W.acts;if(!A||!A[name])return;const a=A[name];if(on){a.reset();a.setEffectiveWeight(1);a.fadeIn(.25);a.play();}else a.fadeOut(.3);}

/* ---------- Interaktion ---------- */
function interactables(st){
  W.inter=(W.inter||[]).concat([{x:9,z:7,r:3.2,label:'Pflaumenblüten-Pfähle',btn:'Spielen · 1 Energie',act:()=>startPoles()}]);
  if(st>=4)W.inter.push({x:0,z:5.6,r:1.8,label:'Tempelglocke',btn:'Schlagen',act:()=>{DW.bell(1.4);W.shake=.6;pose('Stance',true);setTimeout(()=>W&&pose('Stance',false),1600);if(W.bell)W.bellSwing=1;}});
  // Schriftrolle des Tages
  if(!DW.scrollFound()){const d=new Date();const r=rng(d.getFullYear()*400+d.getMonth()*31+d.getDate());const spots=[[-12,-6],[14,-4],[-8,14],[16,12],[-18,4],[6,-12],[-4,-14],[12,18]];const s=spots[Math.floor(r()*spots.length)];
    const g=new TH.Group();g.position.set(s[0],groundH(s[0],s[1])+.9,s[1]);W.root.add(g);
    const sc=new TH.Mesh(new TH.CylinderGeometry(.09,.09,.6,12),new TH.MeshStandardMaterial({color:'#e9dcc0',emissive:new TH.Color('#ffcc66'),emissiveIntensity:.8}));sc.rotation.z=Math.PI/2;g.add(sc);
    [-.32,.32].forEach(dx=>{const e=new TH.Mesh(new TH.CylinderGeometry(.12,.12,.06,12),W.M.red);e.rotation.z=Math.PI/2;e.position.x=dx;g.add(e);});
    const L=new TH.PointLight(0xffc860,1.6,6,2);g.add(L);W.scroll=g;
    W.inter.push({x:s[0],z:s[1],r:1.4,auto:true,act:()=>{DW.claimScroll();W.root.remove(g);W.scroll=null;msg('Schriftrolle des Tages gefunden · +5 Chi');}});}
}
function msg(t){const m=$('#wMsg');m.textContent=t;m.classList.add('show');clearTimeout(W.mt);W.mt=setTimeout(()=>m.classList.remove('show'),2600);}

/* ---------- Bewegung & Kollision ---------- */
function blocked(x,z,px,pz){
  if(Math.hypot(x,z)>40)return true;
  for(const s of W.solids){if(Math.hypot(x-s[0],z-s[1])<s[2])return true;}
  if(W.platform){const inP=Math.abs(x)<5.5&&Math.abs(z)<4,wasP=Math.abs(px)<5.5&&Math.abs(pz)<4,steps=Math.abs(x)<2.1&&z>=3.6&&z<5.6;if(inP&&!wasP&&!(Math.abs(px)<2.1&&pz>=3.6))return true;if(!inP&&wasP&&!steps)return true;}
  if(W.walls){if(Math.abs(x)<4.3&&z<-2.4&&z>-2.85)return true;if(Math.abs(Math.abs(x)-4.1)<.2&&z>-2.6&&z<2.6)return true;}
  return false;
}
function heightAt(x,z){if(W.platform){if(Math.abs(x)<5.5&&Math.abs(z)<4)return .7;if(Math.abs(x)<2.1&&z>=4&&z<5.6)return .7*(1-(z-4)/1.5);}return groundH(x,z);}

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
  const dist=6.5,cx=av.position.x+Math.sin(W.yaw)*dist*Math.cos(W.pitch),cz=av.position.z+Math.cos(W.yaw)*dist*Math.cos(W.pitch),cyy=av.position.y+1.4+Math.sin(W.pitch)*dist;
  const sh=W.shake>0?(Math.random()-.5)*W.shake*.15:0;W.shake=Math.max(0,(W.shake||0)-dt);
  W.cam.position.lerp(new TH.Vector3(cx+sh,Math.max(cyy,groundH(cx,cz)+.6),cz),Math.min(1,dt*6));W.cam.lookAt(av.position.x,av.position.y+1.5,av.position.z);
  W.dir.position.set(av.position.x+W.SUN.x*60,W.SUN.y*60,av.position.z+W.SUN.z*60);W.dir.target.position.set(av.position.x,0,av.position.z);
  (W.flames||[]).forEach((f,i)=>{f.scale.y=1.6+Math.sin(t*13+i*2)*.35;});
  W.flick.forEach((L,i)=>L.intensity=1.1+.3*Math.sin(t*9+i)*Math.sin(t*3.3+i));
  if(W.bell&&W.bellSwing>0){W.bellSwing=Math.max(0,W.bellSwing-dt*.5);W.bell.rotation.x=Math.sin(t*9)*.25*W.bellSwing;}
  if(W.scroll){W.scroll.rotation.y+=dt;W.scroll.position.y+=Math.sin(t*2)*.003;}
  if(W.pts&&!RM){const a=W.pts.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]-=dt*.9;a[i]+=Math.sin(t+i)*.01;if(a[i+1]<0){a[i+1]=14;a[i]=av.position.x+(Math.random()-.5)*60;a[i+2]=av.position.z+(Math.random()-.5)*60;}}W.pts.geometry.attributes.position.needsUpdate=true;}
  // Interaktion
  let near=null;for(const it of W.inter){if(Math.hypot(av.position.x-it.x,av.position.z-it.z)<it.r){if(it.auto){it.act();W.inter=W.inter.filter(x=>x!==it);break;}near=it;}}
  if(near!==W.near){W.near=near;const p=$('#wPrompt');if(near){$('#wPromptT').textContent=near.label;$('#wPromptB').textContent=near.btn;p.hidden=false;}else p.hidden=true;}
  $('#wEn').textContent=DW.energy();
  impUpdate();W.R.render(W.scene,W.cam);
}

/* ---------- Öffnen / Schliessen ---------- */
function open(){
  if(!TH){DW.toast('3D ist auf diesem Gerät nicht verfügbar');return;}
  $('#world').hidden=false;document.body.classList.add('inworld');
  const cv=$('#wgl');W={imps:[],solids:[],flick:[],inter:[],yaw:0,pitch:.32,walk:0,clock:new TH.Clock()};
  const R=new TH.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});R.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));R.setSize(window.innerWidth,window.innerHeight,false);
  R.shadowMap.enabled=true;R.shadowMap.type=TH.PCFSoftShadowMap;R.outputEncoding=TH.sRGBEncoding;R.toneMapping=TH.ACESFilmicToneMapping;R.toneMappingExposure=1.05;W.R=R;
  W.scene=new TH.Scene();W.cam=new TH.PerspectiveCamera(window.innerWidth<window.innerHeight?62:50,window.innerWidth/window.innerHeight,.1,700);W.root=new TH.Group();W.scene.add(W.root);
  W.M=mats();const se=DW.season();W.se=se;env(se);
  const st=DW.stage();temple(st);poles();path();
  const r=rng(21);let c=0,tries=0;while(c<14&&tries<500){tries++;const a=r()*6.28,d=11+r()*20,x=Math.cos(a)*d,z=Math.sin(a)*d;if(Math.abs(x)<3.2&&z>3)continue;if(Math.hypot(x-9,z-7)<8)continue;if(W.solids.some(s=>Math.hypot(x-s[0],z-s[1])<4))continue;maple(x,z,.8+r()*.5,r()*6);c++;}
  c=0;tries=0;while(c<30&&tries<800){tries++;const a=r()*6.28,d=24+r()*24,x=Math.cos(a)*d,z=Math.sin(a)*d;if(Math.abs(x)<4&&z>3)continue;if(W.solids.some(s=>Math.hypot(x-s[0],z-s[1])<3.5))continue;pine(x,z,.8+r()*.5,r()*6);c++;}
  avatar();interactables(st);controls();
  W.cam.position.set(0,6,22);W.yaw=0;
  W.onResize=()=>{R.setSize(window.innerWidth,window.innerHeight,false);W.cam.aspect=window.innerWidth/window.innerHeight;W.cam.fov=window.innerWidth<window.innerHeight?62:50;W.cam.updateProjectionMatrix();};window.addEventListener('resize',W.onResize);
  $('#wHint').classList.remove('gone');msg(st===0?'Die Ruinen deines Tempels. Baue sie mit deinen Ritualen auf.':'Willkommen in deiner Welt');
  loop();
}
function close(){
  if(!W)return;cancelAnimationFrame(W.raf);window.removeEventListener('resize',W.onResize);window.removeEventListener('keydown',W.kd);window.removeEventListener('keyup',W.ku);
  if(W.av)W.scene.remove(W.av);
  W.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});Object.values(W.tex||{}).forEach(t=>t.dispose());Object.values(W.impT||{}).forEach(t=>t.dispose());W.R.dispose();
  W=null;$('#world').hidden=true;$('#wPrompt').hidden=true;document.body.classList.remove('inworld');DW.refresh();
}

/* =================== MINISPIEL: PFLAUMENBLÜTEN-PFÄHLE =================== */
let G=null;
function startPoles(){
  if(!DW.spendEnergy(1)){msg('Keine Energie mehr. Erledige Rituale, um neue zu bekommen.');return;}
  const cv=$('#gc'),x=cv.getContext('2d');$('#game').hidden=false;$('#gEnd').hidden=true;
  const N=9,r=rng(Date.now()%100000);
  G={cv,x,N,i:0,lives:3,t:0,phase:0,speed:1.6,zone:.34,needle:0,state:'ready',hops:null,wob:0,poles:Array.from({length:N},(_,k)=>.38+r()*.16),last:performance.now(),best:DW.best('poles')};
  g3dStart();sizeG();$('#gInfo').textContent='Tippe, wenn die Nadel im hellen Bereich ist.';
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
  if(G.state==='play'){G.phase+=dt*G.speed;G.needle=Math.sin(G.phase*2.2)*.75+Math.sin(G.phase*5.3)*.25*Math.min(1,G.i/4);}
  if(G.state==='hop'){G.hop+=dt*2.4;if(G.hop>=1){G.i++;G.speed+=.32;G.zone=Math.max(.12,G.zone-.025);G.phase=Math.random()*3;if(G.i>=G.N-1){G.state='end';endPoles(true);}else G.state='play';}}
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
  x.font='700 15px Rubik,system-ui,sans-serif';x.textAlign='center';x.fillStyle='#ecebe6';x.fillText(`Pfahl ${Math.min(G.i+1,G.N)} / ${G.N}`,cx,cy+28);
  for(let l=0;l<3;l++){x.fillStyle=l<G.lives?'#ff4b2b':'rgba(255,255,255,.2)';x.beginPath();x.arc(cx-18+l*18,cy+46,5,0,7);x.fill();}
  if(G.state==='ready'){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,h*.45,w,70);x.fillStyle='#fff';x.font='800 22px Rubik,system-ui,sans-serif';x.fillText('Tippen zum Starten',cx,h*.45+44);}
}
function endPoles(win){
  const reached=win?G.N:G.i;const chi=reached*2+(win?10:0);const best=Math.max(G.best||0,reached);DW.setBest('poles',best);
  $('#gEnd').hidden=false;$('#gEndT').textContent=win?'Gemeistert':'Gefallen';$('#gEndS').textContent=`${reached} von ${G.N} Pfählen · Bestwert ${best}`;$('#gEndC').textContent=`+${chi} Chi`;
  G.reward=chi;if(win)DW.bell(1.3);
}
$('#game').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;gTap();});
window.addEventListener('keydown',e=>{if(G&&!$('#game').hidden&&(e.key===' '||e.key==='Enter')){e.preventDefault();gTap();}});
$('#gExit').onclick=()=>finishG();
$('#gDone').onclick=()=>finishG();
$('#gAgain').onclick=()=>{const c=G&&G.reward;finishG(true);startPoles();};
function finishG(again){if(!G)return;cancelAnimationFrame(G.raf);g3dEnd();const chi=G.state==='end'?G.reward:0;G=null;$('#game').hidden=true;if(chi){DW.gameReward(chi,'Pflaumenblüten-Pfähle');if(W)msg('+'+chi+' Chi gutgeschrieben');}}
window.addEventListener('resize',()=>{if(G)sizeG();});

window.DWWorld={open,close};
})();
