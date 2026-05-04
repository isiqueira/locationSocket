# context-pack — locationSocket

Pasta de contexto para uso com agentes de IA (OpenCode, Claude, Copilot, etc.).
Contém tudo que um agente precisa saber para trabalhar neste projeto sem precisar reler o código inteiro a cada sessão.

---

## Arquivos

| Arquivo | O que contém |
|---|---|
| `project-map.md` | O que é o projeto, mapa de pastas, onde ficam configs, o que não mexer |
| `tools.md` | MCPs (Model Context Protocol tools) disponíveis no ambiente |
| `skills.md` | Skills disponíveis via `/skill` no OpenCode |
| `docs-index.md` | Espinha dorsal da documentação — links e resumos de cada doc relevante |
| `style.md` | Como o agente deve se comunicar neste projeto (tom, formato, idioma) |
| `tasks.md` | Backlog de tarefas, bugs conhecidos e features pendentes |
| `pricing-notes.md` | Estimativas de custo de infra (Redis, Mongo, hosting) e de uso de AI (tokens) |

---

## Como usar

Ao iniciar uma nova sessão de trabalho no projeto, diga ao agente:

> "Leia o context-pack antes de começar."

O agente deve ler `project-map.md` primeiro, depois os arquivos relevantes para a tarefa.

---

## Atualização

Atualize este context-pack sempre que:
- A estrutura de pastas mudar
- Novos MCPs ou skills forem instalados
- Um bug do backlog for resolvido
- Uma decisão arquitetural importante for tomada
