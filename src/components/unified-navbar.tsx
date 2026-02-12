'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { createPortal } from 'react-dom'
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { CardID } from "./card-id"
import { useLaserEyes } from '@omnisat/lasereyes-react'
import {
  UNISAT,
  XVERSE,
  MAGIC_EDEN,
  OYL,
  LEATHER,
  WIZZ,
  PHANTOM,
  ORANGE
} from '@omnisat/lasereyes-core'
import {
  RiDashboardLine,
  RiBarChartLine,
  RiExchangeLine,
  RiPulseLine,
  RiSignalTowerLine,
  RiGroupLine,
  RiNotification3Line,
  RiWalletLine,
  RiSettings4Line,
  RiBrainLine,
  RiCloseLine,
  RiLoader4Line,
  RiCheckLine,
  RiErrorWarningLine,
  RiMapLine,
  RiFileTextLine,
  RiShieldCheckLine,
  RiShieldLine
} from 'react-icons/ri'

// Lista de coleções premium para verificação
import { PREMIUM_COLLECTIONS } from '@/config/premium-collections'

// Itens de navegação
const navItems = [
  { name: "Painel", href: "/", icon: RiDashboardLine },
  { name: "Negociação", href: "/trading", icon: RiExchangeLine },
  { name: "Mercado", href: "/market", icon: RiBarChartLine },
  { name: "Ordinals", href: "/ordinals", icon: RiPulseLine },
  { name: "Runes", href: "/runes", icon: RiSignalTowerLine },
  { name: "Mineiros", href: "/miners", icon: RiBarChartLine },
  { name: "Social", href: "/social", icon: RiGroupLine },
  { name: "Análise", href: "/analytics", icon: RiPulseLine },
  { name: "Aprendizagem Neural", href: "/neural-learning", icon: RiBrainLine },
  { name: "Portfólio", href: "/portfolio", icon: RiWalletLine },
  { name: "Configurações", href: "/settings", icon: RiSettings4Line },
  { name: "Recursos", href: "/resources", icon: RiFileTextLine },
  { name: "Status", href: "/status", icon: RiShieldLine },
  { name: "Legal", href: "/legal", icon: RiFileTextLine },
  { name: "Mapa do site", href: "/sitemap", icon: RiMapLine },
]

// Mapeamento de carteiras para nomes de exibição
const WALLET_DISPLAY_NAMES = {
  'unisat': 'UniSat',
  'xverse': 'Xverse',
  'magic-eden': 'Magic Eden',
  'oyl': 'OYL',
  'leather': 'Leather',
  'wizz': 'Wizz',
  'phantom': 'Phantom',
  'orange': 'Orange'
}

export function UnifiedNavbar() {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPremiumVerified, setIsPremiumVerified] = useState(false)
  const [premiumCollections, setPremiumCollections] = useState<string[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Verificar se estamos no navegador para usar createPortal
  const isBrowser = typeof window !== 'undefined'

  // Usar o hook LaserEyes para conectar carteiras
  const {
    connect,
    disconnect,
    connected,
    connecting,
    address,
    provider,
    getOrdinals
  } = useLaserEyes()

  // Verificar se o usuário possui coleções premium
  const verifyPremiumAccess = async () => {
    if (!connected || !address) return

    try {
      setIsVerifying(true)
      console.log('Verificando acesso premium para:', address)

      // Buscar ordinals do usuário
      const ordinals = await getOrdinals(address)
      console.log('Ordinals encontrados:', ordinals)

      // Verificar se algum ordinal pertence a uma coleção premium
      const userPremiumCollections: string[] = []

      if (ordinals && Array.isArray(ordinals)) {
        for (const ordinal of ordinals) {
          const collection = ordinal.collection || ''

          // Verificar se a coleção está na lista de coleções premium
          if (PREMIUM_COLLECTIONS.includes(collection) && !userPremiumCollections.includes(collection)) {
            userPremiumCollections.push(collection)
          }
        }
      }

      // Atualizar estado
      setPremiumCollections(userPremiumCollections)
      setIsPremiumVerified(userPremiumCollections.length > 0)
      console.log('Coleções premium encontradas:', userPremiumCollections)

    } catch (error) {
      console.error('Erro ao verificar acesso premium:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  // Verificar acesso premium quando o endereço mudar
  useEffect(() => {
    if (connected && address) {
      verifyPremiumAccess()
    } else {
      setIsPremiumVerified(false)
      setPremiumCollections([])
    }
  }, [connected, address])

  // Função para conectar carteira
  const handleConnect = async (walletId: string) => {
    try {
      let provider;

      switch (walletId) {
        case 'unisat':
          provider = UNISAT;
          break;
        case 'xverse':
          provider = XVERSE;
          break;
        case 'magic-eden':
          provider = MAGIC_EDEN;
          break;
        case 'oyl':
          provider = OYL;
          break;
        case 'leather':
          provider = LEATHER;
          break;
        case 'wizz':
          provider = WIZZ;
          break;
        case 'phantom':
          provider = PHANTOM;
          break;
        case 'orange':
          provider = ORANGE;
          break;
        default:
          provider = UNISAT;
      }

      console.log(`Conectando à carteira ${walletId}...`);
      await connect(provider);
      console.log('Conexão bem-sucedida');

      // Fechar o modal após a conexão
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao conectar carteira:', error);
      alert(`Falha ao conectar carteira. Certifique-se de que sua carteira está instalada e tente novamente.`);
    }
  }

  // Função para desconectar carteira
  const handleDisconnect = () => {
    disconnect()
    setIsPremiumVerified(false)
    setPremiumCollections([])
  }

  // Formatar endereço para exibição
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  // Obter nome da carteira conectada
  const getWalletName = () => {
    if (!provider) return 'Carteira';
    return WALLET_DISPLAY_NAMES[provider] || provider;
  }

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#1A1A1A] via-[#2D2D2D] to-[#1A1A1A] text-[#FFFFFF] px-6 py-4 flex justify-between items-center font-inter border-b border-[#3D3D3D] backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <div className="text-xl font-bold font-montserrat bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-transparent bg-clip-text">CYPHER ORDI FUTURE</div>
      </div>

      <div className="hidden lg:flex space-x-6">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[#3D3D3D] hover:text-[#8B5CF6]",
                pathname === item.href ? "bg-[#3D3D3D] text-[#8B5CF6]" : "text-gray-300"
              )}
            >
              {Icon ? <Icon className="w-4 h-4" /> : null}
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>


      <div className="flex items-center gap-4">
        {/* Exibir CardID se o usuário tiver acesso premium */}
        {isPremiumVerified && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#3D3D3D] to-[#2D2D2D] rounded-md">
            <RiShieldCheckLine className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Premium</span>
          </div>
        )}

        {/* Botão de Conectar/Desconectar Carteira */}
        <div className="relative z-50">
          {connected && address ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-[#3D3D3D] to-[#2D2D2D] text-white rounded-md shadow-lg hover:shadow-xl transition-all"
              >
                <span className="truncate max-w-[120px] font-medium mr-2">{formatAddress(address)}</span>
                <span className="text-xs px-2 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full">{getWalletName()}</span>
              </button>
            </div>
          ) : (
            <button
              ref={buttonRef}
              onClick={() => setIsModalOpen(true)}
              className="relative overflow-hidden group flex items-center px-5 py-2.5 bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-white rounded-md shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
              disabled={connecting}
            >
              {/* Efeito de brilho */}
              <span className="absolute top-0 left-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>

              {connecting ? (
                <>
                  <RiLoader4Line className="animate-spin mr-2 w-5 h-5" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <RiWalletLine className="mr-2 w-5 h-5" />
                  <span>Conectar Carteira</span>
                </>
              )}
            </button>
          )}
        </div>

        <ThemeToggle />
      </div>

      {/* Modal de seleção de carteira */}
      {isModalOpen && isBrowser && createPortal(
        <div role="dialog" aria-label="Wallet connection" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fadeIn">
          <div className="bg-[#121212] border border-[#3D3D3D] rounded-lg p-6 max-w-md w-full mx-4 animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-transparent bg-clip-text">
                {connected ? 'CARTEIRA CONECTADA' : 'CONECTAR CARTEIRA'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close wallet dialog"
                className="text-white hover:text-gray-300 transition-colors bg-[#2D2D2D] rounded-full w-8 h-8 flex items-center justify-center"
              >
                <RiCloseLine className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {connected && address ? (
              <div className="space-y-4">
                <div className="bg-[#1A1A1A] border border-[#3D3D3D] rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Endereço</span>
                    <span className="text-xs px-2 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full">{getWalletName()}</span>
                  </div>
                  <div className="font-mono text-white break-all">{address}</div>
                </div>

                {/* Status de verificação premium */}
                <div className="bg-[#1A1A1A] border border-[#3D3D3D] rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Status Premium</span>
                    {isVerifying ? (
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center">
                        <RiLoader4Line className="animate-spin mr-1 w-3 h-3" />
                        Verificando
                      </span>
                    ) : isPremiumVerified ? (
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center">
                        <RiCheckLine className="mr-1 w-3 h-3" />
                        Verificado
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full flex items-center">
                        <RiErrorWarningLine className="mr-1 w-3 h-3" />
                        Não Verificado
                      </span>
                    )}
                  </div>

                  {isPremiumVerified ? (
                    <div className="space-y-2">
                      <p className="text-sm text-emerald-400">
                        Você possui acesso premium com as seguintes coleções:
                      </p>
                      <ul className="text-xs text-white space-y-1">
                        {premiumCollections.map((collection, index) => (
                          <li key={index} className="flex items-center">
                            <RiCheckLine className="mr-1 w-3 h-3 text-emerald-400" />
                            {collection}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Você não possui nenhuma coleção premium. Adquira uma das coleções listadas para obter acesso premium.
                    </p>
                  )}

                  <button
                    onClick={verifyPremiumAccess}
                    className="mt-3 w-full px-3 py-2 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white rounded-md text-sm transition-colors"
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <span className="flex items-center justify-center">
                        <RiLoader4Line className="animate-spin mr-2 w-4 h-4" />
                        Verificando...
                      </span>
                    ) : (
                      <span>Verificar Novamente</span>
                    )}
                  </button>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                >
                  Desconectar Carteira
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">
                  Conecte sua carteira Bitcoin para acessar recursos premium e verificar a propriedade de coleções NFT.
                </p>

                {/* UniSat */}
                <button
                  onClick={() => handleConnect('unisat')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2D2D2D] border border-[#3D3D3D] rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 p-1.5 flex items-center justify-center">
                    <RiWalletLine className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-white">UniSat Wallet</span>
                    <span className="text-xs text-gray-400">Carteira Bitcoin para Ordinals</span>
                  </div>
                </button>

                {/* Xverse */}
                <button
                  onClick={() => handleConnect('xverse')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2D2D2D] border border-[#3D3D3D] rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 p-1.5 flex items-center justify-center">
                    <RiWalletLine className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-white">Xverse Wallet</span>
                    <span className="text-xs text-gray-400">Suporte a Stacks e Bitcoin</span>
                  </div>
                </button>

                {/* Magic Eden */}
                <button
                  onClick={() => handleConnect('magic-eden')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2D2D2D] border border-[#3D3D3D] rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-pink-200 p-1.5 flex items-center justify-center">
                    <RiWalletLine className="h-5 w-5 text-pink-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-white">Magic Eden</span>
                    <span className="text-xs text-gray-400">Marketplace de NFTs</span>
                  </div>
                </button>

                {/* OYL */}
                <button
                  onClick={() => handleConnect('oyl')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2D2D2D] border border-[#3D3D3D] rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 p-1.5 flex items-center justify-center">
                    <RiWalletLine className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-white">OYL Wallet</span>
                    <span className="text-xs text-gray-400">Carteira Bitcoin</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </nav>
  )
}
