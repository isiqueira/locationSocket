# skills.md — Skills Disponíveis

Skills são conjuntos de instruções especializadas carregadas via `skill` tool. Abaixo as mais relevantes para este projeto.

---

## Skills de uso imediato neste projeto

| Skill | Quando usar |
|---|---|
| `find-docs` | Sempre que precisar de referência de API (Socket.IO, Mongoose, Redis, Express, Docker) |
| `gsd-debug` | Investigar bugs com estado persistente entre resets de contexto |
| `gsd-code-review` | Revisar arquivos modificados em busca de bugs, segurança e qualidade |
| `gsd-code-review-fix` | Aplicar correções automáticas após uma revisão (`REVIEW.md`) |
| `gsd-fast` | Executar tarefas triviais sem overhead de planejamento |
| `gsd-quick` | Tarefas rápidas com commits atômicos e rastreamento de estado |

---

## Skills de planejamento e execução

| Skill | Quando usar |
|---|---|
| `gsd-plan-phase` | Criar plano detalhado antes de uma mudança grande |
| `gsd-execute-phase` | Executar planos com paralelização em waves |
| `gsd-discuss-phase` | Levantar contexto e questões antes de planejar |
| `gsd-new-project` | Inicializar estrutura GSD se decidir adotar o workflow |
| `gsd-audit-fix` | Pipeline autônomo: encontrar problemas → classificar → corrigir → commitar |

---

## Skills de documentação

| Skill | Quando usar |
|---|---|
| `gsd-docs-update` | Gerar ou atualizar documentação verificada contra o codebase |
| `gsd-scan` | Assessment rápido do codebase (alternativa leve ao map-codebase) |
| `gsd-map-codebase` | Análise profunda com agentes paralelos → arquivos em `.planning/codebase/` |

---

## Skills menos relevantes (mas disponíveis)

Skills do workflow GSD completo (`gsd-roadmapper`, `gsd-milestone-*`, `gsd-workstreams`, etc.) são úteis se o projeto adotar o ciclo de milestones GSD formalmente. Atualmente o projeto não tem `.planning/` — considere inicializar com `gsd-new-project` se quiser adotar o workflow.

---

## Como carregar uma skill

O agente carrega automaticamente ao reconhecer a tarefa. Para forçar:

> "Use a skill gsd-debug para investigar o bug X."

Ou via comando slash no OpenCode:

```
/gsd-debug
/gsd-code-review
/find-docs Socket.IO emit to specific socket
```
