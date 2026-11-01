/* ===== Laboratório Tático FM — app ===== */
const LS='fmlab.v1';
const $=s=>document.querySelector(s);
const clone=o=>JSON.parse(JSON.stringify(o));
let DB={ideas:[],active:null};
const ui={phase:'IP',tool:'move',color:'#ffffff',sel:null,rtab:'viab',det:null,detSel:new Set(),draftSrc:{type:'Artigo',title:'',url:'',text:''},draftLog:{date:new Date().toISOString().slice(0,10),opp:'',res:'V',gf:'',ga:'',xgf:'',xga:'',note:''}};
const COLORS=['#ffffff','#f5b942','#ef5350','#4fc3f7','#111111'];
let drag=null, drawing=null, raf=0;

/* ---------- persistência ---------- */
function save(){try{localStorage.setItem(LS,JSON.stringify(DB))}catch(e){}}
function load(){try{const r=localStorage.getItem(LS);if(r){const d=JSON.parse(r);if(d&&Array.isArray(d.ideas)){DB=d;}}}catch(e){}}
const cur=()=>DB.ideas.find(i=>i.id===DB.active)||null;
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2200)}

/* ---------- fábrica de ideias ---------- */
function blankIdea(title){
  const IPs=slotsFromTemplate('4-3-3');
  const OOPs=assignPids(slotsFromTemplate('4-4-2'),IPs,'std');OOPs.forEach(s=>delete s._ref);
  return {id:uid(),title:title||'Nova ideia tática',coach:'',team:'',version:'FM26',pitch:'std',notes:'',sources:[],
    IP:{form:'4-3-3',slots:IPs},OOP:{form:'4-4-2',slots:OOPs},instr:clone(INSTR_DEFAULT),metrics:{},squad:{},log:[],
    draw:{IP:[],OOP:[]},ball:{IP:null,OOP:null},rules:clone(RULESETS_DEFAULT),created:Date.now()};
}
function setRoles(idea,phase,map){idea[phase].slots.forEach(s=>{if(map[s.code])s.role=map[s.code]})}
const PRESETS={
 dezerbi:()=>{const i=blankIdea('De Zerbi — saída 2-4-4 e pressão alta');i.coach='Roberto De Zerbi';
  changeFormation(i,'IP','2-4-4 (posse)');changeFormation(i,'OOP','4-2-3-1');
  setRoles(i,'IP',{GK:'ipgk_ball',DCL:'ipcb_bp',DCR:'ipcb_bp',ML:'ipfb_inv',MCL:'ipdm_dlp',MCR:'ipcm_mp',MR:'ipfb_inv',AML:'ipw_in',STCL:'ipst_af',STCR:'ipst_dlf',AMR:'ipw_in'});
  setRoles(i,'OOP',{GK:'oopgk_std',DL:'oopfb_press',DCL:'oopcb_stop',DCR:'oopcb_cov',DR:'oopfb_press',DMCL:'oopdm_press',DMCR:'oopdm_scr',AML:'oopw_trk',AMC:'oopam_press',AMR:'oopw_trk',STC:'oopst_press'});
  Object.assign(i.instr,{directness:1,tempo:3,width:2,line:4,engagement:2,press:3,transDef:1,buildUp:1,gkDist:3,gkKick:1,trap:0});
  i.notes='Recriação sugerida no relatório FM26: GR Ball-Playing + laterais invertidos/avançados para a linha do duplo pivô formam um 2-4-4 na saída, atraindo a pressão do rival; ao romper a pressão a estrutura vira 2-3-5 no último terço. Sem bola, 4-2-3-1 disciplinado.';
  i.sources.push({id:uid(),type:'Relatório',title:'Relatório de Especialista FM26 (PDF do usuário)',url:'',text:'A arquitetura de De Zerbi exige um 4-2-3-1 sem bola que transita para um bloco 2-4-4 na construção. O guarda-redes atua como Ball-Playing Goalkeeper e os laterais invertem ou avançam para a linha do meio, atraindo a pressão adversária. Depois, a estrutura vira um 2-3-5 no último terço.'});
  return i},
 arteta:()=>{const i=blankIdea('Arteta — 4-3-3 que comprime em 4-4-2 com pressão asfixiante');i.coach='Mikel Arteta';
  changeFormation(i,'IP','4-3-3');changeFormation(i,'OOP','4-4-2');
  setRoles(i,'IP',{GK:'ipgk_std',DL:'ipfb_inv',DCL:'ipcb_bp',DCR:'ipcb_nn',DR:'ipfb_att',DM:'ipdm_hb',MCL:'ipcm_mp',MCR:'ipcm_b2b',AML:'ipw_in',STC:'ipst_cmp',AMR:'ipw_win'});
  setRoles(i,'OOP',{GK:'oopgk_std',DL:'oopfb_cov',DCL:'oopcb_stop',DCR:'oopcb_cov',DR:'oopfb_cov',ML:'oopwm_trk',MCL:'oopcm_scr',MCR:'oopcm_press',MR:'oopwm_trk',STCL:'oopst_press',STCR:'oopam_press'});
  Object.assign(i.instr,{directness:1,tempo:2,width:3,line:4,engagement:2,press:4,transDef:1,trap:2});
  i.notes='Base 4-3-3 com bola que se comprime em 4-4-2 sem bola. O meio-campista avançado sobe ao lado do ponta de lança e lidera a primeira barreira de pressão; Trap Outside + linha defensiva muito alta empurram o rival para a lateral.';
  i.sources.push({id:uid(),type:'Relatório',title:'Relatório de Especialista FM26 (PDF do usuário)',url:'',text:'O controlo e a pressão asfixiante de Arteta: 4-3-3 com bola e 4-4-2 sem bola. Instruções Trap Outside e linha defensiva muito alta (pressão alta) comprimem o meio-campo e estrangulam o rival contra a linha lateral. Estrutura de rest defence 3+2 com Half-Back e laterais projetados.'});
  return i}
};

/* ---------- helpers de estado ---------- */
function setPath(o,path,val){const p=path.split('.');let c=o;for(let i=0;i<p.length-1;i++){c[p[i]]=c[p[i]]??{};c=c[p[i]]}c[p[p.length-1]]=val}
function slotsOf(i,ph){return i[ph].slots}
function selSlot(i){return ui.sel==null?null:(ui.phase==='OOP'?i.OOP:i.IP).slots.find(s=>s.pid===ui.sel)}
function roleLabel(id){const r=ROLES[id];return r?r.pt:'—'}
function short(s,n){return s.length>n?s.slice(0,n-1)+'…':s}

/* ---------- render: esquerda ---------- */
function renderLeft(){
  const i=cur(); const L=$('#left'); let h='';
  h+=`<div class="brand">LABORATÓRIO <b>TÁTICO FM</b><small>v1</small></div>`;
  h+=`<div class="sec"><h4>Ideias táticas <span class="row"><button class="btn sm pri" data-act="new">+ Nova</button></span></h4>`;
  if(!DB.ideas.length)h+=`<div class="empty">Nenhuma ideia ainda.</div>`;
  DB.ideas.forEach(x=>{const e=evaluate(x);h+=`<div class="idea-item ${x.id===DB.active?'on':''}" data-act="open" data-id="${x.id}"><div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${esc(x.coach||'—')} · ${x.version} · ${esc(x.IP.form)} → ${esc(x.OOP.form)}</div></div><span class="pill ${e.tone}">${e.score}</span></div>`});
  h+=`<div class="row" style="margin-top:6px"><select data-act-change="preset" style="width:auto;flex:1"><option value="">+ Exemplo do relatório…</option><option value="dezerbi">De Zerbi — 2-4-4 / pressão alta</option><option value="arteta">Arteta — 4-3-3 → 4-4-2</option></select></div>`;
  h+=`<div class="row" style="margin-top:6px"><button class="btn sm" data-act="export">Exportar</button><button class="btn sm" data-act="import">Importar</button>${i?`<button class="btn sm" data-act="dup">Duplicar</button><button class="btn sm danger" data-act="del">Excluir</button>`:''}</div></div>`;
  if(i){
    h+=`<div class="sec"><h4>Resumo da ideia</h4><textarea data-bind="notes" data-live placeholder="Em suas palavras: o que esse treinador faz, por que funciona…">${esc(i.notes)}</textarea></div>`;
    h+=`<div class="sec"><h4>Fontes (artigos, tweets, vídeos)</h4>`;
    i.sources.forEach(s=>{h+=`<div class="src"><div class="row"><span class="pill info">${esc(s.type)}</span><span class="t grow">${esc(short(s.title||'(sem título)',48))}</span><button class="btn sm danger" data-act="delsrc" data-id="${s.id}">×</button></div>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(short(s.url,60))}</a>`:''}<div class="cd" style="color:var(--dim);font-size:11px">${s.text?s.text.length+' caracteres colados':'sem texto'}</div></div>`});
    const d=ui.draftSrc;
    h+=`<div class="card2"><h5>Adicionar fonte</h5>
     <div class="row"><select data-draft="draftSrc.type" style="width:auto">${['Artigo','Tweet/X','Vídeo','Dados/Stats','Relatório','Outro'].map(t=>`<option ${d.type===t?'selected':''}>${t}</option>`).join('')}</select><input type="text" class="grow" placeholder="Título" data-draft="draftSrc.title" value="${esc(d.title)}"></div>
     <input type="url" placeholder="Link (opcional — o app não busca a página)" data-draft="draftSrc.url" value="${esc(d.url)}" style="margin-top:6px">
     <textarea placeholder="Cole aqui o texto do artigo/tweet/thread — é daqui que a análise extrai as ideias." data-draft="draftSrc.text" style="margin-top:6px">${esc(d.text)}</textarea>
     <div class="row" style="margin-top:6px"><button class="btn pri sm" data-act="addsrc">Adicionar</button></div></div>`;
    h+=`<button class="btn pri" style="width:100%" data-act="analyze">🔍 Analisar fontes e resumo</button>`;
    if(ui.det){
      const det=ui.det;
      if(!det.found.length&&!det.forms.length)h+=`<div class="empty">Nada reconhecido. Cole texto com termos como pressão alta, bloco baixo, 3-2-5, meios-espaços…</div>`;
      else{
        h+=`<div style="margin-top:8px">`;
        if(det.forms.length)h+=`<label class="det"><input type="checkbox" data-detchk="forms" ${ui.detSel.has('forms')?'checked':''}> <b>Formações citadas:</b> ${det.forms.join(', ')}<q>1ª → fase IP${det.forms[1]?', 2ª → fase OOP':''}</q></label>`;
        det.found.forEach(f=>{
          let sn=esc(f.snippet);const eh=esc(f.hit);sn=sn.split(eh).join('<mark>'+eh+'</mark>');
          h+=`<label class="det"><input type="checkbox" data-detchk="${f.id}" ${ui.detSel.has(f.id)?'checked':''}> <b>${esc(f.lab)}</b><q>…${sn}…</q><q style="color:#c8d9ce">${esc(f.note)}</q></label>`});
        h+=`<button class="btn pri" style="width:100%" data-act="applydet">Aplicar selecionados às instruções</button></div>`;
      }
    }
    h+=`</div>`;
  }
  L.innerHTML=h;
}

/* ---------- render: cabeçalho, fases, ferramentas ---------- */
function renderHead(){
  const i=cur(); const H=$('#head');
  if(!i){H.innerHTML=`<div class="card"><h2>Crie ou abra uma ideia tática</h2></div>`;return}
  const e=evaluate(i);
  H.innerHTML=`<div class="card"><input type="text" data-bind="title" data-live value="${esc(i.title)}" style="font-size:16px;font-weight:700;background:transparent;border:0;padding:0">
   <div class="meta"><input type="text" data-bind="coach" data-live placeholder="Treinador" value="${esc(i.coach)}" style="width:150px"><input type="text" data-bind="team" data-live placeholder="Equipe/clube" value="${esc(i.team)}" style="width:150px">
   <select data-bind="version" data-r="all"><option ${i.version==='FM26'?'selected':''}>FM26</option><option ${i.version==='FM27'?'selected':''}>FM27</option></select>
   <select data-bind="pitch" data-r="all">${Object.entries(PITCHES).map(([k,v])=>`<option value="${k}" ${i.pitch===k?'selected':''}>Campo ${v.lab}</option>`).join('')}</select></div>
   ${i.version==='FM27'?`<div class="ver-warn">⚠ FM27: motor ainda não conhecido — usando as regras do FM26 (edite os parâmetros na aba Viabilidade quando o jogo sair).</div>`:''}</div>
   <div class="card" style="text-align:center;cursor:pointer" data-act="rtab" data-t="viab"><div class="pill ${e.tone}">VIABILIDADE</div><div style="font-size:30px;font-weight:800">${e.score}</div><div style="font-size:11px;color:var(--mut)">${e.verdict}</div></div>`;
}
function renderPhaseBar(){
  const i=cur(); const P=$('#phasebar'); if(!i){P.innerHTML='';return}
  const fopts=k=>Object.keys(FORMS).map(f=>`<option ${f===i[k].form?'selected':''}>${f}</option>`).join('');
  P.innerHTML=`<div class="tab ip ${ui.phase==='IP'?'on':''}" data-act="phase" data-p="IP">● Com bola (IP)</div><div class="tab oop ${ui.phase==='OOP'?'on':''}" data-act="phase" data-p="OOP">● Sem bola (OOP)</div><div class="tab both ${ui.phase==='BOTH'?'on':''}" data-act="phase" data-p="BOTH">⇄ Combinado</div>
   ${ui.phase!=='OOP'?`<span style="color:var(--ip)">IP</span><select data-form="IP">${fopts('IP')}</select>`:''}${ui.phase!=='IP'?`<span style="color:var(--oop)">OOP</span><select data-form="OOP">${fopts('OOP')}</select>`:''}`;
}
function renderTools(){
  const i=cur(); const T=$('#tools'); if(!i){T.innerHTML='';return}
  const dis=ui.phase==='BOTH';
  const tools=[['move','↖ Mover'],['pen','✎ Caneta'],['pass','↗ Passe'],['run','⇢ Corrida'],['zone','▭ Zona'],['erase','⌫ Borracha']];
  T.innerHTML=tools.map(([k,l])=>`<button class="btn sm ${ui.tool===k?'on':''}" data-act="tool" data-t="${k}">${l}</button>`).join('')+
   COLORS.map(c=>`<span class="dot ${ui.color===c?'on':''}" style="background:${c}" data-act="color" data-c="${c}"></span>`).join('')+
   (dis?'':`<button class="btn sm ${i.ball[ui.phase]?'on':''}" data-act="ball">⚽ Bola</button><button class="btn sm" data-act="undo">Desfazer</button><button class="btn sm" data-act="clear">Limpar desenhos</button>`);
}

/* ---------- campo SVG ---------- */
const PX=x=>20+x*6.4, PY=y=>20+y*9.6;
function pitchBase(){
  let s='';
  for(let k=0;k<12;k++)s+=`<rect x="20" y="${20+k*80}" width="640" height="80" fill="${k%2?'#2d6a3d':'#2a6338'}"/>`;
  const L='stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none"';
  s+=`<rect x="20" y="20" width="640" height="960" ${L}/><line x1="20" y1="500" x2="660" y2="500" ${L}/><circle cx="340" cy="500" r="86" ${L}/><circle cx="340" cy="500" r="3" fill="rgba(255,255,255,.7)"/>`;
  s+=`<rect x="150" y="20" width="380" height="151" ${L}/><rect x="254" y="20" width="172" height="50" ${L}/><path d="M271 171 A86 86 0 0 0 409 171" ${L}/><circle cx="340" cy="120" r="3" fill="rgba(255,255,255,.7)"/>`;
  s+=`<rect x="150" y="829" width="380" height="151" ${L}/><rect x="254" y="930" width="172" height="50" ${L}/><path d="M271 829 A86 86 0 0 1 409 829" ${L}/><circle cx="340" cy="880" r="3" fill="rgba(255,255,255,.7)"/>`;
  return s;
}
function arrow(a,b,c,dash,i){
  const ang=Math.atan2(b[1]-a[1],b[0]-a[0]),L=14;
  const p1=[b[0]-L*Math.cos(ang-.45),b[1]-L*Math.sin(ang-.45)],p2=[b[0]-L*Math.cos(ang+.45),b[1]-L*Math.sin(ang+.45)];
  return `<g data-i="${i}" style="pointer-events:${ui.tool==='erase'?'all':'none'}"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="4" ${dash?'stroke-dasharray="10 7"':''} stroke-linecap="round"/><path d="M${p1} L${b} L${p2}" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${ui.tool==='erase'?`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="transparent" stroke-width="22"/>`:''}</g>`;
}
function shapeSVG(sh,i){
  if(sh.t==='pen')return `<polyline data-i="${i}" points="${sh.pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${sh.c}" stroke-width="${ui.tool==='erase'?10:4}" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:${ui.tool==='erase'?'stroke':'none'}"/>`;
  if(sh.t==='pass')return arrow(sh.a,sh.b,sh.c,false,i);
  if(sh.t==='run')return arrow(sh.a,sh.b,sh.c,true,i);
  if(sh.t==='zone'){const x=Math.min(sh.a[0],sh.b[0]),y=Math.min(sh.a[1],sh.b[1]),w=Math.abs(sh.a[0]-sh.b[0]),h=Math.abs(sh.a[1]-sh.b[1]);
    return `<rect data-i="${i}" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${sh.c}" fill-opacity=".2" stroke="${sh.c}" stroke-width="3" stroke-dasharray="8 6" style="pointer-events:${ui.tool==='erase'?'all':'none'}"/>`}
  return '';
}
function playerSVG(s,phase,sel,mini){
  const r=ROLES[s.role]; const gk=s.code==='GK';
  const fill=gk?'#f5b942':(phase==='IP'?'#4fff5f':'#4fc3f7');
  const ring=sel?`<circle r="${mini?24:28}" fill="none" stroke="#f5b942" stroke-width="3"/>`:'';
  const lab=r?r.ab:'?';
  const name=mini?'':`<text y="40" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" stroke="#0a1a10" stroke-width="3.5" paint-order="stroke">${esc(r?short(r.pt,17):s.code)}</text>`;
  return `<g class="slot" data-pid="${s.pid}" data-ph="${phase}" transform="translate(${PX(s.x)},${PY(s.y)})" ${mini?'opacity=".92"':''}>${ring}<circle r="${mini?18:22}" fill="${fill}" stroke="#0a1a10" stroke-width="2.5"/><text y="5" text-anchor="middle" font-size="${mini?12:13}" font-weight="800" fill="#06210b">${lab}</text>${name}</g>`;
}
function renderPitch(){
  const i=cur(); const svg=$('#pitch'); if(!i){svg.innerHTML=pitchBase();return}
  let s=pitchBase();
  if(ui.phase==='BOTH'){
    i.IP.slots.forEach(a=>{const b=i.OOP.slots.find(o=>o.pid===a.pid);if(b)s+=`<line x1="${PX(a.x)}" y1="${PY(a.y)}" x2="${PX(b.x)}" y2="${PY(b.y)}" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-dasharray="5 5"/>`});
    i.OOP.slots.forEach(o=>{s+=playerSVG(o,'OOP',ui.sel===o.pid,true)});
    i.IP.slots.forEach(o=>{s+=playerSVG(o,'IP',ui.sel===o.pid,true)});
  } else {
    (i.draw[ui.phase]||[]).forEach((sh,k)=>{s+=shapeSVG(sh,k)});
    if(drawing)s+=shapeSVG(drawing,-1);
    i[ui.phase].slots.forEach(o=>{s+=playerSVG(o,ui.phase,ui.sel===o.pid,false)});
    const b=i.ball[ui.phase]; if(b)s+=`<g class="ball" transform="translate(${b.x},${b.y})" style="cursor:grab"><circle r="14" fill="#fff" stroke="#111" stroke-width="2"/><text y="6" text-anchor="middle" font-size="17">⚽</text></g>`;
  }
  svg.innerHTML=s;
  svg.classList.toggle('erasing',ui.tool==='erase');
  $('#hint').innerHTML=ui.phase==='BOTH'?'Visão combinada: linhas tracejadas mostram o deslocamento IP → OOP de cada jogador (verde = com bola, azul = sem bola). Clique em um jogador para selecioná-lo.':'Arraste os jogadores para ajustar a estrutura. Troque a formação acima e defina os papéis na aba <b>Papéis</b>. Use caneta/passe/corrida/zona para anotar o que viu na análise.';
}
function ptr(e){const svg=$('#pitch');const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return [Math.round(clamp(q.x,0,680)),Math.round(clamp(q.y,0,1000))]}
function initPitch(){
  const svg=$('#pitch');
  svg.addEventListener('pointerdown',e=>{
    const i=cur(); if(!i)return;
    const p=ptr(e); const t=e.target;
    const slotEl=t.closest&&t.closest('.slot');
    if(ui.phase==='BOTH'){ if(slotEl){ui.sel=+slotEl.dataset.pid;renderPitch();renderRight()} return }
    if(ui.tool==='erase'){const d=t.closest('[data-i]');if(d){i.draw[ui.phase].splice(+d.dataset.i,1);save();renderPitch()}return}
    if(ui.tool==='move'){
      const ball=t.closest&&t.closest('.ball');
      if(slotEl){ui.sel=+slotEl.dataset.pid;drag={kind:'slot',pid:ui.sel};svg.setPointerCapture(e.pointerId);renderRight();renderPitch();return}
      if(ball){drag={kind:'ball'};svg.setPointerCapture(e.pointerId);return}
      return;
    }
    drawing=ui.tool==='pen'?{t:'pen',c:ui.color,pts:[p]}:{t:ui.tool,c:ui.color,a:p,b:p};
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove',e=>{
    const i=cur(); if(!i||(!drag&&!drawing))return;
    const p=ptr(e);
    if(drag){
      if(drag.kind==='slot'){const s=i[ui.phase].slots.find(x=>x.pid===drag.pid);s.x=Math.round(clamp((p[0]-20)/6.4,2,98));s.y=Math.round(clamp((p[1]-20)/9.6,2,98));}
      else i.ball[ui.phase]={x:p[0],y:p[1]};
    } else if(drawing){ if(drawing.t==='pen')drawing.pts.push(p); else drawing.b=p; }
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;renderPitch()});
  });
  const end=e=>{
    const i=cur(); if(!i)return;
    if(drag){drag=null;save();renderLeft();renderHead();renderRight();renderPitch();}
    else if(drawing){
      const d=drawing;drawing=null;
      const ok=d.t==='pen'?d.pts.length>2:Math.hypot(d.b[0]-d.a[0],d.b[1]-d.a[1])>12;
      if(ok){i.draw[ui.phase].push(d);save();}
      renderPitch();
    }
  };
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
}

/* ---------- render: direita ---------- */
const RTABS=[['viab','Viabilidade'],['roles','Papéis'],['instr','Instruções'],['data','Dados'],['squad','Plantel'],['log','Registro'],['guide','Guia FM']];
function renderRight(){
  const i=cur();
  $('#rtabs').innerHTML=RTABS.map(([k,l])=>`<button class="${ui.rtab===k?'on':''}" data-act="rtab" data-t="${k}">${l}</button>`).join('');
  const B=$('#rbody');
  if(!i){B.innerHTML='<div class="empty">Crie uma ideia na barra lateral.</div>';return}
  const fn={viab:rViab,roles:rRoles,instr:rInstr,data:rData,squad:rSquad,log:rLog,guide:rGuide}[ui.rtab];
  B.innerHTML=fn(i);
}
const SEV_IC={ok:'✓',info:'i',warn:'!',bad:'✕'};
function barCol(s){return s>=80?'#4fff5f':s>=65?'#4fc3f7':s>=50?'#f5b942':'#ef5350'}
function rViab(i){
  const e=evaluate(i); let h='';
  h+=`<div class="gauge"><div class="n" style="color:${barCol(e.score)}">${e.score}</div><div><div style="font-weight:700;font-size:15px">${e.verdict}</div><div style="color:var(--mut);font-size:11.5px">Nota 0–100 pelas regras do ${i.version}${e.rules.provisional?' (provisórias)':''}. É uma <b>estimativa heurística</b> baseada no relatório do FM26 — valide no jogo na aba Registro.</div></div></div>`;
  e.dims.forEach(d=>{
    h+=`<div class="dim"><div class="row"><b class="grow">${d.lab}</b><span style="color:var(--dim);font-size:11px">peso ${d.w}%</span><span class="pill ${d.score>=80?'ok':d.score>=65?'info':d.score>=50?'warn':'bad'}">${d.score}</span></div><div class="bar"><i style="width:${d.score}%;background:${barCol(d.score)}"></i></div>`;
    d.f.forEach(f=>{h+=`<div class="find ${f.sev}"><span class="ic">${SEV_IC[f.sev]}</span><div>${esc(f.t)}${f.fix?`<div class="fx">→ ${esc(f.fix)}</div>`:''}</div></div>`});
    h+=`</div>`;
  });
  if(e.fixes.length){h+=`<div class="card2"><h5>Ajustes sugeridos (por prioridade)</h5>`;e.fixes.slice(0,6).forEach(f=>{h+=`<p>• ${esc(f.fix)}</p>`});h+=`</div>`}
  const r=i.rules[i.version];
  h+=`<div class="card2"><h5>Parâmetros do motor — ${i.version}</h5><div class="grid2">
   <div><label class="f">Deslocamento máx. IP→OOP (m)</label><input type="number" data-bind="rules.${i.version}.maxDisp" data-num data-r="right" value="${r.maxDisp}"></div>
   <div><label class="f">Índice de Trabalho p/ pressão</label><input type="number" data-bind="rules.${i.version}.wrPress" data-num data-r="right" value="${r.wrPress}"></div></div>
   <p style="color:var(--dim);font-size:11px">Quando o FM27 sair, ajuste aqui o que mudar no motor sem mexer no restante.</p></div>`;
  return h;
}
function roleOpts(grp,phase,sel){
  const own=Object.values(ROLES).filter(r=>r.phase===phase&&r.grp===grp);
  const other=Object.values(ROLES).filter(r=>r.phase===phase&&r.grp!==grp);
  const o=r=>`<option value="${r.id}" ${r.id===sel?'selected':''}>${esc(r.pt)} · ${esc(r.en)}</option>`;
  return `<option value="">— definir papel —</option><optgroup label="${GROUPS[grp]}">${own.map(o).join('')}</optgroup><optgroup label="Outras posições">${other.map(o).join('')}</optgroup>`;
}
function rRoles(i){
  let h=`<p style="color:var(--mut);margin-top:0">Cada jogador tem um papel <b style="color:var(--ip)">com bola</b> e outro <b style="color:var(--oop)">sem bola</b> (sistema de formações duplas do FM26).</p>`;
  const order=[...i.IP.slots].sort((a,b)=>b.y-a.y);
  order.forEach(a=>{
    const b=i.OOP.slots.find(o=>o.pid===a.pid)||{code:'—',role:null};
    const on=ui.sel===a.pid;
    h+=`<div class="prow ${on?'on':''}" data-act="selpid" data-pid="${a.pid}"><div class="c" style="background:${a.code==='GK'?'#f5b942':'#4fff5f'}">${a.pid+1}</div><div><div class="cd">${a.code} → ${b.code}</div></div></div>`;
    h+=`<div class="grid2" style="margin:0 0 8px 42px"><select data-role="IP" data-pid="${a.pid}">${roleOpts(groupOf(a.code),'IP',a.role)}</select><select data-role="OOP" data-pid="${a.pid}">${roleOpts(groupOf(b.code==='—'?a.code:b.code),'OOP',b.role)}</select></div>`;
    if(on){
      const rs=[['IP',ROLES[a.role]],['OOP',ROLES[b.role]]].filter(x=>x[1]);
      rs.forEach(([ph,r])=>{h+=`<div style="margin:0 0 8px 42px"><span class="pill ${ph==='IP'?'ok':'info'}">${ph}</span> <b>${esc(r.pt)}</b> <span style="color:var(--dim)">(${esc(r.en)})</span><div class="attrs">${r.attrs.map(x=>`<span>${esc(x)}</span>`).join('')||'<span style="opacity:.6">sem atributos-chave específicos</span>'}</div>${r.wr>=3?`<div style="color:var(--y);font-size:11px">Exige alto Índice de Trabalho/Resistência.</div>`:''}</div>`});
    }
  });
  h+=`<p style="color:var(--dim);font-size:11px">Catálogo-base montado a partir do seu relatório FM26 e do Banco de Dados (nomes/atributos podem diferir ligeiramente do jogo). Edite em <code>data.js</code>.</p>`;
  return h;
}
function rInstr(i){
  let h='';
  ['IP','OOP'].forEach(ph=>{
    h+=`<h4 style="margin:12px 0 8px;font-size:11px;letter-spacing:.12em;color:${ph==='IP'?'var(--ip)':'var(--oop)'}">${ph==='IP'?'COM POSSE DE BOLA':'SEM POSSE DE BOLA'}</h4>`;
    INSTR_DEF.filter(d=>d.ph===ph).forEach(d=>{
      const v=i.instr[d.k];
      h+=`<div class="ig"><label><span>${d.lab}</span><b>${esc(d.opts[v])}</b></label>`;
      if(d.type==='scale')h+=`<div class="seg">${d.opts.map((o,k)=>`<button class="${v===k?'on':''}" title="${esc(o)}" data-act="instr" data-k="${d.k}" data-v="${k}">${['−−','−','=','+','++'][k]}</button>`).join('')}</div>`;
      else if(d.opts.length<=3)h+=`<div class="seg">${d.opts.map((o,k)=>`<button class="${v===k?'on':''}" data-act="instr" data-k="${d.k}" data-v="${k}">${esc(short(o,18))}</button>`).join('')}</div>`;
      else h+=`<select data-instr="${d.k}">${d.opts.map((o,k)=>`<option value="${k}" ${v===k?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
      h+=`</div>`;
    });
  });
  return h;
}
function rData(i){
  const m=i.metrics||{}; const items=interpretMetrics(m);
  let h=`<p style="color:var(--mut);margin-top:0">Insira as métricas <b>reais</b> da equipe (TruMedia, FBref, WhoScored, StatsBomb…) e o app traduz em instruções do FM.</p><div class="grid2">`;
  METRIC_DEFS.forEach(d=>{h+=`<div><label class="f">${d.lab}${d.unit?' ('+d.unit+')':''}</label><input type="number" step="any" data-bind="metrics.${d.k}" data-r="right" value="${esc(m[d.k]??'')}" title="${esc(d.hint)}"></div>`});
  h+=`</div>`;
  if(items.length){h+=`<div class="card2" style="margin-top:10px"><h5>Tradução para o FM</h5>`+items.map(x=>`<p>• ${esc(x.why)}</p>`).join('')+`<button class="btn pri sm" data-act="applymetrics" style="margin-top:6px">Aplicar às instruções</button></div>`}
  else h+=`<div class="empty">Preencha ao menos uma métrica.</div>`;
  h+=`<div class="card2"><h5>Referência rápida</h5><p>PPDA &lt; 8: pressão extrema · 8–10: alta · 10–13: média · &gt; 18: bloco baixo.</p><p>Posse &gt; 60%: passes curtos/ritmo lento · &lt; 42%: contra-ataque.</p><p>Linha defensiva &gt; 45 m: "muito mais avançada".</p></div>`;
  return h;
}
function rSquad(i){
  const {r}=requirements(i); const sq=i.squad||{};
  let h=`<p style="color:var(--mut);margin-top:0">Informe a <b>média dos titulares</b> (escala FM 1–20) para ver se o seu plantel suporta a ideia. Em branco = não avaliado.</p>`;
  Object.keys(REQ_LAB).forEach(k=>{
    const have=parseFloat(sq[k]); const need=r[k];
    const col=isNaN(have)?'#5d786a':(need-have>=4?'#ef5350':need-have>=2?'#f5b942':'#4fff5f');
    h+=`<div class="ig"><label><span>${REQ_LAB[k]}</span><b>exige ~${need.toFixed(1)}</b></label><div class="row"><input type="number" min="1" max="20" step="0.5" style="width:80px" data-bind="squad.${k}" data-r="all" value="${esc(sq[k]??'')}" placeholder="—"><div class="bar grow"><i style="width:${isNaN(have)?0:have/20*100}%;background:${col}"></i></div></div></div>`;
  });
  h+=`<p style="color:var(--dim);font-size:11px">Regra do relatório FM26: pressão coordenada pede Índice de Trabalho ≥ 13; abaixo de 10 cria buracos e condena blocos altos.</p>`;
  return h;
}
function rLog(i){
  const st=logStats(i); const e=evaluate(i); const d=ui.draftLog; let h='';
  if(st){
    const verdict=st.n<5?'Amostra pequena (&lt; 5 jogos)':st.ppj>=2?'Ideia confirmada no jogo':st.ppj>=1.4?'Resultado misto':'Não funcionou como previsto';
    const tone=st.n<5?'info':st.ppj>=2?'ok':st.ppj>=1.4?'warn':'bad';
    h+=`<div class="card2"><div class="row"><span class="pill ${tone}">${verdict}</span><span style="color:var(--mut)">previsão do app: ${e.score}</span></div><p>${st.n} jogos · ${st.w}V ${st.d}E ${st.l}D · <b>${st.ppj.toFixed(2)} pts/jogo</b> · gols ${st.gf}-${st.ga}${st.nx?` · xG ${st.xf.toFixed(1)}-${st.xa.toFixed(1)}`:''}</p></div>`;
  }
  h+=`<div class="card2"><h5>Registrar jogo com esta tática</h5><div class="grid2"><div><label class="f">Data</label><input type="text" data-draft="draftLog.date" value="${esc(d.date)}"></div><div><label class="f">Adversário</label><input type="text" data-draft="draftLog.opp" value="${esc(d.opp)}"></div>
   <div><label class="f">Resultado</label><select data-draft="draftLog.res"><option value="V" ${d.res==='V'?'selected':''}>Vitória</option><option value="E" ${d.res==='E'?'selected':''}>Empate</option><option value="D" ${d.res==='D'?'selected':''}>Derrota</option></select></div><div></div>
   <div><label class="f">Gols pró / contra</label><div class="row"><input type="number" data-draft="draftLog.gf" value="${esc(d.gf)}" style="width:60px"><input type="number" data-draft="draftLog.ga" value="${esc(d.ga)}" style="width:60px"></div></div>
   <div><label class="f">xG pró / contra</label><div class="row"><input type="number" step="0.01" data-draft="draftLog.xgf" value="${esc(d.xgf)}" style="width:60px"><input type="number" step="0.01" data-draft="draftLog.xga" value="${esc(d.xga)}" style="width:60px"></div></div></div>
   <label class="f" style="margin-top:6px">Observação</label><input type="text" data-draft="draftLog.note" value="${esc(d.note)}"><button class="btn pri sm" style="margin-top:8px" data-act="addlog">Adicionar</button></div>`;
  if(i.log.length){h+=`<table class="t"><tr><th>Data</th><th>Adv.</th><th>Res.</th><th>Placar</th><th>xG</th><th></th></tr>`+i.log.map((g,k)=>`<tr><td>${esc(g.date)}</td><td>${esc(g.opp)}</td><td><span class="pill ${g.res==='V'?'ok':g.res==='E'?'warn':'bad'}">${g.res}</span></td><td>${esc(g.gf)}-${esc(g.ga)}</td><td>${g.xgf!==''?esc(g.xgf)+'-'+esc(g.xga):'—'}</td><td><button class="btn sm danger" data-act="dellog" data-k="${k}">×</button></td></tr>`).join('')+`</table>`}
  return h;
}
function rGuide(){
  const C=(t,b)=>`<div class="card2"><h5>${t}</h5>${b}</div>`;
  return C('Formações duplas (IP / OOP)','<p>No FM26 você monta duas estruturas: <b>com posse</b> (construção) e <b>sem posse</b> (bloco defensivo). A vista <i>Combinado</i> mostra o deslocamento médio de cada jogador entre as duas; o jogo alerta para transições desequilibradas.</p>')+
   C('Papéis separados por fase','<p>As antigas "Tarefas" (Defender/Apoiar/Atacar) saíram. Mezzala, Enganche e Trequartista foram recriados combinando papéis IP + OOP. Ex.: <b>Enganche</b> = Free Role (IP) + Central Outlet AM (OOP); <b>Trequartista</b> = Advanced Playmaker/Free Role (IP) + Tracking AM (OOP).</p>')+
   C('Rest defence é inegociável','<p>Boas táticas mantêm 3+2 ou 2+3 atrás da bola em posse. Obtenha 3-2-5 com Half-Back/Dropping DM descendo entre os centrais e laterais projetados; 2-3-5 com Inside Wing-Backs.</p>')+
   C('Pressão: gatilhos, não "pressionar tudo"','<p>"Pressionar sempre" em todo mundo quebra a geometria do bloco. Prefira armadilhas (Trap Outside/Inside) e papéis pressionantes certos. Índice de Trabalho ≥ 13 coordena bem a pressão; &lt; 10 abre buracos.</p>')+
   C('Dimensão do campo','<p><b>Pequeno (100×64)</b>: pressão e jogo direto pelo meio. <b>Standard (105×68)</b>: equilíbrio. <b>Grande (110×74)</b>: posse, tiki-taka e jogo pelas alas.</p>')+
   C('Marcação nas bolas paradas','<p>Zona premia altura, Antecipação e Posicionamento; Homem a Homem exige jogadores fortes e agressivos.</p>')+
   C('Como a nota de viabilidade é calculada','<p>Seis dimensões ponderadas: estrutura IP/OOP (20), rest defence (20), papéis (20), instruções (15), encaixe no plantel (15), campo (10). Regras derivadas do relatório FM26; <b>não é uma simulação do motor</b> — use o Registro para validar no jogo.</p>');
}

/* ---------- ações ---------- */
function commit(){save();renderAll()}
function openIdea(id){DB.active=id;ui.sel=null;ui.det=null;save();renderAll()}
function act(a,d){
  const i=cur();
  switch(a){
   case 'new':{const n=blankIdea();DB.ideas.unshift(n);openIdea(n.id);break}
   case 'open':openIdea(d.id);break;
   case 'del':if(i&&confirm('Excluir "'+i.title+'"?')){DB.ideas=DB.ideas.filter(x=>x.id!==i.id);DB.active=DB.ideas[0]?.id||null;commit()}break;
   case 'dup':if(i){const n=clone(i);n.id=uid();n.title+=' (cópia)';DB.ideas.unshift(n);openIdea(n.id)}break;
   case 'export':{const b=new Blob([JSON.stringify(DB,null,1)],{type:'application/json'});const a2=document.createElement('a');a2.href=URL.createObjectURL(b);a2.download='laboratorio-tatico-fm.json';a2.click();break}
   case 'import':{const f=document.createElement('input');f.type='file';f.accept='.json';f.onchange=()=>{const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.ideas)throw 0;DB=x;save();renderAll();toast('Importado')}catch(e){toast('Arquivo inválido')}};r.readAsText(f.files[0])};f.click();break}
   case 'phase':ui.phase=d.p;renderPhaseBar();renderTools();renderPitch();renderRight();break;
   case 'tool':ui.tool=d.t;renderTools();renderPitch();break;
   case 'color':ui.color=d.c;renderTools();break;
   case 'ball':if(i){i.ball[ui.phase]=i.ball[ui.phase]?null:{x:340,y:500};save();renderTools();renderPitch()}break;
   case 'undo':if(i){i.draw[ui.phase].pop();save();renderPitch()}break;
   case 'clear':if(i){i.draw[ui.phase]=[];save();renderPitch()}break;
   case 'rtab':ui.rtab=d.t;renderRight();break;
   case 'selpid':ui.sel=+d.pid;renderRight();renderPitch();break;
   case 'instr':if(i){i.instr[d.k]=+d.v;save();renderHead();renderLeft();renderRight()}break;
   case 'addsrc':{const s=ui.draftSrc;if(!i||(!s.text.trim()&&!s.url.trim()&&!s.title.trim())){toast('Preencha título, link ou texto');break}
     i.sources.push({id:uid(),type:s.type,title:s.title,url:s.url.trim(),text:s.text});ui.draftSrc={type:s.type,title:'',url:'',text:''};save();renderLeft();toast('Fonte adicionada');break}
   case 'delsrc':if(i){i.sources=i.sources.filter(s=>s.id!==d.id);save();renderLeft()}break;
   case 'analyze':{if(!i)break;const txt=[i.notes,...i.sources.map(s=>s.title+'\n'+s.text),ui.draftSrc.text].join('\n\n');
     ui.det=analyzeText(txt);ui.detSel=new Set(ui.det.found.map(f=>f.id));if(ui.det.forms.length&&!ui.det.found.some(f=>f.shape))ui.detSel.add('forms');renderLeft();break}
   case 'applydet':{if(!i||!ui.det)break;const done=applyDetections(i,ui.det,[...ui.detSel]);
     // detecções com dica de papel viram nota
     ui.det.found.filter(f=>f.roleHint&&ui.detSel.has(f.id)).forEach(f=>{const t='• '+f.roleHint;if(!i.notes.includes(t))i.notes+=(i.notes?'\n':'')+t});
     save();renderAll();toast(done.length?done.length+' ajustes aplicados':'Sugestões de papel anotadas no resumo');break}
   case 'applymetrics':{const done=applyMetrics(i);save();renderAll();toast(done.length+' instruções ajustadas');break}
   case 'addlog':{const g={...ui.draftLog};if(!g.opp.trim()){toast('Informe o adversário');break}i.log.push(g);ui.draftLog={...ui.draftLog,opp:'',gf:'',ga:'',xgf:'',xga:'',note:''};save();renderHead();renderLeft();renderRight();break}
   case 'dellog':i.log.splice(+d.k,1);save();renderRight();break;
  }
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(el)act(el.dataset.act,el.dataset)});
document.addEventListener('input',e=>{
  const el=e.target; const i=cur();
  if(el.dataset.draft){setPath(ui,el.dataset.draft,el.value);return}
  if(el.dataset.bind&&el.dataset.live&&i){setPath(i,el.dataset.bind,el.value);save();if(el.dataset.bind==='title'||el.dataset.bind==='coach')renderLeft()}
});
document.addEventListener('change',e=>{
  const el=e.target; const i=cur();
  if(el.dataset.draft){setPath(ui,el.dataset.draft,el.value);return}
  if(el.dataset.detchk){el.checked?ui.detSel.add(el.dataset.detchk):ui.detSel.delete(el.dataset.detchk);return}
  if(el.dataset.actChange==='preset'){if(el.value){const n=PRESETS[el.value]();DB.ideas.unshift(n);openIdea(n.id)}return}
  if(!i)return;
  if(el.dataset.role){const s=i[el.dataset.role].slots.find(x=>x.pid===+el.dataset.pid);s.role=el.value||null;save();renderLeft();renderHead();renderPitch();renderRight();return}
  if(el.dataset.form){changeFormation(i,el.dataset.form,el.value);commit();return}
  if(el.dataset.instr){i.instr[el.dataset.instr]=+el.value;save();renderHead();renderLeft();renderRight();return}
  if(el.dataset.bind&&!el.dataset.live){
    let v=el.value; if(el.dataset.num)v=v===''?'':parseFloat(v);
    setPath(i,el.dataset.bind,v); save();
    if(el.dataset.r==='all')renderAll();else renderRight();
    if(el.dataset.r==='right'){renderHead();renderLeft()}
  }
});

function renderAll(){renderLeft();renderHead();renderPhaseBar();renderTools();renderPitch();renderRight()}
function init(){
  load();
  // migração de ideias antigas
  DB.ideas.forEach(i=>{i.rules=i.rules||clone(RULESETS_DEFAULT);i.log=i.log||[];i.squad=i.squad||{};i.metrics=i.metrics||{}});
  if(!DB.ideas.length){const a=PRESETS.dezerbi();const b=PRESETS.arteta();DB.ideas=[a,b];DB.active=a.id;save()}
  if(!cur())DB.active=DB.ideas[0].id;
  initPitch();renderAll();
}
init();
