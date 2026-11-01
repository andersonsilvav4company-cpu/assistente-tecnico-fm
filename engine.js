/* ===== Motor de análise: extração de texto, métricas → instruções, viabilidade ===== */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const INSTR_BY_KEY=Object.fromEntries(INSTR_DEF.map(d=>[d.k,d]));

function slotsFromTemplate(key){
  return FORMS[key].map((t,i)=>({pid:i,code:t[0],x:t[1],y:t[2],role:null}));
}
function distM(a,b,pitch){
  const p=PITCHES[pitch]||PITCHES.std;
  const dx=(a.x-b.x)/100*p.w, dy=(a.y-b.y)/100*p.l;
  return Math.hypot(dx,dy);
}
/* casa slots novos com jogadores de referência por proximidade (guloso) */
function assignPids(newSlots, refSlots, pitch){
  const pairs=[];
  newSlots.forEach((n,i)=>refSlots.forEach((r,j)=>pairs.push([distM(n,r,pitch),i,j])));
  pairs.sort((a,b)=>a[0]-b[0]);
  const usedN=new Set(),usedR=new Set();
  pairs.forEach(([d,i,j])=>{ if(usedN.has(i)||usedR.has(j))return; usedN.add(i);usedR.add(j); newSlots[i].pid=refSlots[j].pid; newSlots[i]._ref=refSlots[j]; });
  return newSlots;
}
function changeFormation(idea,phase,key){
  const ph=idea[phase];
  const old=ph.slots;
  const fresh=slotsFromTemplate(key);
  const ref = phase==='IP' ? old : idea.IP.slots;
  assignPids(fresh,ref,idea.pitch);
  fresh.forEach(s=>{
    const prev=old.find(o=>o.pid===s.pid);
    if(prev&&prev.role&&ROLES[prev.role]&&ROLES[prev.role].grp===groupOf(s.code)) s.role=prev.role;
    delete s._ref;
  });
  ph.form=key; ph.slots=fresh;
}

/* ---- texto → detecções ---- */
function analyzeText(text){
  const found=[];
  if(!text||!text.trim())return {found,forms:[]};
  KEYWORDS.forEach(k=>{
    const m=text.match(k.re);
    if(m){
      const i=m.index; const sn=text.slice(Math.max(0,i-70),Math.min(text.length,i+m[0].length+90)).replace(/\s+/g,' ').trim();
      found.push({id:k.id,lab:k.lab,note:k.note,snippet:sn,hit:m[0],set:k.set,shape:k.shape,roleHint:k.roleHint});
    }
  });
  const forms=[];
  const keys=Object.keys(FORMS);
  const re=/\b([2-5](?:-\d){1,4})\b/g; let m;
  while((m=re.exec(text))){ const k=keys.find(x=>x.split(' ')[0]===m[1]); if(k&&!forms.includes(k))forms.push(k); }
  return {found,forms};
}
function applyDetections(idea,det,onlyIds){
  const votes={};
  det.found.filter(f=>!onlyIds||onlyIds.includes(f.id)).forEach(f=>{
    if(f.set)Object.entries(f.set).forEach(([k,v])=>(votes[k]=votes[k]||[]).push(v));
  });
  const applied=[];
  Object.entries(votes).forEach(([k,arr])=>{
    const d=INSTR_BY_KEY[k];
    const val=d.type==='scale'?clamp(Math.round(arr.reduce((a,b)=>a+b,0)/arr.length),0,4):arr[arr.length-1];
    idea.instr[k]=val; applied.push(d.lab+': '+d.opts[val]);
  });
  const shapes=det.found.filter(f=>f.shape&&(!onlyIds||onlyIds.includes(f.id)));
  if(shapes.length){ changeFormation(idea,'IP',shapes[0].shape); applied.push('Formação IP: '+shapes[0].shape); }
  else if(det.forms.length&&(!onlyIds||onlyIds.includes('forms'))){
    changeFormation(idea,'IP',det.forms[0]); applied.push('Formação IP: '+det.forms[0]);
    if(det.forms[1]){ changeFormation(idea,'OOP',det.forms[1]); applied.push('Formação OOP: '+det.forms[1]); }
  }
  return applied;
}

/* ---- métricas reais → instruções (ideia "TruMedia") ---- */
function interpretMetrics(m){
  const out=[]; const n=v=>v!==''&&v!=null&&!isNaN(parseFloat(v));
  if(n(m.ppda)){const v=parseFloat(m.ppda); const lv=v<8?4:v<10?3:v<13?2:v<18?1:0;
    out.push({k:'press',v:lv,why:`PPDA ${v} → ${['pressão muito baixa','pressão baixa','pressão moderada','pressão alta','pressão extrema'][lv]}`});
    out.push({k:'engagement',v:v<10?2:v<15?1:0,why:`PPDA ${v} → linha de pressão ${v<10?'alta':v<15?'média':'baixa'}`});}
  if(n(m.poss)){const v=parseFloat(m.poss); const lv=v>62?0:v>54?1:v>46?2:v>40?3:4;
    out.push({k:'directness',v:lv,why:`Posse ${v}% → passes ${['muito mais curtos','mais curtos','normais','mais diretos','muito mais diretos'][lv]}`});
    out.push({k:'tempo',v:v>60?1:v>46?2:3,why:`Posse ${v}% → ritmo ${v>60?'mais lento':v>46?'normal':'mais rápido'}`});}
  if(n(m.lineM)){const v=parseFloat(m.lineM); const lv=v>45?4:v>40?3:v>33?2:v>28?1:0;
    out.push({k:'line',v:lv,why:`Linha a ${v} m da baliza → ${['muito mais recuada','mais recuada','normal','mais avançada','muito mais avançada'][lv]}`});}
  if(n(m.longPct)){const v=parseFloat(m.longPct); const lv=v>20?4:v>15?3:v>10?2:v>7?1:0;
    out.push({k:'directness',v:lv,why:`${v}% de passes longos → passes ${['muito mais curtos','mais curtos','normais','mais diretos','muito mais diretos'][lv]}`});}
  if(n(m.dir)){const v=parseFloat(m.dir); const lv=v>2?4:v>1.7?3:v>1.4?2:v>1.2?1:0;
    out.push({k:'tempo',v:lv,why:`Velocidade vertical ${v} m/s → ritmo ${['muito mais lento','mais lento','normal','mais rápido','muito mais elevado'][lv]}`});}
  return out;
}
function applyMetrics(idea){
  const items=interpretMetrics(idea.metrics||{}); const votes={};
  items.forEach(i=>(votes[i.k]=votes[i.k]||[]).push(i.v));
  const done=[];
  Object.entries(votes).forEach(([k,a])=>{const v=clamp(Math.round(a.reduce((x,y)=>x+y,0)/a.length),0,k==='engagement'?2:4);idea.instr[k]=v;done.push(INSTR_BY_KEY[k].lab+': '+INSTR_BY_KEY[k].opts[v]);});
  return done;
}

/* ---- viabilidade ---- */
function countBy(slots,fn){return slots.filter(fn).length}
function roleOf(s){return s.role&&ROLES[s.role]?ROLES[s.role]:null}
function hasTag(s,t){const r=roleOf(s);return !!(r&&r.tags.includes(t))}

function requirements(idea){
  const I=idea.instr, oop=idea.OOP.slots, ip=idea.IP.slots;
  const pressers=oop.filter(s=>hasTag(s,'press')||hasTag(s,'track')).length;
  const wrRoles=oop.reduce((a,s)=>a+(roleOf(s)?roleOf(s).wr:0),0)/11;
  const pm=PITCHES[idea.pitch]||PITCHES.std;
  const r={};
  r.trab=clamp(9+(I.press-2)*1.3+(I.engagement-1)*1.2+wrRoles*1.4+(I.transDef===1?0.8:0),7,17);
  r.vel=clamp(10+(I.line-2)*1.6+(I.transOff===1?0.8:0)+(I.directness-2)*0.6+(pm.l>=110?0.5:0),7,17);
  r.tec=clamp(10-(I.directness-2)*1.2+(I.buildUp===1?1:0)+(I.gkDist===3||I.gkDist===1?0.6:0)+ip.filter(s=>hasTag(s,'build')||hasTag(s,'playmaker')).length*0.3,7,17);
  r.fis=clamp(10+(I.directness-2)*0.9+(I.tackle===2?1:0)+(pm.l<=100?1:0)+(I.marking===1?0.5:0),7,17);
  r.pos=clamp(10+(I.engagement===0?1.2:0)+(I.marking===0?0.6:0)+(I.line>=3?0.8:0)+(I.lineBehav!==0?0.4:0),7,17);
  return {r,pressers};
}
const REQ_LAB={trab:'Índice de Trabalho / Resistência',vel:'Velocidade / Aceleração (defensores)',tec:'Técnica / Passe / Primeiro Toque',fis:'Físico (Força / Impulsão / Duelos)',pos:'Posicionamento / Antecipação'};

function evaluate(idea){
  const rules=(idea.rules&&idea.rules[idea.version])||RULESETS_DEFAULT[idea.version]||RULESETS_DEFAULT.FM26;
  const I=idea.instr, ip=idea.IP.slots, oop=idea.OOP.slots;
  const dims=[];
  const F=(sev,t,fix)=>({sev,t,fix});

  /* 1. Estrutura IP ↔ OOP */
  {
    const f=[]; let s=100;
    const unassigned=ip.filter(x=>!x.role).length+oop.filter(x=>!x.role).length;
    if(unassigned){s-=Math.min(30,unassigned*2);f.push(F('info',`${unassigned} papéis ainda sem definição (IP+OOP).`,'Defina papel para todos os 22 slots para uma avaliação completa.'));}
    const disp=ip.map(a=>{const b=oop.find(o=>o.pid===a.pid);return b?{pid:a.pid,d:distM(a,b,idea.pitch),a,b}:null}).filter(Boolean);
    const big=disp.filter(x=>x.d>rules.maxDisp);
    const avg=disp.reduce((a,x)=>a+x.d,0)/(disp.length||1);
    if(big.length){s-=Math.min(35,big.length*9);f.push(F('warn',`${big.length} jogador(es) percorrem mais de ${rules.maxDisp} m entre IP e OOP (ex.: ${big.slice(0,2).map(x=>x.a.code+'→'+x.b.code+' '+Math.round(x.d)+' m').join(', ')}). O jogo alerta para transições irrealistas.`,'Aproxime as posições IP/OOP ou use papéis de transição (Transition Winger, Central Outlet).'));}
    else f.push(F('ok',`Transições IP→OOP realistas (média de ${avg.toFixed(0)} m por jogador).`));
    const defOOP=countBy(oop,x=>x.y>=70&&x.code!=='GK');
    if(defOOP<3||defOOP>5){s-=12;f.push(F('warn',`Linha defensiva OOP com ${defOOP} jogadores.`,'Use 3–5 defensores na formação sem bola.'));}
    const atkIP=countBy(ip,x=>x.y<=34);
    if(atkIP<2){s-=8;f.push(F('info','Menos de 2 jogadores na linha de ataque com bola.'));}
    dims.push({k:'estr',lab:'Estrutura IP/OOP',w:20,score:clamp(s,0,100),f});
  }

  /* 2. Rest defence */
  {
    const f=[]; let s;
    const D=countBy(ip,x=>x.code!=='GK'&&x.y>=70), M=countBy(ip,x=>x.y>=56&&x.y<70);
    if(D>=3&&M>=2){s=100;f.push(F('ok',`Rest defence ${D}+${M} com bola — estrutura de prevenção sólida (padrão 3+2 / 2+3 do FM26).`));}
    else if(D>=3){s=88;f.push(F('ok',`${D} defensores atrás da bola; falta uma camada intermédia (${M}).`,'Adicione um DM/Half-Back para formar 3+2.'));}
    else if(D===2&&M>=3){s=84;f.push(F('ok',`Estrutura 2+${M} (tipo 2-3-5): válida se os médios forem posicionais.`));}
    else if(D===2&&M===2){s=76;f.push(F('ok',`Estrutura 2+2 — aceitável, vulnerável a contra-ataques longos.`,'Considere Half-Back ou um lateral posicional.'));}
    else if(D===2&&M===1){s=58;f.push(F('warn',`Apenas 2 defensores + ${M} médio atrás da bola em posse.`,'Recuar um médio (Half-Back/Dropping DM) ou manter um lateral posicional.'));}
    else if(D===2){s=42;f.push(F('bad',`Só 2 defensores e nenhuma camada intermédia: expõe a equipa a transições.`,'Mínimo recomendado 3+2.'));}
    else {s=22;f.push(F('bad',`Apenas ${D} defensor(es) atrás da bola.`,'Reforçar a estrutura de repouso.'));}
    if(D<=2){const wideFB=countBy(ip,x=>(hasTag(x,'overlap')||hasTag(x,'wide'))&&groupOf(x.code)!=='W'&&groupOf(x.code)!=='ST'&&x.y>=56);
      if(wideFB>=2){s-=10;f.push(F('warn','Ambos os laterais/alas ofensivos com apenas 2 centrais.','Inverta um lateral ou recue um DM.'));}}
    if(I.transDef===1&&D>=3){s=Math.min(100,s+3);}
    dims.push({k:'rest',lab:'Rest defence',w:20,score:clamp(s,0,100),f});
  }

  /* 3. Papéis e sinergias */
  {
    const f=[]; let s=92;
    const cbIP=ip.filter(x=>groupOf(x.code)==='CB'), cbOOP=oop.filter(x=>groupOf(x.code)==='CB');
    if(cbIP.length===2||cbIP.length===3){
      const bp=cbIP.filter(x=>hasTag(x,'build')).length, nn=cbIP.filter(x=>hasTag(x,'safe')).length;
      if(bp===cbIP.length&&cbIP.length===2){s-=6;f.push(F('info','Dupla de zagueiros 100% construtores: saída bonita, sem segurança.','Combine Ball-Playing + No-Nonsense CB (padrão de elite do FM26).'));}
      else if(nn===cbIP.length&&cbIP.length===2){s-=6;f.push(F('info','Dupla pragmática: saída de bola pouco criativa.','Troque um por Ball-Playing CB.'));}
      else if(bp>=1&&nn>=1)f.push(F('ok','Dupla de zagueiros complementar (Ball-Playing + pragmático).'));
    }
    if(cbOOP.length>=2){
      const st=cbOOP.filter(x=>hasTag(x,'stop')).length, cv=cbOOP.filter(x=>hasTag(x,'cover')).length;
      if(st===cbOOP.length){s-=10;f.push(F('warn','Todos os zagueiros sem bola são de Antecipação (Stopping): ninguém cobre quando um sai da linha.','Mantenha ao menos um Covering CB.'));}
      else if(st>=1&&cv>=1)f.push(F('ok','Combinação Stopping + Covering nos zagueiros sem bola.'));
    }
    const inv=ip.filter(x=>hasTag(x,'inverts')&&['FB','WB','WM'].includes(groupOf(x.code)));
    const coverW=oop.filter(x=>hasTag(x,'wide')&&hasTag(x,'cover')).length;
    const anchor=ip.some(x=>hasTag(x,'dropsToCB')||hasTag(x,'safe')&&['DM','CM'].includes(groupOf(x.code)));
    if(inv.length>=2&&!coverW){s-=10;f.push(F('warn',`${inv.length} laterais/alas invertidos sem papel de cobertura lateral sem bola: flancos ficam abertos.`,'Use Wide Covering CB/DM, ou Covering WB.'));}
    else if(inv.length>=1&&!anchor){s-=6;f.push(F('info','Lateral invertido sem âncora de proteção atrás.','Adicione Half-Back/Holding DM.'));}
    else if(inv.length>=1)f.push(F('ok','Lateral invertido protegido por âncora/cobertura.'));
    const pmk=ip.filter(x=>hasTag(x,'playmaker')).length;
    if(pmk>3){s-=8;f.push(F('warn',`${pmk} criadores na fase IP: excesso de jogadores pedindo a bola.`,'Máximo recomendado 2–3 criadores.'));}
    const pressOOP=oop.filter(x=>hasTag(x,'press')).length, trkOOP=oop.filter(x=>hasTag(x,'track')).length;
    if(I.press>=3&&pressOOP+trkOOP<3){s-=12;f.push(F('warn',`Pressão alta configurada, mas só ${pressOOP+trkOOP} papéis de pressão/acompanhamento sem bola.`,'Use Pressing DM/CM/CF e Tracking Winger para coordenar o gatilho.'));}
    if(I.press<=1&&pressOOP>=3){s-=8;f.push(F('warn',`${pressOOP} papéis pressionantes com instrução de pressão baixa — incoerente.`,'Aumente "Fazer pressão" ou troque por papéis de Proteção (Screening).'));}
    if(I.press>=3&&pressOOP+trkOOP>=3)f.push(F('ok','Papéis sem bola coerentes com a pressão alta.'));
    const target=ip.some(x=>hasTag(x,'target'));
    if(I.directness>=3&&!target&&!ip.some(x=>hasTag(x,'runsBehind'))){s-=6;f.push(F('info','Jogo direto sem alvo nem atacante de profundidade.','Use Target Man ou Advanced/Channel Forward.'));}
    if(I.directness<=1&&target){s-=4;f.push(F('info','Target Man numa equipa de passes curtos tende a ficar isolado.'));}
    const gkO=oop.find(x=>x.code==='GK');
    if(I.line>=3&&!(gkO&&hasTag(gkO,'sweeper'))){s-=5;f.push(F('info','Linha muito alta sem Guarda-Redes Líbero.','Sweeper Keeper cobre os espaços nas costas.'));}
    dims.push({k:'pap',lab:'Papéis & sinergias',w:20,score:clamp(s,0,100),f});
  }

  /* 4. Instruções coerentes */
  {
    const f=[]; let s=100; const bad=(sev,pen,t,fix)=>{s-=pen;f.push(F(sev,t,fix))};
    if(I.engagement===2&&I.line<=1)bad('bad',22,'Bloco alto com linha defensiva recuada abre um enorme espaço entre linhas.','Suba a linha defensiva ou use bloco médio.');
    if(I.engagement===0&&I.line>=3)bad('bad',22,'Bloco baixo com linha defensiva muito avançada é contraditório.','Recue a linha ou suba o bloco.');
    if(I.line>=3&&I.press<=1)bad('warn',14,'Linha alta sem pressão sobre a bola: bolas nas costas da defesa são fáceis para o rival.','Aumente a pressão ou recue a linha.');
    if(I.directness>=3&&I.tempo<=1)bad('warn',9,'Passes diretos com ritmo lento: ataques pouco coordenados.');
    if(I.directness<=1&&I.tempo>=3)bad('info',5,'Passes curtos com ritmo muito alto aumenta erros de execução.');
    if(I.width<=1&&ip.filter(x=>hasTag(x,'wide')&&hasTag(x,'overlap')).length>=2)bad('warn',9,'Largura estreita mas dois laterais/alas de largura total.','Alinhe largura e papéis.');
    if(I.width>=3&&ip.filter(x=>hasTag(x,'inverts')).length>=3)bad('warn',9,'Largura alta com três jogadores invertidos: ninguém dá a largura.');
    if(I.transDef===1&&I.engagement===0)bad('warn',9,'Contrapressão em bloco baixo: jogadores demasiado longe da bola para recuperá-la.');
    if(I.transDef===2&&I.press>=3)bad('info',6,'Reagrupar após perda reduz o efeito da pressão alta.');
    if(I.transOff===1&&I.directness<=1)bad('info',5,'Contra-ataque exige passes mais diretos.');
    if(I.press>=4&&I.tackle===2)bad('info',6,'Pressão máxima + desarme agressivo eleva muito o risco de cartões e faltas perigosas.');
    if(I.press>=4)f.push(F('info','Pressão máxima: o FM26 penaliza "pressão em tudo" — prefira gatilhos específicos (armadilha por fora/dentro) e Índice de Trabalho ≥ 13.'));
    if(!f.some(x=>x.sev!=='ok'&&x.sev!=='info'))f.unshift(F('ok','Sem conflitos graves entre as instruções de equipa.'));
    dims.push({k:'ins',lab:'Instruções de equipa',w:15,score:clamp(s,0,100),f});
  }

  /* 5. Plantel */
  {
    const f=[]; let s=100; const {r,pressers}=requirements(idea);
    const sq=idea.squad||{};
    Object.keys(r).forEach(k=>{
      const have=parseFloat(sq[k]); if(isNaN(have))return;
      const gap=r[k]-have;
      if(gap>=4){s-=22;f.push(F('bad',`${REQ_LAB[k]}: exige ~${r[k].toFixed(1)} e o plantel tem ${have}.`,'Reduza a exigência ou contrate perfis melhores.'));}
      else if(gap>=2){s-=10;f.push(F('warn',`${REQ_LAB[k]}: exige ~${r[k].toFixed(1)}, plantel ${have} (deficit ${gap.toFixed(1)}).`));}
      else f.push(F('ok',`${REQ_LAB[k]}: plantel ${have} cobre a exigência (~${r[k].toFixed(1)}).`));
    });
    if(!f.length){f.push(F('info','Perfil do plantel não preenchido — preencha a aba "Plantel" para avaliar a viabilidade com os seus jogadores.'));s=75;}
    if(r.trab>=rules.wrPress&&parseFloat(sq.trab)<rules.wrPress)f.push(F('warn',`Regra FM26: Índice de Trabalho ≥ ${rules.wrPress} nos jogadores de pressão; abaixo de 10 gera buracos na rede defensiva.`));
    dims.push({k:'plan',lab:'Encaixe no plantel',w:15,score:clamp(s,0,100),f,reqs:r,pressers});
  }

  /* 6. Campo */
  {
    const f=[]; let s=82; const pm=PITCHES[idea.pitch]||PITCHES.std;
    if(idea.pitch==='small'){
      if(I.width>=3||I.directness<=1&&I.tempo<=1){s-=20;f.push(F('warn','Campo pequeno comprime o jogo exterior e anula equipas de posse.','Prefira pressão alta + jogo direto pelo meio.'));}
      if(I.press>=3&&I.directness>=3){s+=12;f.push(F('ok','Campo pequeno favorece pressão alta e transições diretas.'));}
    } else if(idea.pitch==='large'){
      if(I.press>=3&&I.line>=3){s-=18;f.push(F('warn','Campo grande dificulta blocos altos compactos (muito espaço entre jogadores).','Recue o bloco ou reduza a pressão.'));}
      if(I.width>=3&&I.directness<=2){s+=12;f.push(F('ok','Campo grande premia posse, largura e sobreposições.'));}
    } else f.push(F('ok','Campo standard (105×68 m): equilíbrio entre largura e compactação.'));
    if(!f.length)f.push(F('info',`Campo ${pm.lab}: sem efeito marcante para este modelo.`));
    dims.push({k:'campo',lab:'Dimensão do campo',w:10,score:clamp(s,0,100),f});
  }

  const wsum=dims.reduce((a,d)=>a+d.w,0);
  const unassigned=ip.filter(x=>!x.role).length+oop.filter(x=>!x.role).length;
  const completeness=1-unassigned/22;
  const score=Math.round(dims.reduce((a,d)=>a+d.score*d.w,0)/wsum*(0.5+0.5*completeness));
  let verdict,tone;
  if(unassigned>8){verdict='Incompleta — defina os papéis IP/OOP';tone='info'}
  else if(score>=82){verdict='Alta viabilidade no FM';tone='ok'}
  else if(score>=68){verdict='Viável com ajustes';tone='info'}
  else if(score>=50){verdict='Arriscada — precisa de revisão';tone='warn'}
  else {verdict='Inviável como está';tone='bad'}
  const fixes=[];dims.forEach(d=>d.f.forEach(x=>{if(x.fix&&(x.sev==='bad'||x.sev==='warn'))fixes.push(x)}));
  return {score,verdict,tone,dims,fixes,rules};
}

/* validação em jogo */
function logStats(idea){
  const L=idea.log||[]; if(!L.length)return null;
  let w=0,d=0,l=0,gf=0,ga=0,xf=0,xa=0,nx=0;
  L.forEach(g=>{if(g.res==='V')w++;else if(g.res==='E')d++;else l++;gf+=+g.gf||0;ga+=+g.ga||0;if(g.xgf!==''&&g.xgf!=null&&g.xga!==''&&g.xga!=null){xf+=+g.xgf;xa+=+g.xga;nx++}});
  const n=L.length;
  return {n,w,d,l,ppj:(w*3+d)/n,gf,ga,xf,xa,nx};
}
