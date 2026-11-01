/* ===== Dados estáticos: formações, catálogo de papéis, instruções, regras ===== */
const GROUPS = {GK:'Goleiro',FB:'Laterais',WB:'Alas',CB:'Zagueiros',DM:'Médios defensivos',CM:'Meias centrais',WM:'Meias abertos',AM:'Meias atacantes',W:'Pontas',ST:'Centroavantes'};

function groupOf(code){
  if(code==='GK')return 'GK';
  if(/^D[LR]$/.test(code))return 'FB';
  if(/^WB/.test(code))return 'WB';
  if(/^DC/.test(code))return 'CB';
  if(/^DM/.test(code))return 'DM';
  if(/^MC/.test(code))return 'CM';
  if(/^M[LR]$/.test(code))return 'WM';
  if(/^AM[LR]$/.test(code))return 'W';
  if(/^AM/.test(code))return 'AM';
  return 'ST';
}

/* x: 0 (esquerda) → 100 (direita); y: 0 (ataque) → 100 (própria baliza) */
const FORMS = {
 '4-3-3':[['GK',50,92],['DL',14,74],['DCL',37,79],['DCR',63,79],['DR',86,74],['DM',50,62],['MCL',31,50],['MCR',69,50],['AML',16,28],['STC',50,18],['AMR',84,28]],
 '4-2-3-1':[['GK',50,92],['DL',14,74],['DCL',37,79],['DCR',63,79],['DR',86,74],['DMCL',38,62],['DMCR',62,62],['AML',16,34],['AMC',50,38],['AMR',84,34],['STC',50,18]],
 '4-4-2':[['GK',50,92],['DL',14,74],['DCL',37,79],['DCR',63,79],['DR',86,74],['ML',14,52],['MCL',38,55],['MCR',62,55],['MR',86,52],['STCL',40,20],['STCR',60,20]],
 '4-1-4-1':[['GK',50,92],['DL',14,74],['DCL',37,79],['DCR',63,79],['DR',86,74],['DM',50,64],['ML',14,46],['MCL',38,48],['MCR',62,48],['MR',86,46],['STC',50,20]],
 '4-4-2 Losango':[['GK',50,92],['DL',14,74],['DCL',37,79],['DCR',63,79],['DR',86,74],['DM',50,64],['MCL',30,50],['MCR',70,50],['AMC',50,36],['STCL',40,20],['STCR',60,20]],
 '3-5-2':[['GK',50,92],['DCL',27,78],['DC',50,81],['DCR',73,78],['WBL',10,54],['WBR',90,54],['DM',50,64],['MCL',34,48],['MCR',66,48],['STCL',40,20],['STCR',60,20]],
 '3-4-3':[['GK',50,92],['DCL',27,78],['DC',50,81],['DCR',73,78],['ML',12,54],['MCL',38,56],['MCR',62,56],['MR',88,54],['AML',18,26],['STC',50,18],['AMR',82,26]],
 '5-3-2':[['GK',50,92],['WBL',8,66],['DCL',29,78],['DC',50,81],['DCR',71,78],['WBR',92,66],['MCL',30,50],['MC',50,54],['MCR',70,50],['STCL',40,20],['STCR',60,20]],
 '5-4-1':[['GK',50,92],['WBL',8,66],['DCL',29,78],['DC',50,81],['DCR',71,78],['WBR',92,66],['ML',14,50],['MCL',38,52],['MCR',62,52],['MR',86,50],['STC',50,20]],
 '3-2-5 (posse)':[['GK',50,92],['DCL',27,80],['DC',50,82],['DCR',73,80],['DMCL',38,62],['DMCR',62,62],['AML',10,30],['AMCL',32,26],['STC',50,16],['AMCR',68,26],['AMR',90,30]],
 '2-3-5 (posse)':[['GK',50,92],['DCL',38,80],['DCR',62,80],['DM',50,62],['MCL',26,52],['MCR',74,52],['AML',10,28],['AMCL',32,22],['STC',50,16],['AMCR',68,22],['AMR',90,28]],
 '2-4-4 (posse)':[['GK',50,92],['DCL',38,82],['DCR',62,82],['ML',10,54],['MCL',36,58],['MCR',64,58],['MR',90,54],['AML',14,26],['STCL',38,17],['STCR',62,17],['AMR',86,26]]
};

/* [grupo, fase, id, PT, EN, tags, nível de trabalho exigido 0-3] */
const ROLE_ROWS = [
 ['GK','IP','ipgk_ball','Guarda-Redes Construtor','Ball-Playing GK','build,advance',0],
 ['GK','IP','ipgk_sweep','Guarda-Redes Líbero','Sweeper Keeper','build,sweeper',0],
 ['GK','IP','ipgk_std','Guarda-Redes','Goalkeeper','basic',0],
 ['FB','IP','ipfb_std','Lateral','Full-Back','basic',1],
 ['FB','IP','ipfb_att','Lateral Ofensivo','Attacking FB','wide,overlap',3],
 ['FB','IP','ipfb_inv','Lateral Invertido','Inverted FB','inverts,build',2],
 ['FB','IP','ipfb_play','Lateral Criativo','Playmaking FB','playmaker,inverts',2],
 ['FB','IP','ipfb_hold','Lateral Posicional','Holding FB','safe',1],
 ['WB','IP','ipwb_std','Ala','Wing-Back','wide',2],
 ['WB','IP','ipwb_att','Ala Ofensivo','Attacking WB','wide,overlap',3],
 ['WB','IP','ipwb_inv','Ala Invertido','Inside Wing-Back','inverts,build',2],
 ['WB','IP','ipwb_play','Ala Criativo','Playmaking WB','playmaker,wide',2],
 ['WB','IP','ipwb_hold','Ala Posicional','Holding WB','safe',1],
 ['CB','IP','ipcb_nn','Central Pragmático','No-Nonsense CB','safe',0],
 ['CB','IP','ipcb_bp','Central de Construção','Ball-Playing CB','build',0],
 ['CB','IP','ipcb_adv','Central Projetado','Advanced CB','advances,build,dropsToDM',1],
 ['CB','IP','ipcb_ovl','Central de Sobreposição','Overlapping CB','wide,overlap',2],
 ['CB','IP','ipcb_wide','Central Aberto','Wide CB','wide,safe',1],
 ['DM','IP','ipdm_dlp','Organizador Recuado','Deep-Lying Playmaker','playmaker,build',1],
 ['DM','IP','ipdm_hb','Médio Recuado','Half-Back','dropsToCB',1],
 ['DM','IP','ipdm_drop','DM Recuado','Dropping DM','dropsToCB,build',1],
 ['DM','IP','ipdm_hold','Âncora','Holding DM','safe',0],
 ['DM','IP','ipdm_mp','Médio Criador','Midfield Playmaker','playmaker',1],
 ['CM','IP','ipcm_mp','Médio Criador','Midfield Playmaker','playmaker',1],
 ['CM','IP','ipcm_b2b','Médio Box-to-Box','Box-to-Box','advances,runs',3],
 ['CM','IP','ipcm_ch','Médio de Canal','Channel Midfielder','runs,halfspace',3],
 ['CM','IP','ipcm_hold','Médio Posicional','Holding CM','safe',1],
 ['CM','IP','ipcm_adv','Organizador Avançado','Advanced Playmaker','playmaker',1],
 ['WM','IP','ipwm_std','Meia Aberto','Wide Midfielder','wide',2],
 ['WM','IP','ipwm_pm','Criador Aberto','Wide Playmaker','playmaker,inverts',1],
 ['WM','IP','ipwm_hs','Meia de Meio-Espaço','Half-Space Winger','halfspace,inverts',2],
 ['W','IP','ipw_win','Extremo','Winger','wide',2],
 ['W','IP','ipw_in','Extremo Interior','Inside Winger','inverts,shoot',2],
 ['W','IP','ipw_hs','Extremo de Meio-Espaço','Half-Space Winger','halfspace,inverts',2],
 ['W','IP','ipw_wf','Atacante Aberto','Wide Forward','runsBehind',2],
 ['W','IP','ipw_inv','Extremo Invertido','Inverted Winger','inverts,playmaker',1],
 ['AM','IP','ipam_ap','Organizador Avançado','Advanced Playmaker','playmaker',1],
 ['AM','IP','ipam_free','Papel Livre','Free Role','playmaker,free',0],
 ['AM','IP','ipam_att','Médio Ofensivo','Attacking Midfielder','shoot',1],
 ['AM','IP','ipam_sh','Atacante Sombra','Shadow Striker','runsBehind',2],
 ['ST','IP','ipst_tm','Avançado Alvo Ofensivo','Attacking Target Man','target',1],
 ['ST','IP','ipst_af','Avançado Móvel','Advanced Forward','runsBehind',2],
 ['ST','IP','ipst_cf','Avançado de Canal','Channel Forward','runsBehind,wide',3],
 ['ST','IP','ipst_hs','Avançado de Meio-Espaço','Half-Space Forward','halfspace',2],
 ['ST','IP','ipst_dlf','Avançado Recuado','Deep-Lying Forward','link,playmaker',1],
 ['ST','IP','ipst_p','Raposa da Área','Poacher','shoot',0],
 ['ST','IP','ipst_cmp','Avançado Completo','Complete Forward','runsBehind,link',2],
 ['ST','IP','ipst_f9','Falso 9','False Nine','link,playmaker',1],

 ['GK','OOP','oopgk_std','Guarda-Redes','Goalkeeper','basic',0],
 ['GK','OOP','oopgk_sweep','Guarda-Redes Líbero','Sweeper Keeper','sweeper',0],
 ['FB','OOP','oopfb_cov','Lateral de Cobertura','Covering FB','cover',1],
 ['FB','OOP','oopfb_press','Lateral Pressionante','Pressing FB','press',3],
 ['FB','OOP','oopfb_hold','Lateral Posicional','Holding FB','safe',1],
 ['WB','OOP','oopwb_trk','Ala Trabalhador','Tracking WB','track',3],
 ['WB','OOP','oopwb_press','Ala Pressionante','Pressing WB','press',3],
 ['WB','OOP','oopwb_cov','Ala de Cobertura','Covering WB','cover',1],
 ['WB','OOP','oopwb_ret','Ala Recuado','Retreating WB','safe',1],
 ['CB','OOP','oopcb_stop','Central de Antecipação','Stopping CB','stop',2],
 ['CB','OOP','oopcb_cov','Central de Cobertura','Covering CB','cover',0],
 ['CB','OOP','oopcb_wstop','Central Aberto de Antecipação','Wide Stopping CB','stop,wide',2],
 ['CB','OOP','oopcb_wcov','Central Aberto de Cobertura','Wide Covering CB','cover,wide',1],
 ['DM','OOP','oopdm_scr','Médio de Proteção','Screening DM','screen',1],
 ['DM','OOP','oopdm_press','DM Pressionante','Pressing DM','press',3],
 ['DM','OOP','oopdm_wcov','Médio de Cobertura Lateral','Wide Covering DM','cover,wide',2],
 ['CM','OOP','oopcm_scr','Médio de Proteção','Screening CM','screen',1],
 ['CM','OOP','oopcm_press','Médio Pressionante','Pressing CM','press',3],
 ['CM','OOP','oopcm_trk','Médio Trabalhador','Tracking CM','track',3],
 ['CM','OOP','oopcm_wcov','Médio de Cobertura Lateral','Wide Covering CM','cover,wide',2],
 ['WM','OOP','oopwm_trk','Médio Ala Esforçado','Tracking Wide Mid','track',3],
 ['WM','OOP','oopwm_trans','Médio Ala de Transição','Transition Wide Mid','stay,counter',1],
 ['AM','OOP','oopam_trk','Médio Ofensivo Esforçado','Tracking AM','track',3],
 ['AM','OOP','oopam_co','Médio Ofensivo de Referência','Central Outlet AM','stay',0],
 ['AM','OOP','oopam_it','Médio Ofensivo de Transições Interiores','Inside Transition AM','stay,counter',1],
 ['AM','OOP','oopam_link','Médio Ofensivo de Ligação','Link AM','link',1],
 ['AM','OOP','oopam_press','AM Pressionante','Pressing AM','press',3],
 ['W','OOP','oopw_trk','Extremo Esforçado','Tracking Winger','track',3],
 ['W','OOP','oopw_trans','Extremo de Transição','Transition Winger','stay,counter',1],
 ['W','OOP','oopw_itrans','Extremo Invertido de Transição','Inverted Transition Winger','stay,counter',1],
 ['ST','OOP','oopst_trk','Avançado Esforçado','Tracking CF','track',3],
 ['ST','OOP','oopst_co','Avançado de Referência','Central Outlet CF','stay',0],
 ['ST','OOP','oopst_split','Avançado Divisor','Splitting Outlet CF','stay,counter',1],
 ['ST','OOP','oopst_link','Avançado de Ligação','Link CF','link',1],
 ['ST','OOP','oopst_press','Avançado Pressionante','Pressing CF','press',3]
];

const ATTR_BY_TAG = {
 press:['Índice de Trabalho','Resistência','Aceleração','Trabalho de Equipa','Agressividade'],
 track:['Índice de Trabalho','Resistência','Aceleração','Trabalho de Equipa'],
 build:['Passe','Técnica','Decisões','Primeiro Toque','Posicionamento'],
 playmaker:['Passe','Visão','Decisões','Técnica','Primeiro Toque'],
 safe:['Marcação','Posicionamento','Antecipação','Força'],
 stop:['Desarme','Agressividade','Impulsão','Força','Bravura'],
 cover:['Antecipação','Posicionamento','Velocidade','Concentração'],
 screen:['Antecipação','Posicionamento','Marcação','Trabalho de Equipa'],
 wide:['Cruzamentos','Resistência','Aceleração','Velocidade'],
 overlap:['Resistência','Velocidade','Cruzamentos'],
 inverts:['Técnica','Passe','Decisões','Posicionamento'],
 advances:['Passe','Técnica','Desmarcação','Resistência'],
 runs:['Desmarcação','Resistência','Aceleração','Índice de Trabalho'],
 runsBehind:['Desmarcação','Aceleração','Velocidade','Finalização'],
 halfspace:['Desmarcação','Técnica','Primeiro Toque','Drible'],
 target:['Cabeceamento','Força','Impulsão','Equilíbrio','Bravura'],
 shoot:['Finalização','Remates de Longe','Frieza','Primeiro Toque'],
 link:['Passe','Primeiro Toque','Visão','Trabalho de Equipa'],
 free:['Visão','Criatividade','Técnica','Decisões'],
 sweeper:['Rapidez de Saída','Reflexos','Passe','Antecipação'],
 stay:['Desmarcação','Aceleração','Finalização'],
 counter:['Velocidade','Aceleração','Desmarcação'],
 dropsToCB:['Passe','Posicionamento','Decisões','Antecipação'],
 dropsToDM:['Passe','Técnica','Posicionamento'],
 basic:[]
};

const ROLES = {};
ROLE_ROWS.forEach(r=>{
  const tags=r[5].split(',').filter(Boolean);
  const attrs=[];tags.forEach(t=>(ATTR_BY_TAG[t]||[]).forEach(a=>{if(!attrs.includes(a))attrs.push(a)}));
  const ab=r[4].replace(/-/g,' ').split(/\s+/).map(w=>w[0].toUpperCase()).join('').slice(0,3);
  ROLES[r[2]]={id:r[2],grp:r[0],phase:r[1],pt:r[3],en:r[4],tags,wr:r[6],attrs:attrs.slice(0,6),ab};
});

/* ===== Instruções de equipa (nomes do jogo FM26 do Banco de Dados) ===== */
const SCALE5 = (a)=>a;
const INSTR_DEF = [
 {k:'directness',ph:'IP',lab:'Caráter direto dos passes',opts:['Muito mais curtos','Mais curtos','Normal','Mais diretos','Muito mais diretos'],type:'scale'},
 {k:'tempo',ph:'IP',lab:'Ritmo',opts:['Muito mais lento','Mais lento','Normal','Mais rápido','Muito mais elevado'],type:'scale'},
 {k:'width',ph:'IP',lab:'Largura atacante',opts:['Muito estreita','Estreita','Normal','Larga','Muito larga'],type:'scale'},
 {k:'creative',ph:'IP',lab:'Liberdade criativa',opts:['Muito disciplinado','Mais disciplinado','Equilibrado','Mais expressivo','Muito expressivo'],type:'scale'},
 {k:'transOff',ph:'IP',lab:'Transição ofensiva',opts:['Padrão','Contra-ataque','Manter formação'],type:'sel'},
 {k:'buildUp',ph:'IP',lab:'Construir jogo',opts:['Equilibrado','Sair da pressão'],type:'sel'},
 {k:'gkDist',ph:'IP',lab:'Distribuição do GR',opts:['Equilibrado','Centrais','Laterais','Construtor de jogo','Avançado alvo','Sobre defesa adversária'],type:'sel'},
 {k:'gkKick',ph:'IP',lab:'Pontapés de baliza',opts:['Mista','Curta','Longa'],type:'sel'},
 {k:'advanceVia',ph:'IP',lab:'Avançar por',opts:['Equilibrado','Meio','Ambos os flancos','Lado esquerdo','Lado direito'],type:'sel'},
 {k:'engagement',ph:'OOP',lab:'Linha de pressão',opts:['Bloco baixo','Bloco médio','Bloco alto'],type:'sel2'},
 {k:'line',ph:'OOP',lab:'Linha defensiva',opts:['Muito mais recuada','Mais recuada','Normal','Mais avançada','Muito mais avançada'],type:'scale'},
 {k:'press',ph:'OOP',lab:'Fazer pressão',opts:['Muito menos','Menos','Normal','Mais','Muito mais'],type:'scale'},
 {k:'transDef',ph:'OOP',lab:'Transição defensiva',opts:['Normal','Contrapressão','Reagrupar'],type:'sel'},
 {k:'tackle',ph:'OOP',lab:'Desarme',opts:['Evitar carrinhos','Normal','Mais agressivo'],type:'sel'},
 {k:'trap',ph:'OOP',lab:'Zona de pressão',opts:['Equilibrado','Obrigar a jogar por dentro','Obrigar a jogar por fora'],type:'sel'},
 {k:'lineBehav',ph:'OOP',lab:'Comportamento da linha',opts:['Equilibrado','Subir a linha defensiva','Baixar a linha defensiva'],type:'sel'},
 {k:'marking',ph:'OOP',lab:'Marcação (bolas paradas)',opts:['Zona','Homem'],type:'sel'}
];
const INSTR_DEFAULT = {directness:2,tempo:2,width:2,creative:2,transOff:0,buildUp:0,gkDist:0,gkKick:0,advanceVia:0,engagement:1,line:2,press:2,transDef:0,tackle:1,trap:0,lineBehav:0,marking:0};
/* escalas guardam índice 0..4 (2 = normal); selects guardam índice da opção */

const PITCHES = {small:{lab:'Pequeno (100×64 m)',l:100,w:64},std:{lab:'Standard (105×68 m)',l:105,w:68},large:{lab:'Grande (110×74 m)',l:110,w:74}};

/* ===== Regras do motor (editáveis; FM27 começa como cópia provisória do FM26) ===== */
const RULESETS_DEFAULT = {
 FM26:{restDefMin:3, wrPress:13, maxDisp:35, provisional:false},
 FM27:{restDefMin:3, wrPress:13, maxDisp:35, provisional:true}
};

/* ===== Extração de ideias a partir de texto (heurística por palavras-chave) ===== */
const KEYWORDS = [
 {id:'hpress',lab:'Pressão alta / contrapressão',re:/(press[aã]o alta|high[- ]?press|gegen\s?press|contra-?press[aã]o|counter-?press|pressing alto|pressiona(?:m|r)? alto|ppda)/i,set:{press:4,engagement:2,transDef:1},note:'Pressão alta → Fazer pressão "Muito mais", Linha de pressão alta, Transição defensiva "Contrapressão". Exige Índice de Trabalho ≥ 13.'},
 {id:'lowblock',lab:'Bloco baixo',re:/(bloco baixo|low[- ]?block|deep[- ]?block|defesa recuada|bloco recuado)/i,set:{engagement:0,line:0,press:1,transOff:1},note:'Bloco baixo → linha de pressão baixa, linha defensiva recuada, menos pressão, Contra-ataque.'},
 {id:'midblock',lab:'Bloco médio',re:/(bloco m[eé]dio|mid[- ]?block|medium block)/i,set:{engagement:1,line:2,press:2},note:'Bloco médio → valores neutros de pressão/linha.'},
 {id:'highline',lab:'Linha defensiva alta',re:/(linha (?:defensiva )?alta|high (?:defensive )?line|linha adiantada|linha avan[cç]ada)/i,set:{line:4,lineBehav:1},note:'Linha alta → "Muito mais avançada"; exige zagueiros rápidos e GR líbero ideal.'},
 {id:'possession',lab:'Jogo de posse / construção',re:/(jogo de posse|possession|build-?up|sa[ií]da de bola|jogo posicional|juego de posici[oó]n|positional play|tiki-?taka|constru[cç][aã]o curta)/i,set:{directness:0,tempo:1,buildUp:1,gkKick:1,gkDist:1},note:'Posse → passes mais curtos, ritmo mais lento, Sair da pressão, pontapé curto.'},
 {id:'counter',lab:'Contra-ataque / transições',re:/(contra-?ataque|counter-?attack|transi[cç][oõ]es? r[aá]pid|vertical|jogo direto|direct play|long ball|bola longa)/i,set:{directness:3,tempo:3,transOff:1},note:'Transição/jogo direto → passes mais diretos, ritmo mais rápido, Contra-ataque.'},
 {id:'halfspace',lab:'Meios-espaços',re:/(meios?-?espa[cç]os?|half-?spaces?)/i,roleHint:'Extremo/Avançado de Meio-Espaço (Half-Space Winger/Forward).',note:'Sugere papéis de Meio-Espaço nos pontas ou avançados.'},
 {id:'shape325',lab:'Estrutura 3-2-5 / 2-3-5 / rest defence',re:/(3-2-5|2-3-5|3\+2|2\+3|rest[- ]?defen[cs]e|defesa de repouso|estrutura de prote[cç][aã]o)/i,shape:'3-2-5 (posse)',note:'Rest defence 3+2: use Half-Back/Dropping DM ou lateral invertido na fase IP.'},
 {id:'shape244',lab:'Saída 2-4-4',re:/(2-4-4)/i,shape:'2-4-4 (posse)',note:'Estilo De Zerbi: GR Construtor + laterais invertidos/avançados para a linha do meio.'},
 {id:'invfb',lab:'Lateral invertido',re:/(lateral invertido|inverted (?:full-?back|fullback)|inside (?:full-?back|wing-?back)|lateral por dentro|lateral entra no meio)/i,roleHint:'Lateral Invertido / Ala Invertido na fase IP.',note:'Exige cobertura lateral (Central Aberto/Médio de Cobertura Lateral) e DM âncora.'},
 {id:'f9',lab:'Falso 9',re:/(falso 9|false (?:nine|9))/i,roleHint:'Falso 9 (IP) + Avançado de Ligação (OOP).',note:'Sugere Falso 9 e criadores a chegarem por trás.'},
 {id:'gk',lab:'Goleiro construtor / líbero',re:/(goleiro|guarda-?redes|goalkeeper|keeper).{0,40}(constr|build|ball-?playing|l[ií]bero|sweeper|saída)/i,set:{gkDist:3,gkKick:1},roleHint:'Guarda-Redes Construtor (IP) ou Líbero.',note:'GR participa da construção.'},
 {id:'width',lab:'Largura / jogo pelos flancos',re:/(amplitude|largura|wing ?play|jogo pelas alas|jogo exterior|cruzamentos?|crosses|crossing|overload)/i,set:{width:3,advanceVia:2},note:'Largura → Largura atacante "Larga", Avançar por ambos os flancos.'},
 {id:'narrow',lab:'Jogo interior / estreito',re:/(jogo interior|estreito|narrow|congestion|congestionar|overload central|corredor central)/i,set:{width:1,advanceVia:1},note:'Jogo interior → largura estreita, avançar pelo meio.'},
 {id:'manmark',lab:'Marcação individual',re:/(marca[cç][aã]o individual|homem a homem|man-?marking|man-?oriented|1v1 all over)/i,set:{marking:1,tackle:2},note:'Marcação individual/orientada ao homem → Marcação "Homem" e Desarme mais agressivo.'},
 {id:'zonal',lab:'Marcação por zona',re:/(marca[cç][aã]o (?:por|[àa]) zona|zonal)/i,set:{marking:0},note:'Marcação por zona nas bolas paradas.'},
 {id:'trapout',lab:'Armadilha pelos lados',re:/(trap outside|armadilha.{0,10}lado|empurrar para os lados|force(?:s|d)? wide|funnel(?:s|ing)? wide|obrigar.{0,10}fora)/i,set:{trap:2},note:'Zona de pressão: obrigar a jogar por fora.'},
 {id:'trapin',lab:'Armadilha por dentro',re:/(trap inside|obrigar.{0,10}dentro|force(?:s|d)? inside|funnel(?:s|ing)? inside)/i,set:{trap:1},note:'Zona de pressão: obrigar a jogar por dentro.'}
];

const METRIC_DEFS = [
 {k:'ppda',lab:'PPDA',unit:'',hint:'passes do adversário por ação defensiva; menor = pressão mais intensa'},
 {k:'poss',lab:'Posse média',unit:'%',hint:''},
 {k:'lineM',lab:'Altura média da linha defensiva',unit:'m',hint:'distância da própria baliza'},
 {k:'longPct',lab:'Passes longos',unit:'%',hint:'% dos passes que são longos'},
 {k:'dir',lab:'Velocidade vertical',unit:'m/s',hint:'opcional (ex.: 1,3 = posse paciente, 2,0+ = muito vertical)'}
];
