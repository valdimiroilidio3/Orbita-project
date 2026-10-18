# @orbita/api — Backend dedicado (esqueleto)

Este espaço reserva-se ao backend **NestJS** do ORBITA CHAT. No Sprint 1 não contém implementação, por decisão de arquitetura: evitar backend duplicado e evitar complexidade prematura.

## O que vem aqui (fase seguinte)

- API HTTP dedicada (NestJS) para regras de negócio.
- Validação da organização do utilizador **em cada operação**.
- Integrações: voz/telefonia (Twilio), IA (OpenAI), billing (Stripe) — nunca a partir do frontend.
- Webhooks dos provedores e processamento assíncrono.

## Regras

- Segredos vivem apenas em variáveis de ambiente do servidor.
- O frontend nunca chama provedores externos diretamente.
- Toda a escrita passa por autorização + políticas RLS adequadas na base de dados.

O esqueleto NestJS (módulos, `main.ts`, testes) será gerado com `nest new` quando o sprint do motor de voz começar, mantendo o monorepo como está.
