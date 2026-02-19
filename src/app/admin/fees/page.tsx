'use client'

import { useState } from 'react'
import { Shield, Lock, Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FeeMonitoringDashboard } from '@/components/admin/FeeMonitoringDashboard'

export default function AdminFeesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')

  const handleAuth = async () => {
    try {
      const res = await fetch('/api/admin/verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        alert('Senha incorreta')
      }
    } catch {
      alert('Erro ao verificar autenticação')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-700 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Acesso restrito - Monitoramento de taxas</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="Digite a senha de admin"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
            <Button 
              onClick={handleAuth}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Shield className="w-4 h-4 mr-2" />
              Acessar Dashboard
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            Este painel é de acesso restrito e monitora as taxas coletadas pela plataforma
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Activity className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Fee Monitoring Dashboard</h1>
                <p className="text-gray-400">CYPHER ORDI FUTURE - Sistema de Monitoramento</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsAuthenticated(false)}
              className="border-gray-700 hover:bg-gray-800"
            >
              <Lock className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Dashboard */}
        <FeeMonitoringDashboard />
      </div>
    </div>
  )
}