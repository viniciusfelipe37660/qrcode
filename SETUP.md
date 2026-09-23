# Setup inicial

## 1. Subir o Postgres
```bash
docker compose up -d
```

## 2. Criar o projeto Next.js (se ainda não existir)
```bash
npx create-next-app@latest . --typescript --app --tailwind --eslint
```
Aceite sobrescrever quando perguntar sobre arquivos existentes (docker-compose.yml, prisma/, lib/, .env.example não conflitam).

## 3. Instalar dependências do projeto
```bash
npm install prisma @prisma/client
npm install qrcode html5-qrcode
npm install -D @types/qrcode
```

## 4. Configurar variáveis de ambiente
```bash
cp .env.example .env
# gere valores reais para QR_TOKEN_SECRET e AUTH_SECRET, ex:
openssl rand -hex 32
```

## 5. Rodar a primeira migration
```bash
npx prisma migrate dev --name init
```

## 6. Gerar o Prisma Client
```bash
npx prisma generate
```

## O que já está pronto neste ponto de partida
- `docker-compose.yml` — Postgres local
- `prisma/schema.prisma` — modelos User, Event, Registration, CheckIn
- `lib/qrToken.ts` — geração e validação do token assinado que vai dentro do QR code (HMAC, evita QR forjado)
- `.env.example` — variáveis necessárias

## Próximo passo
Criar as rotas de API: `POST /api/events` (criar evento), `POST /api/registrations`
(inscrição pública + geração do QR via `generateQrToken`), e
`POST /api/checkin` (recebe o token escaneado, chama `verifyQrToken`, marca
o check-in).
