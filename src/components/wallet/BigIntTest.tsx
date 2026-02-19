'use client'

import React, { useEffect } from 'react'

export function BigIntTest() {
  useEffect(() => {
    // Executar testes automaticamente quando o componente montar
    
    try {
      // Teste 1: Verificar patches aplicados
      
      // Teste 2: Math.pow com BigInt
      const bigNum = BigInt(10)
      const result = Math.pow(bigNum as any, 2)
      
      // Teste 3: JSON com BigInt
      const obj = { value: BigInt(123456789) }
      const json = JSON.stringify(obj)
      
      // Teste 4: Parse JSON
      const parsed = JSON.parse(json)
      
      // Teste 5: Math.max/min com BigInt
      const maxResult = Math.max(BigInt(5) as any, BigInt(10) as any)
      
      
      // Se walletDiagnostics estiver disponível, executar teste completo
      if ((window as any).walletDiagnostics) {
        ;(window as any).walletDiagnostics.testBigInt()
      }
    } catch (error) {
      console.error('❌ Erro no teste BigInt:', error)
    }
  }, [])
  
  return null // Componente invisível
}

export default BigIntTest