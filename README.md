# assistente-tecnico-fm
Assistente técnico para jogar FM.

## Uso
Abra `index.html` (ou a versão publicada no GitHub Pages). Roda 100% no navegador e salva as ideias no próprio navegador (use Exportar/Importar para backup).

- Campo tático com formações com bola (IP) e sem bola (OOP) do FM26
- Análise de texto de fontes → instruções do FM
- Nota de viabilidade (estimativa por regras do relatório FM26, não simulação do motor)
- Registro de jogos para validar a ideia

Catálogo de papéis e instruções: `data.js`. Regras de viabilidade: `engine.js`.

## Assistente via Claude.ai (sem custo de API)
1. No app, clique em **Copiar instruções do projeto** (ou use `INSTRUCOES-PROJETO-CLAUDE.md`) e cole nas instruções de um Projeto no Claude.ai.
2. Converse: "quero implementar as ideias do treinador X no FM26".
3. Copie a resposta e clique em **Colar resposta do Claude** — a tática aparece no campinho com os comentários.
