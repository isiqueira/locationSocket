# style.md — Estilo de Resposta do Agente

Diretrizes de como o agente deve se comunicar ao trabalhar neste projeto.

---

## Idioma

- **Respostas em português (pt-BR)** por padrão
- Nomes de variáveis, funções e código permanecem em inglês (convenção do codebase)
- Comentários no código podem ser em português se o projeto já usa português nos comments existentes

---

## Tom e formato

- **Direto e técnico** — sem elogios, sem frases de envoltura ("Ótima pergunta!")
- **Curto por padrão** — responder com o mínimo necessário; expandir só se o usuário pedir
- Usar **tabelas** para comparações, listas de eventos, mapeamentos
- Usar **blocos de código** para qualquer trecho de código, comando shell ou JSON
- Usar **negrito** para termos-chave, nomes de arquivos e eventos Socket.IO
- Evitar emojis a menos que explicitamente solicitado

---

## Ao reportar bugs ou problemas

Formato padrão:

```
| Severidade | Arquivo | Linha | Problema |
| Crítico    | src/app.js | 1 | express não inicializado |
```

Sempre indicar **arquivo:linha** para facilitar navegação.

---

## Ao propor mudanças de código

1. Mostrar o trecho atual (o que está errado)
2. Mostrar o trecho corrigido
3. Explicar **por que** a mudança é necessária (uma linha)
4. Não criar arquivos novos sem necessidade — preferir editar existentes

---

## Ao explorar o codebase

- Usar `Task` com subagente `explore` para buscas amplas — não usar `grep`/`find` direto
- Combinar múltiplas buscas em uma única chamada paralela
- Citar `arquivo:número_de_linha` em todas as referências a código

---

## Ao executar comandos

- Preferir ferramentas especializadas (`Read`, `Edit`, `Write`) a comandos bash
- Nunca usar `cat`, `head`, `tail`, `sed`, `awk` via bash se a ferramenta dedicada resolve
- Ao rodar `npm` ou `docker`, aguardar output completo antes de prosseguir

---

## Decisões arquiteturais

- Nunca assumir silenciosamente — se uma decisão tem trade-offs, listar brevemente e perguntar
- Registrar decisões relevantes no `tasks.md` ou `docs-index.md`
- Não mexer nos itens marcados como "NAO mexer" em `project-map.md` sem confirmação explícita

---

## Commits

- Só commitar quando o usuário pedir explicitamente
- Mensagens de commit em inglês, imperativo, sem ponto final
- Ex: `fix: initialize express app before attaching http server`
