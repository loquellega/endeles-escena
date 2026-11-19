/* ---------- Endeles Escena ----------
   El mismo bosque, para teatro: escucha a Alquimia EEG OSC por WebSocket (puerto 9203)
   y cada persona que se pone el casco es un bosque distinto.
   · firma: los primeros segundos con el casco deciden la estructura (semilla, apertura, relieve, agua, fauna)
   · clima vivo: las bandas y métricas modulan niebla, viento, bruma, esporas, luz y animales
   · diez cámaras y una lista de cues con GO (barra espaciadora o /endeles/go por OSC al 9210)
   Contrato: endeles-escena-contrato.md. Este archivo se inserta dentro del programa de Endeles al construir escena.html. */
if(ESCENA)ESCN=(()=>{
const QS=new URLSearchParams(location.search);
const VENT=clamp(+QS.get('calibracion')||45,5,600);
const BANDAS=['alpha','theta','betaL','betaH','gamma'];
const SENALES={alpha:'band/alpha/norm',theta:'band/theta/norm',betaL:'band/betaL/norm',betaH:'band/betaH/norm',gamma:'band/gamma/norm',
  relaxation:'metric/relaxation',stress:'metric/stress',attention:'metric/attention',engagement:'metric/engagement',excitement:'metric/excitement',interest:'metric/interest'};
const ETIQ={alpha:'alfa',theta:'theta',betaL:'beta baja',betaH:'beta alta',gamma:'gamma',relaxation:'relajación',stress:'estrés',attention:'atención'};
// el clima vivo: cada fila suma (señal − 0.5) × 2 × peso al parámetro; tau es el suavizado en segundos
const MAPEO_DEF=[
  {de:'alpha',a:'lejania',peso:.3,tau:3},{de:'alpha',a:'bruma',peso:-.25,tau:3},
  {de:'betaH',a:'viento',peso:.8,tau:2},{de:'betaH',a:'sombra',peso:-.15,tau:3},
  {de:'theta',a:'bruma',peso:.3,tau:4},{de:'theta',a:'oleaje',peso:.45,tau:3},
  {de:'gamma',a:'esporas',peso:.55,tau:1.5},
  {de:'relaxation',a:'luz',peso:.35,tau:6},{de:'relaxation',a:'tono',peso:.1,tau:6},
  {de:'attention',a:'vineta',peso:.3,tau:4},{de:'stress',a:'contraste',peso:.2,tau:5}
];
const ANIMALES=['pajaro','grillos','ranas','cuervos','carpintero','buho'];
const TRANS=['corte','recorrido','fundido'],CURVAS=['suave','lineal','entrada','salida'];
const EASE={lineal:u=>u,suave:u=>u*u*(3-2*u),entrada:u=>u*u*u,salida:u=>1-Math.pow(1-u,3)};
const r2=v=>Math.round(v*100)/100;

/* ---------- montaje: cámaras, cues y mapeo ---------- */
function camDe(n,nombre,x,z,alto,lx,lz,ly,lente){const y0=groundOrWater(x,z)+alto,ty=ly!=null?groundOrWater(lx,lz)+ly:groundOrWater(lx,lz)+1.4,dx=lx-x,dz=lz-z;
  return{n,nombre,x:r2(x),z:r2(z),alto,yaw:+Math.atan2(-dx,-dz).toFixed(3),pitch:+Math.atan2(ty-y0,Math.hypot(dx,dz)).toFixed(3),lente:lente||62};}
function montajeDef(){
  const S=n=>DEFAULT_SRC.find(s=>s.nombre===n)||{x:0,z:0};
  const cam=(n,nom,src,dx,dz,alto,ly,lente)=>{const s=S(src);return camDe(n,nom,s.x+dx,s.z+dz,alto,s.x,s.z,ly,lente);};
  return{formato:'endeles-montaje',version:1,casco:2,intensidad:1,
    camaras:[camDe(1,'Claro',0,8,1.65,0,-20),camDe(2,'Estanque',POND.x+20,POND.z-6,1.8,POND.x,POND.z,.2),camDe(3,'Orilla baja',POND.x+9,POND.z+12,.7,POND.x-5,POND.z,.3,50),
      camDe(4,'Desde arriba',6,30,16,0,-10,0,70),cam(5,'Campanas','Campanas de vidrio',5,3,1.65,2.5),cam(6,'Raíces','Coro de raíces',4,5,.9,1.2,48),
      cam(7,'Arroyo','Arroyo',-5,-3,1.4,.4),cam(8,'Latido','Latido',-5,2,1.65,1.6,40),cam(9,'Grillos','Grillos',3,-6,1.2,.6),cam(10,'Cuervos','Cuervos',-4,5,1.5,7,74)],
    cues:[{n:1,nombre:'Apertura',cam:1,trans:'fundido',dur:4},{n:2,nombre:'Hacia el agua',cam:2,trans:'recorrido',dur:14,curva:'suave',altura:2},
      {n:3,nombre:'Orilla',cam:3,trans:'corte'},{n:4,nombre:'Desde arriba',cam:4,trans:'recorrido',dur:18,curva:'suave',altura:4},
      {n:5,nombre:'Campanas',cam:5,trans:'fundido',dur:3},{n:6,nombre:'Raíces',cam:6,trans:'recorrido',dur:16,curva:'suave',altura:1.5},
      {n:7,nombre:'Latido',cam:8,trans:'corte'},{n:8,nombre:'Cierre',cam:1,trans:'fundido',dur:5}],
    mapeo:MAPEO_DEF.map(m=>Object.assign({},m))};
}
let M=null;
function limpiar(m){
  const d=montajeDef();if(!m||m.formato!=='endeles-montaje')return d;
  const out={formato:'endeles-montaje',version:1,casco:[1,2,3].includes(+m.casco)?+m.casco:2,intensidad:clamp(+m.intensidad||1,0,2),camaras:[],cues:[],mapeo:[]};
  for(let i=0;i<10;i++){const c=(m.camaras||[]).find(c=>c&&+c.n===i+1);out.camaras[i]=c&&isFinite(c.x)&&isFinite(c.z)?{n:i+1,nombre:String(c.nombre||'Cámara '+(i+1)).slice(0,40),x:+c.x,z:+c.z,alto:clamp(+c.alto||1.65,.2,80),yaw:+c.yaw||0,pitch:clamp(+c.pitch||0,-1.5,1.5),lente:clamp(+c.lente||62,15,110)}:d.camaras[i];}
  (Array.isArray(m.cues)?m.cues:d.cues).forEach((c,i)=>{if(!c)return;out.cues.push({n:i+1,nombre:String(c.nombre||'Cue '+(i+1)).slice(0,40),cam:clamp(Math.round(+c.cam)||1,1,10),trans:TRANS.includes(c.trans)?c.trans:'corte',
    dur:clamp(+c.dur||4,.5,600),curva:CURVAS.includes(c.curva)?c.curva:'suave',altura:clamp(+c.altura||0,0,40),clima:CLIMAS.some(([n])=>n===c.clima)?c.clima:''});});
  (Array.isArray(m.mapeo)?m.mapeo:d.mapeo).forEach(r=>{if(r&&SENALES[r.de]&&PDEF[r.a])out.mapeo.push({de:r.de,a:r.a,peso:clamp(+r.peso||0,-3,3),tau:clamp(+r.tau||2,.1,60)});});
  return out;
}
function guardar(){store.set('escena.montaje',M);if(document.activeElement!==$('eJson'))$('eJson').value=JSON.stringify(M,null,1);}
function cargarMontaje(m,origen){M=limpiar(m);MAP=M.mapeo.map(r=>Object.assign({v:0},r));SIG=0;ACT=-1;SEL=0;guardar();pintarTodo();if(origen)aviso('montaje '+origen);}

/* ---------- interfaz ---------- */
const css=document.createElement('style');css.textContent=`
body.escena #mision,body.escena #bPista,body.escena #bLinea,body.escena #bSem,body.escena #tPistas,body.escena #wPistas,body.escena #bUmbral3,body.escena #start,body.escena #xinasOv,body.escena #cierre,body.escena #coach{display:none!important}
#escFade{position:fixed;inset:0;z-index:3;background:#000;opacity:0;pointer-events:none}
#escHud{position:fixed;z-index:4;left:max(8px,env(safe-area-inset-left,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));color:var(--dim);font-variant-numeric:tabular-nums;background:rgba(0,0,0,.6);padding:4px 7px;border:1px solid #444;max-width:calc(100% - 200px)}
#escHud b{color:var(--fg);font-weight:normal}#escHud .vivo{color:#7dff9b}
body.sinui #escHud{display:none}
#wEsc .cue{display:grid;grid-template-columns:22px 1fr auto;gap:6px;text-align:left;border-color:#444}
#wEsc .cue.sig{border-color:var(--fg);border-style:dashed}#wEsc .cue.act{background:var(--fg);color:var(--ink)}
#wEsc .cue span:last-child{color:var(--dim)}#wEsc .cue.act span:last-child{color:#333}
#wEsc .cams button{padding:4px 0}#wEsc .cams button.on{outline:1px solid var(--fg)}
#wEsc .sen{display:grid;grid-template-columns:62px 1fr 30px;gap:6px;align-items:center;color:var(--dim)}#wEsc .sen output{color:var(--fg);text-align:right}
#wEsc .meter.vivo i{background:#7dff9b}
#escIni .box p{font-size:13px}`;
document.head.appendChild(css);
document.body.classList.add('escena');document.title='Endeles Escena';
const fadeEl=document.createElement('div');fadeEl.id='escFade';document.body.appendChild(fadeEl);
const hud=document.createElement('div');hud.id='escHud';document.body.appendChild(hud);
const sel=(id,ops)=>`<select id="${id}">${ops.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>`;
const win=document.createElement('section');win.className='win';win.id='wEsc';
win.innerHTML=`<h3>Escena <span id="eEst">sin puente</span></h3><div class="in">
<div class="lf"><input type="text" id="ePuente" aria-label="puente WebSocket" placeholder="localhost:9203"><button id="eConectar">conectar</button></div>
<div class="flex"><label class="chk"><input type="checkbox" id="eSim"> simulación</label><span class="note">casco</span>${sel('eCasco',[[1,'1 · EPOC+'],[2,'2 · Insight'],[3,'3 · otro']])}</div>
<div class="sub">persona</div><div id="eColor" style="height:6px;background:#555"></div><p class="note" id="ePers"></p><div class="meter"><i id="eCal"></i></div>
<div class="flex"><button id="eNueva">nueva persona</button><button id="eFijar">fijar ahora</button></div>
<div class="sub">clima vivo</div><div id="eSen" class="in" style="padding:0;gap:3px"></div>
<div class="row"><span>intensidad</span><input id="eInt" type="range" min="0" max="2" step="0.05"><output id="oInt"></output></div>
<label class="chk"><input type="checkbox" id="eCong"> congelar el clima vivo</label>
<label class="chk"><input type="checkbox" id="eDeriva"> deriva con el giroscopio</label>
<div class="sub">cues <span id="eCueN"></span></div><div id="eCues" class="plist"></div>
<div class="flex"><button id="eGo" class="on">GO ␣</button><button id="eAtras">‹ atrás</button><button id="eLibre">cámara libre</button></div>
<div class="in" style="padding:0"><input type="text" id="ecNom" aria-label="nombre del cue">
<div class="row" style="grid-template-columns:78px 1fr"><span>cámara</span>${sel('ecCam',Array.from({length:10},(_,i)=>[i+1,i+1]))}</div>
<div class="row" style="grid-template-columns:78px 1fr"><span>transición</span>${sel('ecTr',TRANS.map(t=>[t,t]))}</div>
<div class="row"><span>duración</span><input id="ecDur" type="range" min="0.5" max="60" step="0.5"><output id="oecDur"></output></div>
<div class="row" style="grid-template-columns:78px 1fr"><span>curva</span>${sel('ecCur',CURVAS.map(t=>[t,t]))}</div>
<div class="row"><span>altura</span><input id="ecAlt" type="range" min="0" max="20" step="0.5"><output id="oecAlt"></output></div>
<div class="row" style="grid-template-columns:78px 1fr"><span>clima</span>${sel('ecCli',[['','sin cambio']].concat(CLIMAS.map(([n])=>[n,n])))}</div>
<div class="flex"><button id="ecMas">+ cue</button><button id="ecSub">↑</button><button id="ecBaj">↓</button><button id="ecDel">borrar</button></div></div>
<div class="sub">cámaras · 1–0 corte · Shift+número guarda</div><div class="grid3 cams" id="eCams" style="grid-template-columns:repeat(5,1fr)"></div>
<div class="lf"><input type="text" id="eCamNom" aria-label="nombre de la cámara"><button id="eGuardar">guardar vista</button></div>
<div class="sub">montaje</div>
<div class="flex"><button id="eExp">exportar</button><button id="eImp">aplicar</button><button id="eDesc">descargar</button><button id="eCargar">cargar…</button><input type="file" id="eArchivo" accept=".json,application/json" hidden></div>
<textarea id="eJson" spellcheck="false" aria-label="montaje en JSON"></textarea>
<p class="note">Cada persona es un bosque: al ponerse el casco, «nueva persona» mide ${VENT} s y fija su bosque. Después, sus ondas mueven el clima. Cámaras y cues se guardan en este navegador; descarga el montaje para llevarlo a otra computadora (junto a escena.html como montaje.json). Teclas: espacio GO · B atrás · [ ] elegir siguiente · 1–0 cámara · Shift+1–0 guardar vista · WASD camina libre · Q/Z sube y baja · H oculta.</p>
</div>`;
$('col').prepend(win);
{const h=win.querySelector('h3'),x=document.createElement('button');x.className='wx';x.textContent='×';x.setAttribute('aria-label','cerrar');x.onclick=()=>{win.hidden=true;tb.classList.remove('on');};h.appendChild(x);}
const tb=document.createElement('button');tb.textContent='escena';tb.className='on';$('bInfo').after(tb);tb.onclick=()=>{win.hidden=!win.hidden;tb.classList.toggle('on',!win.hidden);};
$('bInfo').textContent='i · Endeles Escena';
$('wClima').hidden=true;$('tClima').classList.remove('on');
const SENV=['alpha','theta','betaL','betaH','gamma','relaxation','stress','attention'];
$('eSen').innerHTML=SENV.map(k=>`<div class="sen"><span>${ETIQ[k]}</span><div class="meter" id="em_${k}"><i></i></div><output id="eo_${k}">—</output></div>`).join('')+`<div class="sen"><span>calidad</span><div class="meter" id="em_q"><i></i></div><output id="eo_q">—</output></div>`;
let avisoT2=0;function aviso(t){hud.dataset.msg=t;avisoT2=performance.now();}

/* ---------- puente y datos ---------- */
let ws=null,wsUrl=QS.get('puente')||store.get('escena.puente','localhost:9203'),conectado=false,ultimo=0,reintento=null,sim=QS.get('sim')==='1';
const D={};
const pre=()=>'/eeg/'+M.casco+'/';
const num=k=>{const v=D[pre()+SENALES[k]];return typeof v==='number'&&isFinite(v)?v:null;};
function conectar(){
  clearTimeout(reintento);if(ws){ws.onclose=null;try{ws.close();}catch(e){}ws=null;}conectado=false;
  if(sim)return;let url=wsUrl.trim();if(!/^wss?:\/\//.test(url))url='ws://'+url;
  try{ws=new WebSocket(url);}catch(e){aviso('dirección inválida');return;}
  ws.onopen=()=>{conectado=true;aviso('puente conectado');};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(err){return;}recibir(m);};
  ws.onclose=()=>{conectado=false;ws=null;reintento=setTimeout(conectar,2000);};
  ws.onerror=()=>{};
}
function recibir(m){
  if(m.cabecera){alLlegarCabecera(m.cabecera);return;}
  if(m.d)Object.assign(D,m.d);ultimo=performance.now();
  if(Array.isArray(m.ev))for(const[addr,a]of m.ev){
    if(addr===pre()+'blink')parpadeo();
    else if(addr.startsWith('/endeles/'))comando(addr,a||[]);
    else if(addr==='/eeg/marca')aviso('marca: '+(a||[]).join(' '));
  }
}
function alLlegarCabecera(h){
  const id=String(h.id||''),f=id&&store.get('escena.firma.'+id,null);
  if(f){aplicarFirma(f,id);aviso('sesión '+id+': bosque guardado');}else{nuevaPersona(id);aviso('sesión '+id+(h.persona?' · '+h.persona:'')+': midiendo');}
}
// simulación interna: para probar sin puente (también en Pixera)
let SIMP=null;
function simPersona(){const r=mulberry((Date.now()&0xffffff)+7);SIMP={};BANDAS.forEach(b=>SIMP[b]=.25+r()*.5);SIMP.relaxation=.3+r()*.4;SIMP.stress=.2+r()*.4;SIMP.attention=.3+r()*.4;SIMP.f=.6+r()*.8;}
function simular(t,dt){
  if(!SIMP)simPersona();const p=pre();
  BANDAS.forEach((b,i)=>{D[p+SENALES[b]]=clamp(SIMP[b]+.22*Math.sin(t*.09*SIMP.f*(1+i*.31)+i*1.7)+.07*Math.sin(t*.37*(1+i*.2)+i)+(Math.random()-.5)*.04,0,1);});
  ['relaxation','stress','attention'].forEach((k,i)=>{D[p+SENALES[k]]=clamp(SIMP[k]+.2*Math.sin(t*.03+i*2),0,1);});
  D[p+'valid']=1;D[p+'quality']=.9;D[p+'gyro']=[.3*Math.sin(t*.11),.15*Math.sin(t*.07)];ultimo=performance.now();
  if(Math.random()<dt/(3+SIMP.f*3))parpadeo();
}

/* ---------- comandos (OSC /endeles/… o teclado) ---------- */
function comando(addr,a){
  const c=addr.slice(9);
  if(c==='go')go();else if(c==='cue')irCue(+a[0]);else if(c==='cam')corte(+a[0]);else if(c==='back')atras();
  else if(c==='persona/nueva')nuevaPersona();else if(c==='persona/fijar')fijar();
  else if(c==='clima/congelar'){CONG=!!+a[0];$('eCong').checked=CONG;}
  else if(c==='clima'){const i=Math.round(+a[0])-1;if(i>=0&&i<CLIMAS.length)setClima(i);}
  else if(c==='fade')fundirA(clamp(+a[0]||0,0,1),Math.max(0,+a[1]||0));
  else if(c==='ui')setHud(!!+a[0]);
  else if(c==='libre')soltar();
}

/* ---------- firma: cada persona es un bosque ---------- */
const FIRMA={estado:'sin',t:0,n:0,s:{},q:{},m:{},parp:0,id:null,vec:null};
function nuevaPersona(id){HOJA.maskObj=0;Object.assign(FIRMA,{estado:'calibrando',t:0,n:0,s:{},q:{},m:{},parp:0,id:id||null,vec:null});if(sim)simPersona();pintarPersona();}
function acumular(dt,vivo){
  if(FIRMA.estado!=='calibrando'||!vivo)return;
  FIRMA.t+=dt;FIRMA.n++;
  for(const b of BANDAS){const v=num(b);if(v==null)continue;FIRMA.s[b]=(FIRMA.s[b]||0)+v;FIRMA.q[b]=(FIRMA.q[b]||0)+v*v;}
  for(const k of ['relaxation','stress']){const v=num(k);if(v!=null){const o=FIRMA.m[k]||(FIRMA.m[k]=[0,0]);o[0]+=v;o[1]++;}}
  if(FIRMA.t>=VENT)fijar();
}
function fijar(){
  if(FIRMA.estado!=='calibrando')return;
  if(FIRMA.n<5){FIRMA.estado='sin';aviso('sin datos válidos: el bosque no cambió');pintarPersona();return;}
  const n=FIRMA.n,mu=b=>(FIRMA.s[b]||0)/n,sd=b=>Math.sqrt(Math.max(0,(FIRMA.q[b]||0)/n-mu(b)**2));
  const met=k=>FIRMA.m[k]&&FIRMA.m[k][1]?FIRMA.m[k][0]/FIRMA.m[k][1]:.5;
  const vec=BANDAS.map(mu).concat(BANDAS.map(sd),[FIRMA.parp/Math.max(FIRMA.t/60,.1),met('relaxation'),met('stress')]).map(r2);
  if(FIRMA.id)store.set('escena.firma.'+FIRMA.id,vec);
  aplicarFirma(vec,FIRMA.id);
}
let RIQ=.6,BASE_ESC=null;
function aplicarFirma(vec,id){
  const[a,t,bl,bh,g,...rest]=vec,sdm=(rest[0]+rest[1]+rest[2]+rest[3]+rest[4])/5,br=rest[5]||0,rel=rest[6]??.5,str=rest[7]??.5;
  let h=2166136261;for(const c of vec.join(',')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  const ap=clamp(.5+(a-(bl+bh)/2)*1.2,0,1),pal=paletaDe(vec,h);
  RIQ=clamp(.15+g*.5+sdm*2+br/60,0,1);
  BASE_ESC={densidad:r2(.5+.45*(1-ap)),marea:r2(.3+.6*t),bruma:r2(.15+.55*t),tono:r2(clamp(.5+.35*rel-.2*str,.1,.95)),luz:r2(.75+.6*rel),sol:Math.round(12+40*rel),lejania:r2(.35+.45*ap)};
  const mundo={semilla:1+((h>>>0)%999),arboles:Math.round(8+12*ap),relieve:r2(.35+1.5*bh),escala:r2(clamp(.6+sdm*4,.4,2.5))};
  Object.assign(FIRMA,{estado:'fija',vec,id:id||FIRMA.id,mundo,ap,pal});
  cortina(()=>{Object.assign(W,mundo);syncMapUI();buildWorld();setTargets(BASE_ESC,0);applyDensity();climaNom='persona';$('climaNom').textContent='persona';climaBtns.forEach(b=>b.classList.remove('on'));
    if(FIJA)ponerPose(poseDe(FIJA));shadowDirty=true;
    HOJA.colA.copy(pal.a);HOJA.colB.copy(pal.b);HOJA.cantObj=pal.cant;HOJA.cant=pal.cant*.4;HOJA.mask=0;HOJA.maskObj=1;});
  pintarPersona();
}
FAUNA=s=>{const k=ANIMALES.indexOf(s.sintesis);if(k<0)return 1;return(k<Math.round(1+5*RIQ)?1:0)*(1-.85*ESTRES);};

/* ---------- hojas: el bosque es gris hasta que una persona le imprime su color ----------
   Crecen en las puntas reales de las ramas (treeGeo guarda dónde quedan) y se mueven con el mismo viento.
   Escriben alfa < 1 como las gemas: la película las deja en color en vez de pasarlas a gris. */
// silueta de hoja: abanico desde el centro, con el borde redondeado y una leve curva en la nervadura
const hojaGeo=(()=>{const R=[[0,0],[.06,.05],[.1,.12],[.11,.19],[.08,.27],[0,.34],[-.08,.27],[-.11,.19],[-.1,.12],[-.06,.05]],c=[0,.16,.025],v=[];
  for(let i=0;i<R.length;i++){const a=R[i],b=R[(i+1)%R.length];v.push(c[0],c[1],c[2],a[0],a[1],Math.abs(a[0])*.12,b[0],b[1],Math.abs(b[0])*.12);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;})();
const HOJA={cant:.35,cantObj:.35,mask:0,maskObj:0,colA:new THREE.Color(.55,.55,.55),colB:new THREE.Color(.7,.7,.7),mallas:[]};
const hojaMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,
  uniforms:{uT:PU.uT,uWind:U.uWind,uFogD:PU.uFogD,uFog:{value:fog.color},uMask:{value:0},uColA:{value:HOJA.colA},uColB:{value:HOJA.colB}},
  vertexShader:`attribute vec4 aSw;attribute vec2 aR;uniform float uT,uWind;uniform vec3 uColA,uColB;varying vec3 vC,vN;varying float vD;
void main(){vec4 w=instanceMatrix*vec4(position,1.);float hh=max(aSw.z,0.);
  float sw=(sin(uT*1.1+aSw.x*.21+aSw.y*.17)+.4*sin(uT*2.7+aSw.x*.5))*uWind*.0032*hh*hh*aR.y;
  float c=cos(aSw.w),s=sin(aSw.w);w.x+=c*sw+s*sw*.6;w.z+=-s*sw+c*sw*.6;
  float fl=sin(uT*(2.+aR.x*3.)+aR.x*40.)*(.03+.1*uWind);w.y+=fl;w.x+=fl*.5;
  vN=normalize(mat3(instanceMatrix)*normal);vec4 mv=viewMatrix*w;vD=-mv.z;gl_Position=projectionMatrix*mv;vC=mix(uColA,uColB,aR.x);}`,
  fragmentShader:`uniform vec3 uFog;uniform float uFogD,uMask;varying vec3 vC,vN;varying float vD;
void main(){float d=abs(dot(normalize(vN),normalize(vec3(.35,.85,.4))));vec3 c=vC*(.45+.7*d);float f=exp(-pow(uFogD*vD,2.));
  gl_FragColor=vec4(mix(uFog,c,f),1.-f*uMask);}`});
function hojas(){
  HOJA.mallas.forEach(m=>{scene.remove(m);m.dispose();m.geometry.dispose();});HOJA.mallas=[];
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e3=new THREE.Euler(),v3=new THREE.Vector3(),s3=new THREE.Vector3(),rng=mulberry(W.semilla*53+9);let total=0;
  chunks.forEach(c=>{
    const L=[];
    c.groups.forEach(g=>{const tips=g.hi.geometry.userData.tips;if(!tips||!tips.length)return;const e=new Float32Array(16);
      for(let i=0;i<g.n;i++){g.hi.getMatrixAt(i,m4);m4.toArray(e);const tx=e[12],tz=e[14],rot=Math.atan2(-e[2],e[0]),sc=Math.hypot(e[0],e[2]);
        for(let k=0;k<tips.length;k+=3){v3.set(tips[k],tips[k+1],tips[k+2]);const hh=tips[k+1];v3.applyMatrix4(m4);
          for(let j=0;j<3;j++)L.push([v3.x+(rng()-.5)*1.1*sc,v3.y+(rng()-.5)*.8*sc,v3.z+(rng()-.5)*1.1*sc,tx,tz,hh,rot,sc,rng(),i/g.n]);}}});
    if(!L.length){c.hojas=null;return;}
    for(let i=L.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[L[i],L[j]]=[L[j],L[i]];}   // al azar: «cantidad» toma una muestra pareja
    const geo=hojaGeo.clone(),sw=new Float32Array(L.length*4),ar=new Float32Array(L.length*2),mesh=new THREE.InstancedMesh(geo,hojaMat,L.length);
    L.forEach((h,i)=>{e3.set(rng()*6.28,rng()*6.28,rng()*6.28);q.setFromEuler(e3);const z=(1.6+rng()*1.6)*Math.max(.7,h[7]);v3.set(h[0],h[1],h[2]);s3.set(z,z,z);m4.compose(v3,q,s3);mesh.setMatrixAt(i,m4);
      sw.set([h[3],h[4],h[5],h[6]],i*4);ar.set([h[8],h[7]],i*2);});
    geo.setAttribute('aSw',new THREE.InstancedBufferAttribute(sw,4));geo.setAttribute('aR',new THREE.InstancedBufferAttribute(ar,2));
    mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.visible=false;mesh.userData.n=L.length;mesh.count=Math.round(L.length*HOJA.cant);
    scene.add(mesh);HOJA.mallas.push(mesh);c.hojas=mesh;total+=L.length;});
  HOJA.total=total;
}
buildWorld=(orig=>function(){orig.apply(this,arguments);hojas();})(buildWorld);
hojas();
function pasoHojas(dt,vivo){
  const k=1-Math.exp(-dt/2.5);HOJA.mask+=(HOJA.maskObj-HOJA.mask)*(1-Math.exp(-dt/(HOJA.maskObj>HOJA.mask?6:2)));
  const cantAnt=HOJA.cant;HOJA.cant+=(HOJA.cantObj-HOJA.cant)*k;
  const at=vivo?(num('attention')??.5):.5;hojaMat.uniforms.uMask.value=HOJA.mask*(.75+.25*at);
  const camb=Math.abs(HOJA.cant-cantAnt)>1e-4;
  chunks.forEach(c=>{if(!c.hojas)return;c.hojas.visible=c.groups.some(g=>g.hi.visible);if(camb)c.hojas.count=Math.round(c.hojas.userData.n*HOJA.cant*P.densidad);});
}
// color de la persona: tonos fríos a amarillos (violeta, azul, verde, amarillo), nunca rojos ni naranjas
function paletaDe(vec,h){
  const[a,t,bl,bh,g,...rest]=vec,sdm=(rest[0]+rest[1]+rest[2]+rest[3]+rest[4])/5,rel=rest[6]??.5,r=((h>>>0)%1000)/1000;
  const hue=.15+.63*clamp(.5+(a+t-bl-bh)*.8+(r-.5)*.3,0,1),sat=.45+.5*clamp(sdm*4,0,1);
  const hue2=clamp(hue+(r-.5)*.14,.13,.8);
  return{a:new THREE.Color().setHSL(hue,sat,.48),b:new THREE.Color().setHSL(hue2,sat*.85,.62),cant:r2(clamp(.3+.5*g+.4*rel,.25,1))};
}

/* ---------- clima vivo ---------- */
let MAP=[],CONG=false,ESTRES=.3,DERIVA=false,gyroS=[0,0];
const GUARDA={};
let tPrev=0;
function antes(t,dt0,now){
  // reloj real (el bosque limita su paso por cuadro): la medición dura lo mismo con 60 o con 10 fps
  const dt=tPrev?Math.min(.5,(now-tPrev)/1000):dt0;tPrev=now;
  if(sim)simular(t,dt);
  const p=pre(),vivo=sim||(now-ultimo<1500&&D[p+'valid']===1);
  acumular(dt,vivo);
  const offs={},k1=x=>1-Math.exp(-dt/x);
  if(!CONG)for(const r of MAP){const v=num(r.de);const obj=vivo&&v!=null?(v-.5)*2:0;r.v+=(obj-r.v)*k1(vivo?r.tau:1.7);}
  for(const r of MAP)offs[r.a]=(offs[r.a]||0)+r.v*r.peso*M.intensidad;
  const st=num('stress');if(!CONG)ESTRES+=((vivo&&st!=null?st:.3)-ESTRES)*k1(4);
  const q=D[p+'quality'];if(!sim&&typeof q==='number'&&q<.6)offs.lejania=(offs.lejania||0)-(.6-q)*.5;
  const gy=D[p+'gyro'];if(Array.isArray(gy)){gyroS[0]+=(gy[0]-gyroS[0])*k1(1.5);gyroS[1]+=(gy[1]-gyroS[1])*k1(1.5);}
  for(const k in offs){GUARDA[k]=P[k];P[k]=clamp(P[k]+offs[k],PDEF[k][1],PDEF[k][2]);}
  pasoFundido(now);pasoHojas(dt,vivo);
  if(now-hudT>120){hudT=now;pintarVivo(vivo,now);}
}
function despues(){for(const k in GUARDA){P[k]=GUARDA[k];delete GUARDA[k];}}
function parpadeo(){if(FIRMA.estado==='calibrando')FIRMA.parp++;flash=Math.max(flash,.1);
  if(audioOn){try{const t0=ctx.currentTime,b=2200+Math.random()*1200,out=ambBus||listener.getInput();for(let i=0;i<3;i++)ping(out,t0+i*.11,b*(1+i*.05),'sine',.035,.1,b*1.4);}catch(e){}}}

/* ---------- cámaras y cues ---------- */
let FIJA=null,ANIM=null,ALTO=0,ACT=-1,SIG=0,SEL=0;
const poseActual=()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw:camera.rotation.y,pitch:camera.rotation.x,fov:camera.fov});
const poseDe=c=>({x:c.x,y:groundOrWater(c.x,c.z)+c.alto,z:c.z,yaw:c.yaw,pitch:c.pitch,fov:c.lente||62});
function lente(f){if(Math.abs(camera.fov-f)<.01)return;camera.fov=f;camera.updateProjectionMatrix();PU.uScale.value=innerHeight*renderer.getPixelRatio()/(2*Math.tan(THREE.MathUtils.degToRad(f/2)));chunkDirty=true;}
function ponerPose(p){camera.position.set(p.x,p.y,p.z);camera.rotation.set(p.pitch,p.yaw,0);pos.x=p.x;pos.z=p.z;eyeY=p.y;yaw=p.yaw;pitch=p.pitch;lente(p.fov);}
const bez=(a,c,b,u)=>(1-u)*(1-u)*a+2*(1-u)*u*c+u*u*b;
function holgura(x,z){let m=99;const gx=Math.floor(x/10),gz=Math.floor(z/10);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const c=GRID.get((gx+i)+','+(gz+j));if(c)for(const t of c){if(t.vi===6||t.i>=t.m.count)continue;m=Math.min(m,Math.hypot(x-t.x,z-t.z)-t.rad);}}return m;}
// el recorrido es una curva entre las dos cámaras que esquiva los troncos: prueba desvíos a los lados hasta encontrar uno libre
function trayecto(a,b,altura){
  const dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz)||1,nx=-dz/L,nz=dx/L;let mejor=[(a.x+b.x)/2,(a.z+b.z)/2],mm=-1;
  for(const k of[0,.12,-.12,.25,-.25,.4,-.4]){const cx=(a.x+b.x)/2+nx*k*L,cz=(a.z+b.z)/2+nz*k*L;let m=99;
    for(let i=1;i<48;i++){const u=i/48;m=Math.min(m,holgura(bez(a.x,cx,b.x,u),bez(a.z,cz,b.z,u)));}
    if(m>1.1){mejor=[cx,cz];break;}if(m>mm){mm=m;mejor=[cx,cz];}}
  return{a,b,cx:mejor[0],cz:mejor[1],altura};
}
function transicion(c,tipo,dur,curva,altura){
  if(!c)return;FIJA=null;stopRoute();
  if(tipo==='corte'||dur<=0){ANIM=null;FIJA=c;ponerPose(poseDe(c));return;}
  ANIM={tipo,c,t0:performance.now(),ms:dur*1000,curva:curva||'suave',cortado:false};
  if(tipo==='recorrido')ANIM.tr=trayecto(poseActual(),poseDe(c),altura||0);
}
function camara(now){
  if(ANIM){const u=clamp((now-ANIM.t0)/ANIM.ms,0,1),e=EASE[ANIM.curva]||EASE.suave;
    if(ANIM.tipo==='recorrido'){const T=ANIM.tr,k=e(u),x=bez(T.a.x,T.cx,T.b.x,k),z=bez(T.a.z,T.cz,T.b.z,k),b=poseDe(ANIM.c),yb=unwrap(b.yaw,T.a.yaw);
      ponerPose({x,z,y:Math.max(T.a.y+(b.y-T.a.y)*k+T.altura*Math.sin(Math.PI*k),groundOrWater(x,z)+.6),yaw:T.a.yaw+(yb-T.a.yaw)*k,pitch:T.a.pitch+(b.pitch-T.a.pitch)*k,fov:T.a.fov+(b.fov-T.a.fov)*k});}
    else{NEGRO=u<.5?e(u*2):1-e((u-.5)*2);if(u>=.5&&!ANIM.cortado){ANIM.cortado=true;ponerPose(poseDe(ANIM.c));}}
    if(u>=1){FIJA=ANIM.c;NEGRO=0;ANIM=null;}
    if(ANIM)return true;
  }
  if(FIJA){const p=poseDe(FIJA);if(DERIVA){p.yaw-=gyroS[0]*.12;p.pitch+=gyroS[1]*.08;}ponerPose(p);return true;}
  return false;
}
function trasMover(){if(!FIJA&&!ANIM&&!playing)camera.position.y+=ALTO;}
function soltar(){if(!FIJA&&!ANIM)return;const p=poseActual();FIJA=ANIM=null;NEGRO=0;ALTO=p.y-(groundOrWater(p.x,p.z)+1.65);pos.x=p.x;pos.z=p.z;eyeY=p.y-ALTO;yaw=p.yaw;pitch=p.pitch;pintarCues();}
function ejecutar(i){const c=M.cues[i];if(!c)return;ACT=i;SIG=Math.min(i+1,M.cues.length);SEL=i;
  if(c.clima){const k=CLIMAS.findIndex(([n])=>n===c.clima);if(k>=0)setClima(k);}
  transicion(M.camaras[c.cam-1],c.trans,c.trans==='corte'?0:c.dur,c.curva,c.altura);pintarCues();pintarEditor();}
function go(){if(SIG<M.cues.length)ejecutar(SIG);}
function atras(){if(ACT>0){const c=M.cues[ACT-1];ACT--;SIG=ACT+1;SEL=ACT;transicion(M.camaras[c.cam-1],'corte');pintarCues();pintarEditor();}}
function irCue(n){const i=M.cues.findIndex(c=>c.n===n);if(i>=0)ejecutar(i);}
function corte(n){const c=M.camaras[n-1];if(c){transicion(c,'corte');pintarCues();}}
function guardarVista(n){const p=poseActual(),prev=M.camaras[n-1];M.camaras[n-1]={n,nombre:prev?prev.nombre:'Cámara '+n,x:r2(p.x),z:r2(p.z),alto:r2(p.y-groundOrWater(p.x,p.z)),yaw:+p.yaw.toFixed(3),pitch:+p.pitch.toFixed(3),lente:Math.round(p.fov)};
  guardar();pintarCams();aviso('vista guardada en la cámara '+n);}

/* ---------- fundidos ---------- */
let NEGRO=0,FUN={v:0,a:0,b:0,t0:0,ms:0};
function fundirA(v,seg){FUN={v:FUN.v,a:FUN.v,b:v,t0:performance.now(),ms:seg*1000};if(seg<=0)FUN.v=v;}
function pasoFundido(now){if(FUN.ms>0){const u=clamp((now-FUN.t0)/FUN.ms,0,1);FUN.v=FUN.a+(FUN.b-FUN.a)*u*u*(3-2*u);if(u>=1)FUN.ms=0;}
  const o=Math.max(FUN.v,NEGRO,CORT);fadeEl.style.opacity=o.toFixed(3);}
// cortina: baja a negro, cambia el bosque y vuelve a abrir (para que el público no vea el salto)
let CORT=0;function cortina(cb){const t0=performance.now();const paso=()=>{const u=(performance.now()-t0)/900;CORT=Math.min(1,u);if(u<1)requestAnimationFrame(paso);else{cb();const t1=performance.now();const sube=()=>{const v=(performance.now()-t1)/1600;CORT=Math.max(0,1-v);if(v<1)requestAnimationFrame(sube);};setTimeout(()=>requestAnimationFrame(sube),150);}};paso();}

/* ---------- pintar la interfaz ---------- */
let hudT=0;
function pintarPersona(){
  const f=FIRMA;$('eCal').style.width=(f.estado==='calibrando'?Math.min(100,f.t/VENT*100):f.estado==='fija'?100:0)+'%';
  $('eColor').style.background=f.estado==='fija'?`linear-gradient(90deg,#${f.pal.a.getHexString()},#${f.pal.b.getHexString()})`:'#555';
  $('ePers').textContent=f.estado==='calibrando'?`midiendo la firma… ${Math.floor(f.t)} de ${VENT} s con señal válida`+(f.id?` · ${f.id}`:''):
    f.estado==='fija'?`bosque ${f.mundo.semilla} · árboles cada ${f.mundo.arboles} m · relieve ${f.mundo.relieve} · hojas ${Math.round(f.pal.cant*100)}% · fauna ${Math.round(RIQ*100)}%`+(f.id?` · ${f.id}`:''):
    'sin persona: bosque base. Pulsa «nueva persona» cuando alguien se ponga el casco.';
}
function pintarVivo(vivo,now){
  for(const k of SENV){const v=num(k),m=$('em_'+k);m.firstChild.style.width=(v==null?0:v*100)+'%';m.classList.toggle('vivo',vivo&&v!=null);$('eo_'+k).textContent=v==null?'—':v.toFixed(2);}
  const q=D[pre()+'quality'];$('em_q').firstChild.style.width=(typeof q==='number'?q*100:0)+'%';$('eo_q').textContent=typeof q==='number'?q.toFixed(2):'—';
  const est=sim?'simulación':conectado?(vivo?'en vivo':'sin señal válida'):'sin puente';$('eEst').textContent=est;
  if(FIRMA.estado==='calibrando')pintarPersona();
  const c=M.cues[ACT],s=M.cues[SIG];const msg=now-avisoT2<4000?hud.dataset.msg:'';
  hud.innerHTML=`<span class="${vivo?'vivo':''}">●</span> ${est} · ${FIRMA.estado==='calibrando'?'midiendo '+Math.floor(FIRMA.t)+'/'+VENT+' s':FIRMA.estado==='fija'?'bosque '+FIRMA.mundo.semilla:'bosque base'} · cue <b>${c?c.n+' '+esc(c.nombre):'—'}</b>${FIJA||ANIM?'':' (libre)'} · siguiente <b>${s?s.n+' '+esc(s.nombre):'fin'}</b>${msg?' · '+esc(msg):''}`;
}
function pintarCues(){
  $('eCueN').textContent=M.cues.length;
  $('eCues').innerHTML=M.cues.map((c,i)=>`<button class="cue${i===ACT?' act':''}${i===SIG?' sig':''}" data-i="${i}"><span>${c.n}</span><span>${esc(c.nombre)}</span><span>cám ${c.cam} · ${c.trans}${c.trans!=='corte'?' '+c.dur+' s':''}</span></button>`).join('');
  $('eCues').querySelectorAll('button').forEach(b=>b.onclick=()=>{SEL=SIG=+b.dataset.i;pintarCues();pintarEditor();});
  pintarCams();
}
function pintarCams(){
  const actual=FIJA?FIJA.n:null;
  $('eCams').innerHTML=M.camaras.map(c=>`<button data-n="${c.n}" class="${c.n===actual?'on':''}" title="${esc(c.nombre)}">${c.n%10}</button>`).join('');
  $('eCams').querySelectorAll('button').forEach(b=>b.onclick=()=>{corte(+b.dataset.n);$('eCamNom').value=M.camaras[+b.dataset.n-1].nombre;$('eCamNom').dataset.n=b.dataset.n;});
}
function pintarEditor(){
  const c=M.cues[SEL];const dis=!c;['ecNom','ecCam','ecTr','ecDur','ecCur','ecAlt','ecCli','ecSub','ecBaj','ecDel'].forEach(id=>$(id).disabled=dis);if(!c)return;
  $('ecNom').value=c.nombre;$('ecCam').value=c.cam;$('ecTr').value=c.trans;$('ecDur').value=c.dur;$('oecDur').textContent=c.dur+' s';$('ecCur').value=c.curva;$('ecAlt').value=c.altura;$('oecAlt').textContent=c.altura+' m';$('ecCli').value=c.clima||'';
}
function pintarTodo(){$('eCasco').value=M.casco;$('eInt').value=M.intensidad;$('oInt').textContent=Math.round(M.intensidad*100)+'%';pintarCues();pintarEditor();pintarPersona();}
const editar=(k,v)=>{const c=M.cues[SEL];if(!c)return;c[k]=v;guardar();pintarCues();pintarEditor();};
$('ecNom').oninput=e=>{const c=M.cues[SEL];if(c){c.nombre=e.target.value.slice(0,40);guardar();pintarCues();}};
$('ecCam').onchange=e=>editar('cam',+e.target.value);$('ecTr').onchange=e=>editar('trans',e.target.value);$('ecCur').onchange=e=>editar('curva',e.target.value);$('ecCli').onchange=e=>editar('clima',e.target.value);
$('ecDur').oninput=e=>editar('dur',+e.target.value);$('ecAlt').oninput=e=>editar('altura',+e.target.value);
const renum=()=>M.cues.forEach((c,i)=>c.n=i+1);
$('ecMas').onclick=()=>{const libre=M.camaras.find(c=>c.n===(FIJA?FIJA.n:0));M.cues.splice(SEL+1,0,{n:0,nombre:'Cue nuevo',cam:libre?libre.n:1,trans:'corte',dur:4,curva:'suave',altura:0,clima:''});SEL++;renum();guardar();pintarCues();pintarEditor();};
$('ecDel').onclick=()=>{if(!M.cues[SEL])return;M.cues.splice(SEL,1);renum();SEL=Math.min(SEL,M.cues.length-1);if(ACT>=M.cues.length)ACT=-1;SIG=Math.min(SIG,M.cues.length);guardar();pintarCues();pintarEditor();};
const mover=d=>{const j=SEL+d;if(j<0||j>=M.cues.length)return;[M.cues[SEL],M.cues[j]]=[M.cues[j],M.cues[SEL]];SEL=j;renum();guardar();pintarCues();pintarEditor();};
$('ecSub').onclick=()=>mover(-1);$('ecBaj').onclick=()=>mover(1);
$('eGo').onclick=go;$('eAtras').onclick=atras;$('eLibre').onclick=soltar;
$('eGuardar').onclick=()=>{const n=+$('eCamNom').dataset.n||(FIJA?FIJA.n:1);guardarVista(n);const nom=$('eCamNom').value.trim();if(nom){M.camaras[n-1].nombre=nom.slice(0,40);guardar();}};
$('eCamNom').oninput=e=>{const n=+e.target.dataset.n;if(n&&M.camaras[n-1]){M.camaras[n-1].nombre=e.target.value.slice(0,40);guardar();}};
$('eNueva').onclick=()=>nuevaPersona();$('eFijar').onclick=fijar;
$('eInt').oninput=e=>{M.intensidad=+e.target.value;$('oInt').textContent=Math.round(M.intensidad*100)+'%';guardar();};
$('eCong').onchange=e=>{CONG=e.target.checked;};$('eDeriva').onchange=e=>{DERIVA=e.target.checked;};
$('eCasco').onchange=e=>{M.casco=+e.target.value;guardar();};
$('ePuente').value=wsUrl;$('eSim').checked=sim;
$('eConectar').onclick=()=>{wsUrl=$('ePuente').value.trim()||'localhost:9203';store.set('escena.puente',wsUrl);sim=false;$('eSim').checked=false;conectar();};
$('eSim').onchange=e=>{sim=e.target.checked;if(sim){simPersona();if(ws)conectar();}else conectar();};
$('eExp').onclick=()=>{$('eJson').value=JSON.stringify(M,null,1);};
$('eImp').onclick=()=>{try{cargarMontaje(JSON.parse($('eJson').value),'aplicado');}catch(e){aviso('el JSON no es válido');}};
$('eDesc').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(M,null,1)],{type:'application/json'}));a.download='montaje.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
$('eCargar').onclick=()=>$('eArchivo').click();
$('eArchivo').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{cargarMontaje(JSON.parse(t),'cargado de '+f.name);}catch(err){aviso('el archivo no es un montaje válido');}});e.target.value='';};

/* ---------- teclado (antes que el del bosque) ---------- */
document.addEventListener('keydown',e=>{
  const tg=e.target.tagName;if(tg==='INPUT'&&(e.target.type==='text'||e.target.type==='number')||tg==='TEXTAREA'||tg==='SELECT')return;
  const c=e.code;let mio=true;
  if(c==='Space'||c==='KeyG')go();else if(c==='KeyB')atras();
  else if(c==='BracketLeft'){SEL=SIG=Math.max(0,SIG-1);pintarCues();pintarEditor();}else if(c==='BracketRight'){SEL=SIG=Math.min(M.cues.length-1,SIG+1);pintarCues();pintarEditor();}
  else if(/^Digit\d$/.test(c)){const n=+c.slice(5)||10;if(e.shiftKey)guardarVista(n);else corte(n);}
  else if(c==='KeyQ'||c==='KeyZ'){if(FIJA||ANIM)soltar();ALTO=clamp(ALTO+(c==='KeyQ'?.5:-.5),-1.2,60);}
  else{mio=false;if(MOVEKEYS.includes(c))soltar();}
  if(mio){e.preventDefault();e.stopPropagation();}
},true);

/* ---------- arranque ---------- */
SRCS.forEach(s=>{s.pista=null;setGem(s);});
$('cVer').checked=false;$('cVer').dispatchEvent(new Event('change'));   // la proyección no muestra círculos ni rutas
M=limpiar(store.get('escena.montaje',null));MAP=M.mapeo.map(r=>Object.assign({v:0},r));
if(!store.get('escena.montaje',null)&&location.protocol!=='file:')fetch('montaje.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{if(j)cargarMontaje(j,'montaje.json');}).catch(()=>{});
pintarTodo();guardar();
const iniciar=conSonido=>{$('escIni').hidden=true;entrar(null);if(!conSonido)listener.setMasterVolume(0);ejecutar(0);if(sim)simPersona();else conectar();
  const des=()=>{try{ctx.resume();}catch(e){}};addEventListener('pointerdown',des,{once:true});addEventListener('keydown',des,{once:true});};
const ini=document.createElement('div');ini.id='escIni';ini.className='ov';
ini.innerHTML=`<div class="win box"><h3>Endeles Escena</h3><div class="in"><p>Cada persona es un bosque. Este bosque escucha a Alquimia EEG OSC (puente WebSocket en el ${esc(wsUrl)}) y se proyecta con cámaras y cues.</p>
<p class="note">Espacio = GO. Para Pixera u otra salida sin clic, abre con <b>?auto=1</b> (y <b>&ui=0</b> para la imagen limpia).</p>
<div class="flex"><button class="on" id="escSon">entrar con sonido</button><button id="escMudo">entrar sin sonido</button></div></div></div>`;
document.body.appendChild(ini);
$('escSon').onclick=()=>iniciar(true);$('escMudo').onclick=()=>iniciar(false);
if(QS.get('ui')==='0'){setHud(false);$('bShow').hidden=true;}   // imagen limpia: H vuelve a mostrar la interfaz
if(QS.get('auto')==='1')iniciar(QS.get('sonido')!=='0');
return{camara,trasMover,antes,despues};
})();
