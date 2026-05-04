# tools.md — MCPs Disponíveis

MCPs (Model Context Protocol) são ferramentas que o agente pode usar diretamente durante uma sessão. Listados abaixo os que estão disponíveis neste ambiente.

---

## Ferramentas de Sistema de Arquivos

| Ferramenta | O que faz |
|---|---|
| `Read` | Lê arquivos do sistema de arquivos local (prefira a `cat`) |
| `Write` | Cria ou sobrescreve arquivos |
| `Edit` | Faz substituições exatas em arquivos existentes |
| `Glob` | Busca arquivos por padrão glob (prefira a `find`) |
| `Grep` | Busca conteúdo por regex nos arquivos (prefira a `grep`) |

## Ferramentas de Terminal

| Ferramenta | O que faz |
|---|---|
| `Bash` | Executa comandos shell (git, npm, docker, etc.) |

## Ferramentas de Agentes / Tarefas

| Ferramenta | O que faz |
|---|---|
| `Task` | Lança subagentes especializados para tarefas complexas |
| `TodoWrite` | Gerencia lista de tarefas da sessão atual |

## Ferramentas de Documentação

| Ferramenta | O que faz |
|---|---|
| `context7_resolve-library-id` | Resolve nome de lib para ID Context7 |
| `context7_query-docs` | Busca documentação atualizada de qualquer lib/framework |

> **Regra:** Sempre usar `context7` antes de responder perguntas sobre APIs de bibliotecas (Socket.IO, Mongoose, Redis, Express). Nunca confiar apenas em dados de treinamento para detalhes de API.

## Ferramentas de Design (Pencil)

Disponíveis mas **não aplicáveis** a este projeto (backend puro, sem UI).

---

## Quando usar cada ferramenta

```
Explorar codebase amplo    → Task (subagente explore)
Buscar arquivo específico  → Glob
Buscar texto no código     → Grep
Ler arquivo                → Read
Editar arquivo             → Edit (não Bash+sed)
Criar arquivo novo         → Write
Rodar npm / git / docker   → Bash
Documentação de lib        → context7_resolve-library-id → context7_query-docs
```
