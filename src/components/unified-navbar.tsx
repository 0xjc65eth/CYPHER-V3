'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { createPortal } from 'react-dom'
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { CardID } from "./card-id"
import {
  useLaserEyes,
  UNISAT,
  XVERSE,
  MAGIC_EDEN,
  OYL,
  LEATHER,
  WIZZ,
  PHANTOM,
  ORANGE,
} from '@/providers/SimpleLaserEyesProvider'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
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
  RiShieldLine,
  RiVipCrownLine
} from 'react-icons/ri'

// Lista de coleções premium para verificação
import { PREMIUM_COLLECTIONS } from '@/config/premium-collections'
import { getWalletAccessTier, hasPremiumAccess, isSuperAdmin, type AccessTier } from '@/config/vip-wallets'
import { useYHPVerification } from '@/hooks/useYHPVerification'
import { usePremium } from '@/contexts/PremiumContext'

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
  { name: "Pricing", href: "/pricing", icon: RiVipCrownLine },
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

  // BTC wallet (LaserEyes)
  const {
    connect,
    disconnect,
    connected,
    connecting,
    address,
    provider,
    verified,
    getOrdinals
  } = useLaserEyes()

  // EVM wallet (Wagmi)
  const { address: evmAddress, isConnected: evmConnected } = useAccount()
  const { connect: evmConnect, isPending: evmConnecting } = useConnect()
  const { disconnect: evmDisconnect } = useDisconnect()

  // YHP NFT verification (auto-runs when evmAddress changes)
  const { isHolder: isYHPHolder, loading: yhpLoading } = useYHPVerification(evmAddress ?? null)

  // Premium context
  const { isPremium, accessTier, setAccessTier, setIsPremium, setPremiumCollection, setIsVerifying: setCtxVerifying } = usePremium()

  // BTC VIP wallet check
  const btcTier = getWalletAccessTier(connected ? (address ?? null) : null)
  const effectiveTier: AccessTier = (() => {
    if (btcTier === 'super_admin' || accessTier === 'super_admin') return 'super_admin'
    if (btcTier === 'vip' || accessTier === 'vip') return 'vip'
    if (isYHPHolder || isPremiumVerified || accessTier === 'premium' || isPremium) return 'premium'
    return 'free'
  })()
  const effectivePremium = hasPremiumAccess(effectiveTier)

  // Sync BTC VIP wallet to premium context
  useEffect(() => {
    if (connected && address) {
      const tier = getWalletAccessTier(address)
      if (hasPremiumAccess(tier)) {
        setAccessTier(tier)
        setIsPremium(true)
        setPremiumCollection('VIP WALLET')
      }
    }
  }, [connected, address, setAccessTier, setIsPremium, setPremiumCollection])

  // Sync YHP holder status to premium context
  useEffect(() => {
    setCtxVerifying(yhpLoading)
  }, [yhpLoading, setCtxVerifying])

  useEffect(() => {
    if (isYHPHolder && evmAddress) {
      setIsPremium(true)
      // Check if this ETH wallet is a super admin (CEO/dev)
      if (isSuperAdmin(evmAddress)) {
        setPremiumCollection('SUPER ADMIN')
        setAccessTier('super_admin')
      } else {
        setPremiumCollection('YIELD HACKER PASS')
        if (accessTier === 'free') setAccessTier('premium')
      }
    }
  }, [isYHPHolder, evmAddress, setIsPremium, setPremiumCollection, accessTier, setAccessTier])

  // Verificar se o usuário possui coleções premium (Ordinals)
  const verifyPremiumAccess = async () => {
    if (!connected || !address) return

    try {
      setIsVerifying(true)

      // Buscar ordinals do usuário
      const ordinals = await getOrdinals(address)

      // Verificar se algum ordinal pertence a uma coleção premium
      const userPremiumCollections: string[] = []

      if (ordinals && Array.isArray(ordinals)) {
        for (const ordinal of ordinals) {
          const collection = ordinal.collection || ''
          if (PREMIUM_COLLECTIONS.includes(collection) && !userPremiumCollections.includes(collection)) {
            userPremiumCollections.push(collection)
          }
        }
      }

      setPremiumCollections(userPremiumCollections)
      setIsPremiumVerified(userPremiumCollections.length > 0)

    } catch (error) {
      console.error('Erro ao verificar acesso premium:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  // Listen for 'openWalletConnect' custom events (e.g. from Pricing page)
  useEffect(() => {
    const handler = () => setIsModalOpen(true)
    window.addEventListener('openWalletConnect', handler)
    return () => window.removeEventListener('openWalletConnect', handler)
  }, [])

  // Verificar acesso premium quando o endereço mudar
  useEffect(() => {
    if (connected && address) {
      verifyPremiumAccess()
    } else {
      setIsPremiumVerified(false)
      setPremiumCollections([])
    }
  }, [connected, address])

  // Função para conectar carteira BTC
  const handleConnect = async (walletId: string) => {
    try {
      let walletProvider;

      switch (walletId) {
        case 'unisat': walletProvider = UNISAT; break;
        case 'xverse': walletProvider = XVERSE; break;
        case 'magic-eden': walletProvider = MAGIC_EDEN; break;
        case 'oyl': walletProvider = OYL; break;
        case 'leather': walletProvider = LEATHER; break;
        case 'wizz': walletProvider = WIZZ; break;
        case 'phantom': walletProvider = PHANTOM; break;
        case 'orange': walletProvider = ORANGE; break;
        default: walletProvider = UNISAT;
      }

      await connect(walletProvider);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao conectar carteira:', error);
      alert(`Falha ao conectar carteira. Certifique-se de que sua carteira está instalada e tente novamente.`);
    }
  }

  // Conectar EVM wallet
  const handleEvmConnect = () => {
    try {
      evmConnect({ connector: injected() })
    } catch (error) {
      console.error('Erro ao conectar carteira EVM:', error)
    }
  }

  // Função para desconectar carteira
  const handleDisconnect = () => {
    disconnect()
    setIsPremiumVerified(false)
    setPremiumCollections([])
    setAccessTier('free')
  }

  const handleEvmDisconnect = () => {
    evmDisconnect()
  }

  // Formatar endereço para exibição
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
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
        {/* Access tier badge */}
        {effectivePremium && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${
            effectiveTier === 'super_admin' ? 'bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-500/30' :
            effectiveTier === 'vip' ? 'bg-gradient-to-r from-orange-900/40 to-orange-800/20 border border-orange-500/30' :
            'bg-gradient-to-r from-[#3D3D3D] to-[#2D2D2D]'
          }`}>
            {effectiveTier === 'super_admin' || effectiveTier === 'vip' ? (
              <RiVipCrownLine className={`w-4 h-4 ${effectiveTier === 'super_admin' ? 'text-red-400' : 'text-orange-400'}`} />
            ) : (
              <RiShieldCheckLine className="w-4 h-4 text-emerald-400" />
            )}
            <span className={`text-xs font-medium ${
              effectiveTier === 'super_admin' ? 'text-red-400' :
              effectiveTier === 'vip' ? 'text-orange-400' : 'text-emerald-400'
            }`}>
              {effectiveTier === 'super_admin' ? 'Admin' : effectiveTier === 'vip' ? 'VIP' : 'Premium'}
            </span>
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
                {verified && (
                  <RiShieldCheckLine className="w-4 h-4 text-emerald-400 mr-1.5 flex-shrink-0" />
                )}
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

            {(connected && address) || evmConnected ? (
              <div className="space-y-4">
                {/* Access Tier Banner */}
                {effectivePremium && (
                  <div className={`p-3 rounded-lg border ${
                    effectiveTier === 'super_admin' ? 'bg-red-900/20 border-red-500/30' :
                    effectiveTier === 'vip' ? 'bg-orange-900/20 border-orange-500/30' :
                    'bg-emerald-900/20 border-emerald-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <RiVipCrownLine className={`w-4 h-4 ${
                        effectiveTier === 'super_admin' ? 'text-red-400' :
                        effectiveTier === 'vip' ? 'text-orange-400' : 'text-emerald-400'
                      }`} />
                      <span className="text-sm font-medium text-white">
                        {effectiveTier === 'super_admin' ? 'Super Admin' :
                         effectiveTier === 'vip' ? 'VIP Full Access' : 'Premium Access'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">0% fees em todas as operações</p>
                  </div>
                )}

                {/* BTC Wallet */}
                {connected && address && (
                  <div className="bg-[#1A1A1A] border border-[#3D3D3D] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm flex items-center gap-1">
                        <span>₿</span> Bitcoin Wallet
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full">{getWalletName()}</span>
                        {hasPremiumAccess(btcTier) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            btcTier === 'super_admin' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                          }`}>{btcTier === 'super_admin' ? 'Admin' : 'VIP'}</span>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-white text-sm break-all">{address}</div>
                    {verified && (
                      <div className="mt-2 flex items-center gap-1 text-emerald-400">
                        <RiShieldCheckLine className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Ownership Verified</span>
                      </div>
                    )}
                  </div>
                )}

                {/* EVM Wallet */}
                {evmConnected && evmAddress && (
                  <div className="bg-[#1A1A1A] border border-[#3D3D3D] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm flex items-center gap-1">
                        <span>Ξ</span> Ethereum Wallet
                      </span>
                      <div className="flex items-center gap-1">
                        {yhpLoading && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center">
                            <RiLoader4Line className="animate-spin mr-1 w-3 h-3" />
                            Verificando YHP
                          </span>
                        )}
                        {!yhpLoading && isYHPHolder && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center">
                            <RiCheckLine className="mr-1 w-3 h-3" />
                            YHP Holder
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-white text-sm break-all">{evmAddress}</div>
                    <button
                      onClick={handleEvmDisconnect}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Desconectar ETH
                    </button>
                  </div>
                )}

                {/* Premium collections from ordinals */}
                {(isPremiumVerified || isVerifying) && (
                  <div className="bg-[#1A1A1A] border border-[#3D3D3D] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Coleções Premium (Ordinals)</span>
                      {isVerifying ? (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center">
                          <RiLoader4Line className="animate-spin mr-1 w-3 h-3" />
                          Verificando
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center">
                          <RiCheckLine className="mr-1 w-3 h-3" />
                          Verificado
                        </span>
                      )}
                    </div>
                    {isPremiumVerified && (
                      <ul className="text-xs text-white space-y-1">
                        {premiumCollections.map((collection, index) => (
                          <li key={index} className="flex items-center">
                            <RiCheckLine className="mr-1 w-3 h-3 text-emerald-400" />
                            {collection}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Connect additional wallets */}
                {!evmConnected && (
                  <button
                    onClick={handleEvmConnect}
                    disabled={evmConnecting}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2D2D2D] border border-blue-500/30 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 p-1.5 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">Ξ</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-white text-sm">
                        {evmConnecting ? 'Conectando...' : 'Conectar Ethereum Wallet'}
                      </span>
                      <span className="text-xs text-gray-400">Verificação YHP para 0% fees</span>
                    </div>
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {connected && (
                    <button
                      onClick={verifyPremiumAccess}
                      className="flex-1 px-3 py-2 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white rounded-md text-sm transition-colors"
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Verificando...' : 'Verificar Premium'}
                    </button>
                  )}
                  {connected && (
                    <button
                      onClick={handleDisconnect}
                      className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm"
                    >
                      Desconectar BTC
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm mb-4">
                  Conecte sua carteira Bitcoin ou Ethereum para acessar recursos premium.
                </p>

                {/* ── Bitcoin Wallets ── */}
                <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">₿ Bitcoin Wallets</div>

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

                {/* ── Ethereum Wallet ── */}
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mt-4 mb-2">Ξ Ethereum Wallet</div>

                <button
                  onClick={handleEvmConnect}
                  disabled={evmConnecting}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] hover:bg-[#2D2D2D] border border-blue-500/30 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 p-1.5 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">Ξ</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-white">
                      {evmConnecting ? 'Conectando...' : 'MetaMask / Injected'}
                    </span>
                    <span className="text-xs text-gray-400">Verificação YHP para 0% fees</span>
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
