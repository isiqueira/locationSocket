# pricing-notes.md — Notas de Custo

Estimativas de custo para rodar o locationSocket em produção e para uso de AI no desenvolvimento.

---

## Custo de Infraestrutura

### Redis

| Opção | Custo estimado | Observações |
|---|---|---|
| Redis local (Docker) | $0 | Apenas para dev/self-hosted |
| Redis Cloud (Free tier) | $0 | 30MB, 1 DB — suficiente para este projeto em escala pequena |
| Redis Cloud (Essentials) | ~$7/mês | 100MB, baixa latência |
| AWS ElastiCache (t4g.micro) | ~$12/mês | 0.5GB RAM, single-AZ |
| Upstash Redis (serverless) | $0–$0.20/100k comandos | Melhor para workloads intermitentes |

**Estimativa para este projeto:** Cada dispositivo gera ~1 `GET` + 1 `SET` por atualização de localização. Com 100 dispositivos atualizando a cada 5s → ~120.000 comandos/hora → ~86M/mês. No Upstash isso seria ~$17/mês.

---

### MongoDB

| Opção | Custo estimado | Observações |
|---|---|---|
| MongoDB local (Docker) | $0 | Apenas dev/self-hosted |
| MongoDB Atlas (Free/M0) | $0 | 512MB, shared — OK para dev e projetos pequenos |
| MongoDB Atlas (M10) | ~$57/mês | 2GB RAM, 10GB storage, dedicated |
| MongoDB Atlas (M0 → M2) | ~$9/mês | Serverless Atlas, paga por operação |

**Estimativa para este projeto:** A coleção `Checkpoints` é lida a cada evento `change` de cada dispositivo. Com 100 dispositivos/5s → 72.000 queries geoespaciais/hora. Atlas M10 é suficiente para produção real.

---

### Hosting da Aplicação Node.js

| Opção | Custo estimado | Observações |
|---|---|---|
| Render (Free) | $0 | Hiberna após inatividade — não usar para WebSocket em produção |
| Railway (Hobby) | ~$5/mês + uso | $0.000463/vCPU-min, ~$5 base |
| Fly.io (shared-cpu-1x) | ~$3–7/mês | Boa latência, suporta WebSocket bem |
| DigitalOcean Droplet (Basic) | ~$6/mês | 1vCPU, 1GB RAM — suficiente |
| AWS EC2 (t3.micro) | ~$8/mês | Free tier 12 meses |
| VPS (Hetzner CX11) | ~$4/mês | Melhor custo-benefício para self-hosted |

> **Nota:** Aplicações Socket.IO precisam de **sticky sessions** ou único servidor para funcionar corretamente. Em múltiplas instâncias, é necessário Redis Adapter (`@socket.io/redis-adapter`).

---

### Custo total estimado (produção pequena)

| Componente | Custo/mês |
|---|---|
| Node.js app (Railway/Fly.io) | ~$5–7 |
| Redis (Upstash ou Cloud) | ~$0–17 |
| MongoDB (Atlas M0 gratuito) | $0 |
| **Total** | **~$5–25/mês** |

---

## Custo de AI (Tokens/Modelos)

### Modelo atual

O agente neste projeto roda em **claude-sonnet-4.6** (via GitHub Copilot).

### Referência de preços Claude (Anthropic direto)

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|---|---|---|
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Haiku 3.5 | $0.80 | $4.00 |
| Claude Opus 4 | $15.00 | $75.00 |

> Preços sujeitos a alteração. Verificar em https://www.anthropic.com/pricing

### Estimativa por sessão de trabalho

| Tipo de sessão | Tokens estimados | Custo estimado (Sonnet) |
|---|---|---|
| Análise completa do codebase | ~50k input + ~10k output | ~$0.30 |
| Correção de bug simples | ~5k input + ~2k output | ~$0.05 |
| Refactoring de um módulo | ~20k input + ~8k output | ~$0.18 |
| Sessão de debug complexo | ~40k input + ~15k output | ~$0.35 |

### Dicas para reduzir custo de AI

- Manter o `context-pack/` atualizado — evita re-análise do codebase a cada sessão
- Usar `gsd-fast` para tarefas triviais — menos subagentes = menos tokens
- Usar subagentes `budget` para tarefas de exploração menos críticas
- Limitar `readDepth` em ferramentas de análise
- Não pedir análise completa do código se o `project-map.md` já tem o contexto necessário

---

## Notas gerais

- Para este projeto em escala de prova de conceito (POC): custo de infra de **$0/mês** usando tiers gratuitos (Atlas M0 + Redis Cloud free + Render/Railway free tier com caveat do hibernate).
- Para produção com ≥50 dispositivos rastreados em tempo real: planejar **~$15–30/mês**.
- O maior custo variável de infra é o Redis, proporcional à frequência de atualização dos dispositivos.
