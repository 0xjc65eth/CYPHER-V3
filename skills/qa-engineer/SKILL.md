---
name: qa-engineer
description: Testa o CYPHER V3 como trader profissional real — valida APIs, dados, latência, experiência completa
version: "2.0"
tags: [qa, testing, apis, real-data, trader-experience]
---

# SKILL: QA Engineer — CYPHER V3

## Princípio: Testar como UTILIZADOR, não como developer
Não verificar "o código funciona" — verificar "o trader consegue usar isto para tomar decisões com dinheiro real".

## Protocolo de QA Completo

### Fase 1: Verificar Ambiente
```bash
# Server está a correr?
curl -sf http://localhost:4444/api/health 2>/dev/null | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
console.log(d.status === 'ok' ? '✅ Server healthy' : '❌ Server unhealthy: ' + JSON.stringify(d))
" || echo "❌ Server offline — correr npm run dev primeiro"
```

### Fase 2: Validar Dados Reais (Zero Mock)
```bash
# BTC Price — deve estar entre $10k e $500k
curl -sf http://localhost:4444/api/market/bitcoin | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const p=d.price||d.data?.price
if(!p||isNaN(p)||p<10000||p>500000) console.log('❌ BTC price suspeito:',p)
else console.log('✅ BTC \$'+Number(p).toLocaleString())
"

# Ordinals — sem coleções mock
curl -sf "http://localhost:4444/api/ordinals/collections?limit=5" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const items=d.data||d.results||d.collections||[]
const mockNames=['NodeMonkes Test','Mock Collection','Fake','Dummy','Sample']
const mocked=items.filter(i=>mockNames.some(m=>(i.name||'').includes(m)))
if(mocked.length) console.log('❌ MOCK detetado:',mocked.map(i=>i.name))
else console.log('✅ Ordinals:',items.length,'coleções reais')
items.slice(0,3).forEach(i=>console.log('  →',i.name||'sem nome','floor:',i.floor_price||'?'))
"

# Runes — nomes com formato WORD•WORD
curl -sf "http://localhost:4444/api/runes/market?limit=5" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const items=d.data||d.results||d.runes||[]
items.slice(0,3).forEach(i=>{
  const name=i.name||i.spaced_name||''
  console.log(/[A-Z•]+/.test(name)?'✅':'⚠️ formato?',name,'price:',i.price_per_unit||'?')
})
"

# Fees — valores plausíveis
curl -sf "http://localhost:4444/api/fees" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
const f=d.fastestFee||d.data?.fastestFee
console.log(f>0&&f<1000?'✅ Fees: fastest='+f+' sat/vB':'❌ Fees suspeitas:'+f)
"
```

### Fase 3: Medir Latência de APIs
```bash
for ep in "/api/health" "/api/market/bitcoin" "/api/ordinals/collections" "/api/runes/market" "/api/fees" "/api/brc20/list" "/api/rare-sats/categories"; do
  start=$(date +%s%3N 2>/dev/null || python3 -c "import time;print(int(time.time()*1000))")
  code=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:4444$ep" 2>/dev/null)
  end=$(date +%s%3N 2>/dev/null || python3 -c "import time;print(int(time.time()*1000))")
  ms=$((end - start))

  if [ "$code" = "200" ]; then
    [ $ms -gt 2000 ] && echo "🔴 ${ms}ms $ep" || ([ $ms -gt 500 ] && echo "🟡 ${ms}ms $ep" || echo "✅ ${ms}ms $ep")
  else
    echo "❌ HTTP $code $ep"
  fi
done
```

### Fase 4: Verificar Checklist Visual
```
□ Dashboard carrega em < 3 segundos
□ BTC price visível no header/dashboard
□ Sem "undefined" ou "null" visível em texto
□ Sem "NaN" em qualquer preço
□ Sem "[object Object]" visível
□ Sem imagens quebradas (ícone de imagem em falta)
□ Sem loading infinito (spinner > 10 segundos)
□ Percentagens com sinal (+ ou -)
□ Preços com casas decimais corretas
□ Timestamps visíveis e recentes (não "Jan 1970")
□ Sem erros no console do browser (F12 → Console)
□ Sem requests falhadas no Network tab (F12 → Network → filtrar vermelhas)
```

### Fase 5: Testar Fluxos Críticos
```
1. Dashboard → BTC price atualiza? Volume visível? Market cap?
2. Ordinals → Top coleções com floor prices reais? Imagens carregam?
3. Runes → Lista com WORD•WORD? Market cap = price × supply?
4. Rare Sats → Categorias visíveis? Scanner funciona?
5. Connect Wallet → LaserEyes abre popup? Endereço aparece?
6. Trading → Indicadores SMC visíveis? Dados real-time?
7. AI Chat → Gemini responde? Respostas úteis?
```

## Formato de Relatório QA
```
## QA Report — CYPHER V3
**Data:** [timestamp]
**Ambiente:** localhost:4444

### 📊 Resumo
- APIs funcionais: X/Y
- Latência média: Xms
- Mock data detectado: sim/não
- Erros visuais: N

### ✅ Funcional
- [lista do que funciona]

### ❌ Problemas (por prioridade)
- P0: [problema] → [fix]
- P1: [problema] → [fix]

### 🎯 Score: X/100
```
