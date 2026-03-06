# BTCPay Server — Guia de Setup para CYPHER V3

## Passo 1 — Escolher um host gratuito

Vai a: https://directory.btcpayserver.org/filter/hosts

Hosts recomendados para comecar (gratuitos, comunidade):
- **btcpay.jp** — Estavel, ativo
- **btcpay.oshi.at** — Europa, ativo
- **mybtcpayserver.net** — Gratuito para merchants pequenos

Para volume alto de pagamentos, migra para self-hosted ou Voltage.cloud.

## Passo 2 — Criar conta e store

1. Vai ao host escolhido → **Register**
2. Cria conta (so email, sem KYC)
3. Cria uma **Store**: Dashboard → Create Store → nome: "CYPHER V3"
4. Em Store Settings, copia o **Store ID** (URL: `/stores/AQUI`)

## Passo 3 — Conectar wallet Xverse

1. No Store → **Setup a wallet**
2. Escolhe **Watch-only wallet**
3. Cola o teu **xPub/zpub** da Xverse
   - Como obter: Ian Coleman BIP39 (offline) → BIP84 → Account Extended Public Key
4. Confirma alguns enderecos derivados

## Passo 4 — Gerar API Key

1. Account (canto sup. direito) → **Manage Account**
2. **API Keys** → **Generate Key**
3. Permissoes necessarias:
   - `btcpay.store.canviewinvoices`
   - `btcpay.store.cancreatenonapprovedinvoices`
   - `btcpay.store.canviewstoresettings`
4. Copia a key gerada

## Passo 5 — Configurar Webhook

1. Store → **Settings** → **Webhooks** → **Create Webhook**
2. **Payload URL**: `https://SEU_DOMINIO/api/billing/webhook`
   - Dev local: usa `ngrok http 4444` e usa o URL do ngrok
3. **Secret**: copia o `BTCPAY_WEBHOOK_SECRET` do teu `.env.local`
4. **Events**: seleciona **InvoiceSettled**
5. Clica **Save**

## Passo 6 — Preencher .env.local

```env
BTCPAY_HOST=https://URL_DO_HOST_ESCOLHIDO
BTCPAY_STORE_ID=SEU_STORE_ID
BTCPAY_API_KEY=SUA_API_KEY
BTCPAY_WEBHOOK_SECRET=JA_GERADO_AUTOMATICAMENTE
```

## Passo 7 — Executar migracao Supabase

```bash
# Opcao A — Dashboard Supabase
# Abre Supabase → SQL Editor → cola o conteudo de:
# database/migrations/008_btcpay_billing.sql

# Opcao B — CLI
supabase db push
```

## Passo 8 — Testar

```bash
npm run dev

# Testar criacao de invoice:
curl -X POST http://localhost:4444/api/billing/create-invoice \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro"}'
```

## Fluxo completo

```
User clica "Upgrade Pro"
  → POST /api/billing/create-invoice
  → BTCPay cria invoice + endereco BTC unico (derivado do teu xPub)
  → User e redirecionado para checkout page do host BTCPay
  → User paga com Xverse
  → BTC vai DIRETO para a tua wallet (BTCPay nunca toca nos fundos)
  → BTCPay chama POST /api/billing/webhook
  → Servidor valida HMAC + ativa plano no Supabase
  → User ve plano ativo no CYPHER V3
```
