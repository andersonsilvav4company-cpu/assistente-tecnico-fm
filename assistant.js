/* ===== Ponte com o chat do Claude: instruções do projeto + importador da resposta ===== */
const norm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

function buildProjectInstructions(){
  const slotCodes=f=>FORMS[f].map(s=>s[0]).join(', ');
  const roleLines=ph=>Object.keys(GROUPS).map(g=>{
    const rs=Object.values(ROLES).filter(r=>r.phase===ph&&r.grp===g);
    return rs.length?`- ${GROUPS[g]}: `+rs.map(r=>`${r.pt} (${r.en})`).join(' | '):'';
  }).filter(Boolean).join('\n');
  const instrLines=INSTR_DEF.map(d=>`- [${d.ph==='IP'?'com bola':'sem bola'}] ${d.lab}: ${d.opts.join(' | ')}`).join('\n');
  return `# Papel
Você é meu ASSISTENTE TÉCNICO para o Football Manager (FM26 hoje; FM27 quando sair). Quando eu disser "quero implementar as ideias do treinador X (ou do time Y)", você transforma o que foi analisado no futebol real em uma tática jogável no FM e me entrega visualmente no meu app "Laboratório Tático FM".

# Como trabalhar
1. PESQUISE NA WEB (em qualquer idioma: PT, EN, ES, IT, DE…) análises táticas, artigos, threads de analistas e jornalistas, dados (PPDA, posse, altura da linha, passes longos, xG) sobre o treinador/time pedido. Prefira fontes recentes e especializadas. Cruze várias fontes e aponte divergências.
2. Resuma o modelo de jogo real: estrutura com bola (construção, rest defence), sem bola (bloco, pressão, gatilhos), transições, bolas paradas, perfil dos jogadores.
3. TRADUZA para o FM usando o sistema de formações duplas: uma formação COM BOLA (IP) e outra SEM BOLA (OOP), com um papel para cada jogador em cada fase (não existem mais "tarefas").
4. AVALIE A VIABILIDADE: o que o motor do FM reproduz bem, o que não reproduz, riscos (rest defence mínima 3+2 ou 2+3; Índice de Trabalho ≥ 13 para pressão coordenada; linha alta pede zagueiros rápidos; campo pequeno/grande muda o modelo), e que perfil de jogador é preciso. Seja honesto: se a ideia não funciona bem no FM, diga.
5. Se faltar informação (versão do jogo, tamanho do campo, elenco), pergunte antes de montar.
6. Responda em português, com explicação curta e direta, e ao final UM bloco \`\`\`json no formato abaixo.

# Regras do motor (FM26) que você deve respeitar
- Rest defence: com bola, manter 3+2 ou 2+3 atrás da bola. 3-2-5 vem de Half-Back/Dropping DM descendo ou laterais invertidos; 2-3-5 com Inside Wing-Backs.
- Pressão: evitar "pressionar tudo"; use gatilhos/armadilhas (Zona de pressão por dentro/fora) e papéis pressionantes coerentes. Índice de Trabalho ≥ 13 coordena pressão; < 10 abre buracos.
- Campo pequeno (100×64): pressão e jogo direto; standard (105×68): equilíbrio; grande (110×74): posse e jogo pelas alas.
- Lateral invertido exige cobertura lateral (Central Aberto, Médio de Cobertura Lateral) e um DM âncora.
- Enganche = Papel Livre (com bola) + Médio Ofensivo de Referência (sem bola). Trequartista = Organizador Avançado/Papel Livre + Médio Ofensivo Esforçado.

# Formato do JSON (use SOMENTE nomes das listas abaixo)
\`\`\`json
{
  "titulo": "Treinador X — ideia em uma linha",
  "treinador": "Nome",
  "versao": "FM26",
  "campo": "padrao",
  "formacao_com_bola": "4-3-3",
  "formacao_sem_bola": "4-4-2",
  "papeis_com_bola": { "GK": "Guarda-Redes Construtor", "DCL": "Central de Construção" },
  "papeis_sem_bola": { "GK": "Guarda-Redes", "DCL": "Central de Cobertura" },
  "instrucoes": { "Linha defensiva": "Mais avançada", "Fazer pressão": "Mais" },
  "resumo": "Parágrafo explicando o modelo de jogo real e a tradução para o FM.",
  "por_que_funciona": ["motivo 1", "motivo 2"],
  "riscos": ["risco 1 e como mitigar", "risco 2"],
  "perfil_de_jogadores": { "Zagueiros": "rápidos, bons de passe", "Pontas": "..." },
  "viabilidade_comentario": "Veredito honesto: funciona / funciona com ajustes / não recomendo, e por quê.",
  "confianca": "alta | média | baixa (qualidade das fontes)",
  "fontes": [ { "titulo": "…", "url": "https://…", "idioma": "EN" } ]
}
\`\`\`
Regras do JSON: "campo" = pequeno | padrao | grande. As chaves de "papeis_*" são os CÓDIGOS DE POSIÇÃO da formação escolhida (lista abaixo) e devem cobrir os 11 jogadores. Os papéis devem existir na lista da fase correspondente. Se um nome de instrução/opção não estiver na lista, não invente: omita.

# Formações e códigos de posição
${Object.keys(FORMS).map(f=>`- ${f}: ${slotCodes(f)}`).join('\n')}

# Papéis COM BOLA (IP) por posição
${roleLines('IP')}

# Papéis SEM BOLA (OOP) por posição
${roleLines('OOP')}

# Instruções de equipe (nome: opções)
${instrLines}

# Transferências (fase 2)
Quando eu enviar prints de jogadores (atributos, posição, idade, contrato, valor) e disser que estamos na janela de transferências, avalie se o jogador ENCAIXA na tática que montamos: compare os atributos-chave com os papéis dele (IP e OOP), aponte pontos fortes/fracos, se compensa pelo preço/idade/contrato, alternativas e riscos. Seja objetivo e mostre o raciocínio.
`;
}

function extractJSON(text){
  const m=text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let raw=m?m[1]:text;
  const a=raw.indexOf('{'),b=raw.lastIndexOf('}');
  if(a<0||b<=a)throw new Error('Não encontrei um bloco JSON na resposta.');
  return JSON.parse(raw.slice(a,b+1));
}
function resolveForm(name){
  if(!name)return null; const n=norm(name);
  const keys=Object.keys(FORMS);
  return keys.find(k=>norm(k)===n)||keys.find(k=>norm(k.split(' ')[0])===n)||keys.find(k=>norm(k).startsWith(n))||null;
}
function resolveRole(name,phase){
  const n=norm(name); if(!n)return null;
  const rs=Object.values(ROLES).filter(r=>r.phase===phase);
  return (rs.find(r=>r.id===name||norm(r.pt)===n||norm(r.en)===n)||rs.find(r=>norm(r.pt).includes(n)||n.includes(norm(r.pt))||norm(r.en).includes(n)))?.id||null;
}
function importAnalysis(obj){
  const w=[]; const idea=blankIdea(obj.titulo||'Análise do assistente');
  idea.coach=obj.treinador||''; idea.team=obj.time||'';
  idea.version=/27/.test(obj.versao||'')?'FM27':'FM26';
  const pm=norm(obj.campo); idea.pitch=/peq/.test(pm)?'small':/gran/.test(pm)?'large':'std';
  const fi=resolveForm(obj.formacao_com_bola), fo=resolveForm(obj.formacao_sem_bola);
  if(fi)changeFormation(idea,'IP',fi);else w.push('Formação com bola não reconhecida: '+obj.formacao_com_bola);
  if(fo)changeFormation(idea,'OOP',fo);else w.push('Formação sem bola não reconhecida: '+obj.formacao_sem_bola);
  [['IP',obj.papeis_com_bola],['OOP',obj.papeis_sem_bola]].forEach(([ph,map])=>{
    Object.entries(map||{}).forEach(([code,rn])=>{
      const s=idea[ph].slots.find(x=>x.code===code.toUpperCase());
      if(!s){w.push(`Posição ${code} não existe na formação ${ph}`);return}
      const id=resolveRole(rn,ph); if(id)s.role=id;else w.push(`Papel não reconhecido (${ph} ${code}): ${rn}`);
    });
  });
  Object.entries(obj.instrucoes||{}).forEach(([lab,val])=>{
    const d=INSTR_DEF.find(x=>norm(x.lab)===norm(lab)||norm(x.lab).includes(norm(lab)));
    if(!d){w.push('Instrução não reconhecida: '+lab);return}
    let k=typeof val==='number'?val:d.opts.findIndex(o=>norm(o)===norm(val));
    if(k<0)k=d.opts.findIndex(o=>norm(o).includes(norm(val))||norm(val).includes(norm(o)));
    if(k<0||k>=d.opts.length){w.push(`Opção não reconhecida em "${d.lab}": ${val}`);return}
    idea.instr[d.k]=k;
  });
  idea.notes=obj.resumo||'';
  idea.analysis={porque:obj.por_que_funciona||[],riscos:obj.riscos||[],perfil:obj.perfil_de_jogadores||{},comentario:obj.viabilidade_comentario||'',confianca:obj.confianca||'',fontes:obj.fontes||[]};
  (obj.fontes||[]).forEach(f=>idea.sources.push({id:uid(),type:'Claude',title:f.titulo||'',url:f.url||'',text:''}));
  return {idea,warnings:w};
}
