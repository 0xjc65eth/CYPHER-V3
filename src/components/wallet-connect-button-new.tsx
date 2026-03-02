'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
// Use safe provider to avoid BigInt crash from @omnisat/lasereyes-react
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider'

// Wallet provider constants (replicate from lasereyes-core to avoid BigInt crash on import)
const MAINNET = 'mainnet'
const UNISAT = 'unisat'
const XVERSE = 'xverse'
const MAGIC_EDEN = 'magic-eden'
const OYL = 'oyl'
const LEATHER = 'leather'
const WIZZ = 'wizz'
const PHANTOM = 'phantom'
const ORANGE = 'orange'
import { RiWallet3Line, RiCloseLine, RiCheckLine, RiLoader4Line, RiShieldCheckLine, RiLockLine } from 'react-icons/ri'
import { PREMIUM_COLLECTIONS, isPremiumCollection, YHP_COLLECTION_NAME } from '@/config/premium-collections'
import { usePremium } from '@/contexts/PremiumContext'
import { PremiumThankYouModal } from './premium-thank-you-modal'
import { useEthWallet } from '@/hooks/useEthWallet'
import { useYHPVerification } from '@/hooks/useYHPVerification'

// List of collections to check for premium access
const COLLECTIONS_TO_CHECK = [
  'OCM Genesis',
  'OCM GENESIS',
  'OCM Katoshi Prime',
  'OCM KATOSHI PRIME',
  'OCM Katoshi Classic',
  'OCM KATOSHI CLASSIC',
  'Multiverso Pass',
  'MULTIVERSO PASS',
  'Seize CTRL',
  'SEIZE CTRL',
  'No Ordinary Kind',
  'N0 0RDINARY KIND',
  'Bitcoin Puppets',
  'BITCOIN PUPPETS',
  'The Wizards of Lord',
  'THE WIZARDS OF LORD',
  'Yield Hacker',
  'YIELD HACKER',
  'Stack Sats',
  'STACK SATS'
]

// Mapping wallet IDs to display names
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

export function WalletConnectButton() {
  const {
    connect,
    disconnect,
    connected,
    connecting,
    address,
    getInscriptions,
    balance
  } = useLaserEyes()

  // Use premium context
  const {
    isPremium,
    setIsPremium,
    premiumCollection,
    setPremiumCollection,
    isVerifying,
    setIsVerifying
  } = usePremium()

  // State declarations
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<string[]>([])
  const [isBrowser, setIsBrowser] = useState(false)
  const [showPremiumInfo, setShowPremiumInfo] = useState(false)
  const [verificationAttempted, setVerificationAttempted] = useState(false)
  const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [foundPremiumCollection, setFoundPremiumCollection] = useState<string | null>(null)

  // ETH wallet
  const { address: ethAddress, isConnected: ethConnected, connecting: ethConnecting, connectEth, disconnectEth } = useEthWallet()
  const { isHolder: isYHPHolder, loading: yhpLoading } = useYHPVerification(ethAddress)

  // Refs para animações
  const buttonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Verificar se estamos no navegador para usar o portal
  useEffect(() => {
    setIsBrowser(true)
  }, [])

  // Verificar carteiras disponíveis
  useEffect(() => {
    const checkAvailableWallets = () => {
      // Sempre mostrar todas as opções de carteira
      const walletIds = ['unisat', 'xverse', 'magic-eden', 'oyl', 'leather', 'wizz', 'phantom', 'orange'];
      setAvailableWallets(walletIds);
    };

    if (typeof window !== 'undefined') {
      checkAvailableWallets();
    }
  }, [])

  // Formatar saldo de BTC
  const formatBTCBalance = () => {
    if (!balance) return '0';
    return (Number(balance) / 100000000).toFixed(8);
  }

  // Verificar se o usuário possui Inscriptions das coleções premium
  const verifyInscriptions = async () => {
    if (!address) return;

    try {
      setIsVerifying(true);
      setVerificationAttempted(true);

      // Para fins de demonstração, vamos simular que o usuário possui uma coleção premium
      // Remova este bloco em produção e use o código abaixo para verificação real
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          const simulatedCollection = COLLECTIONS_TO_CHECK[0];
          setIsPremium(true);
          setPremiumCollection(simulatedCollection);

          // Criar efeito de confete
          if (buttonRef.current) {
            createConfettiEffect(buttonRef.current);
          }

          // Emitir evento global com status premium
          if (typeof window !== 'undefined') {
            const walletConnectedEvent = new CustomEvent('walletConnected', {
              detail: {
                address,
                connected: true,
                isPremium: true,
                premiumCollection: simulatedCollection
              }
            });
            window.dispatchEvent(walletConnectedEvent);
          }

          setIsVerifying(false);
        }, 1500);
        return;
      }

      // Buscar inscriptions do usuário usando a API do LaserEyes
      const inscriptions = await getInscriptions();

      // Verificar se alguma inscription pertence às coleções premium
      let found = false;
      let foundCollection = null;

      // Função para normalizar nomes de coleções para comparação
      const normalizeCollectionName = (name: string) => {
        return name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      };

      // Normalizar nomes das coleções que estamos procurando
      const normalizedCollectionsToCheck = COLLECTIONS_TO_CHECK.map(normalizeCollectionName);

      for (const inscription of inscriptions) {
        // Verificar em vários campos possíveis onde o nome da coleção pode estar
        try {
          // Tentar extrair metadados se estiverem em formato JSON
          let metadata = null;
          if (inscription.contentType?.includes('json') && inscription.content) {
            try {
              metadata = JSON.parse(inscription.content);
            } catch (e) {
            }
          }

          // 1. Verificar no campo collection.name dos metadados
          if (metadata?.collection?.name) {
            const collectionName = metadata.collection.name;
            const normalizedName = normalizeCollectionName(collectionName);

            if (normalizedCollectionsToCheck.some(name => normalizedName.includes(name)) ||
                COLLECTIONS_TO_CHECK.includes(collectionName)) {
              found = true;
              foundCollection = collectionName;
              break;
            }
          }

          // 2. Verificar no campo name dos metadados
          if (metadata?.name) {
            const name = metadata.name;
            const normalizedName = normalizeCollectionName(name);

            // Verificar se o nome contém alguma das coleções que estamos procurando
            for (const collection of COLLECTIONS_TO_CHECK) {
              if (name.includes(collection) || normalizedName.includes(normalizeCollectionName(collection))) {
                found = true;
                foundCollection = collection;
                break;
              }
            }
            if (found) break;
          }

          // 3. Verificar no campo de conteúdo se for texto
          if (inscription.contentType?.includes('text') && inscription.content) {
            const content = inscription.content;
            const normalizedContent = normalizeCollectionName(content);

            for (const collection of COLLECTIONS_TO_CHECK) {
              if (content.includes(collection) || normalizedContent.includes(normalizeCollectionName(collection))) {
                found = true;
                foundCollection = collection;
                break;
              }
            }
            if (found) break;
          }
        } catch (error) {
          console.error('Error processing inscription:', error);
          continue;
        }
      }


      // Create confetti effect if holder
      if (found && buttonRef.current) {
        createConfettiEffect(buttonRef.current);

        // Show thank you modal for premium collection holders
        setFoundPremiumCollection(foundCollection);
        setShowThankYouModal(true);
      }

      // Update global context
      setIsPremium(found);
      setPremiumCollection(foundCollection);

      // Emit global event with premium status
      if (typeof window !== 'undefined') {
        const walletConnectedEvent = new CustomEvent('walletConnected', {
          detail: {
            address,
            connected: true,
            isPremium: found,
            premiumCollection: foundCollection
          }
        });
        window.dispatchEvent(walletConnectedEvent);
      }
    } catch (error) {
      console.error('Error verifying inscriptions:', error);
      setIsPremium(false);
      setPremiumCollection(null);
    } finally {
      setIsVerifying(false);
    }
  }

  // Criar efeito de confete
  const createConfettiEffect = (element: HTMLElement) => {
    if (typeof window === 'undefined') return;

    // Implementação simples de confete usando canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '100000';
    document.body.appendChild(canvas);

    const confetti: {x: number, y: number, size: number, color: string, speed: number, angle: number}[] = [];
    const colors = ['#8B5CF6', '#6366F1', '#EC4899', '#F59E0B', '#10B981'];

    // Criar partículas de confete
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 150; i++) {
      confetti.push({
        x: centerX,
        y: centerY,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 5 + 2,
        angle: Math.random() * Math.PI * 2
      });
    }

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let stillActive = false;
      confetti.forEach(particle => {
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed + 1; // Add gravity
        particle.speed *= 0.99;

        if (particle.y < canvas.height) {
          stillActive = true;
          ctx.fillStyle = particle.color;
          ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
      });

      if (stillActive) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    // Limpar após 5 segundos
    setTimeout(() => {
      cancelAnimationFrame(animationFrame);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }, 5000);
  }

  // Verificar Inscriptions quando o usuário conectar a carteira
  useEffect(() => {
    if (connected && address) {
      // Dispatch walletConnected immediately so PremiumContext can check VIP list
      // right away (before inscription verification which can be slow/flaky).
      // PremiumContext.handleWalletConnected checks getWalletAccessTier first.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { address, connected: true, isPremium: false, premiumCollection: null }
        }));
      }

      verifyInscriptions();
    } else {
      // Resetar o status premium
      setIsPremium(false);
      setPremiumCollection(null);
      setVerificationAttempted(false);

      // Emitir evento de desconexão
      if (typeof window !== 'undefined') {
        const walletDisconnectedEvent = new CustomEvent('walletDisconnected');
        window.dispatchEvent(walletDisconnectedEvent);
      }
    }
  }, [connected, address]);

  // Função para conectar carteira seguindo as recomendações oficiais do LaserEyes
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


      // Criar efeito de partículas no botão
      if (buttonRef.current) {
        createParticleEffect(buttonRef.current);
      }

      // Usar o hook para conectar
      await connect(provider);

      // Fechar o modal após a conexão bem-sucedida
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('not installed')) {
          alert(`${walletId.charAt(0).toUpperCase() + walletId.slice(1)} wallet is not installed. Please install it and try again.`);
        } else if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
          alert('Connection cancelled by user.');
        } else {
          alert(`Failed to connect ${walletId}: ${error.message}`);
        }
      } else {
        alert(`Failed to connect wallet. Please make sure your wallet is installed and try again.`);
      }
    }
  }

  // Criar efeito de partículas
  const createParticleEffect = (element: HTMLElement) => {
    if (typeof window === 'undefined') return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particles: {x: number, y: number, size: number, color: string, speedX: number, speedY: number, life: number, maxLife: number}[] = [];
    const colors = ['#8B5CF6', '#6366F1', '#EC4899'];

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      const size = Math.random() * 6 + 2;
      const life = Math.random() * 20 + 10;

      particles.push({
        x: centerX,
        y: centerY,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        life,
        maxLife: life
      });
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '100000';
    document.body.appendChild(canvas);

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let stillAlive = false;
      particles.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life -= 0.5;

        if (particle.life > 0) {
          stillAlive = true;
          const opacity = particle.life / particle.maxLife;
          ctx.globalAlpha = opacity;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (stillAlive) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    // Limpar após 3 segundos
    setTimeout(() => {
      cancelAnimationFrame(animationFrame);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }, 3000);
  }

  // Handle ETH wallet connect from modal
  const handleEthConnect = async () => {
    try {
      const addr = await connectEth()
      if (addr) {
        setIsModalOpen(false)
        // YHP verification happens automatically in the hook
        // If holder, the walletConnected event fires and PremiumContext picks it up
        // We also show the thank-you modal after verification completes
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  // Show thank-you modal when YHP holder is detected via ETH
  useEffect(() => {
    if (isYHPHolder && ethAddress && !yhpLoading) {
      setFoundPremiumCollection(YHP_COLLECTION_NAME)
      setShowThankYouModal(true)
      if (buttonRef.current) {
        createConfettiEffect(buttonRef.current)
      }
    }
  }, [isYHPHolder, ethAddress, yhpLoading])

  // Função para desconectar carteira
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  return (
    <div className="relative z-50 wallet-connect-button" ref={containerRef}>
      {/* Thank You Modal for Premium Collection Holders */}
      {showThankYouModal && foundPremiumCollection && (
        <PremiumThankYouModal
          collection={foundPremiumCollection}
          onClose={() => setShowThankYouModal(false)}
        />
      )}

      {connected && address ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 bg-[#8B5CF6] rounded-full animate-pulse mr-2"></div>
            <span className="text-xs text-[#8B5CF6] font-medium">Connected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              ref={buttonRef}
              onClick={() => setShowPremiumInfo(!showPremiumInfo)}
              className={`flex items-center px-4 py-2 ${isPremium ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6366F1]' : 'bg-gradient-to-r from-[#3D3D3D] to-[#2D2D2D]'} text-white rounded-md shadow-lg hover:shadow-xl transition-all`}
            >
              <span className="truncate max-w-[120px] font-medium">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              {isPremium && <RiShieldCheckLine className="ml-2 w-4 h-4 text-yellow-300" />}
            </button>

            <button
              onClick={handleDisconnect}
              className="p-2 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white rounded-md shadow-lg transition-all"
            >
              <RiCloseLine className="w-4 h-4" />
            </button>
          </div>

          {/* Informações de saldo */}
          <div className="mt-2 text-xs text-[#8B5CF6]">
            <span>{formatBTCBalance()} BTC</span>
          </div>

          {/* Informações de premium */}
          {showPremiumInfo && (
            <div className="mt-3 p-4 bg-black border border-[#8B5CF6]/30 rounded-md text-center animate-scaleIn">
              {isVerifying ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <RiLoader4Line className="animate-spin w-6 h-6 text-[#8B5CF6] mb-2" />
                  <p className="text-[#8B5CF6] text-sm">Verificando coleções...</p>
                </div>
              ) : isPremium && premiumCollection ? (
                <>
                  <div className="flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] rounded-md text-xs font-bold text-white animate-pulse">
                      PREMIUM ACCESS
                    </span>
                  </div>
                  <p className="text-[#8B5CF6] font-medium flex items-center justify-center mt-3">
                    <RiCheckLine className="mr-1 w-5 h-5" />
                    Verified {premiumCollection} Holder
                  </p>
                  <p className="text-white text-sm mt-2">
                    Thank you for supporting our project by holding {premiumCollection}! You now have exclusive access to premium features and analytics.
                  </p>
                  <button
                    onClick={verifyInscriptions}
                    className="mt-3 px-3 py-1.5 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white text-xs rounded-md transition-all"
                  >
                    Verify Again
                  </button>
                </>
              ) : verificationAttempted ? (
                <>
                  <div className="flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-[#3D3D3D] to-[#2D2D2D] rounded-md text-xs font-bold text-white">
                      STANDARD ACCESS
                    </span>
                  </div>
                  <p className="text-gray-400 flex items-center justify-center mt-3">
                    <RiLockLine className="mr-1 w-5 h-5" />
                    Premium Collections Not Found
                  </p>
                  <p className="text-white text-sm mt-2">
                    To access premium features, you need to hold one of our premium collections.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {PREMIUM_COLLECTIONS.slice(0, 4).map((collection) => (
                      <div key={collection} className="p-1.5 bg-[#1D1D1D] rounded-md">
                        {collection}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={verifyInscriptions}
                    className="mt-3 px-3 py-1.5 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white text-xs rounded-md transition-all"
                  >
                    Verify Again
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {connecting && (
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-[#8B5CF6] rounded-full animate-pulse mr-2"></div>
              <span className="text-xs text-[#8B5CF6] font-medium">Connecting...</span>
            </div>
          )}

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
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <RiWallet3Line className="mr-2 w-5 h-5" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal de seleção de carteira - Usando Portal React para renderizar no nível mais alto do DOM */}
      {isModalOpen && isBrowser && createPortal(
        <div className="wallet-modal-overlay bg-black/90 animate-fadeIn">
          <div className="wallet-modal-content bg-[#121212] border border-[#3D3D3D] rounded-lg p-6 max-w-md w-full mx-4 animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-transparent bg-clip-text">CONNECT WALLET</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-gray-300 transition-colors bg-[#2D2D2D] rounded-full w-8 h-8 flex items-center justify-center"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 mt-4">
              {/* Xverse Wallet */}
              <button
                onClick={() => handleConnect('xverse')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C4DEF] hover:to-[#5253E8] rounded-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                    <span className="text-white font-bold text-sm">X</span>
                  </div>
                  <span className="text-white font-medium">XVERSE</span>
                </div>
              </button>

              {/* Unisat Wallet */}
              <button
                onClick={() => handleConnect('unisat')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C4DEF] hover:to-[#5253E8] rounded-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                    <span className="text-white font-bold text-sm">U</span>
                  </div>
                  <span className="text-white font-medium">UNISAT</span>
                </div>
              </button>

              {/* Magic Eden Wallet */}
              <button
                onClick={() => handleConnect('magic-eden')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C4DEF] hover:to-[#5253E8] rounded-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                    <span className="text-white font-bold text-sm">ME</span>
                  </div>
                  <span className="text-white font-medium">MAGIC EDEN</span>
                </div>
              </button>

              {/* OYL Wallet */}
              <button
                onClick={() => handleConnect('oyl')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C4DEF] hover:to-[#5253E8] rounded-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                    <span className="text-white font-bold text-sm">OYL</span>
                  </div>
                  <span className="text-white font-medium">OYL</span>
                </div>
              </button>

              {/* Leather Wallet */}
              <button
                onClick={() => handleConnect('leather')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7C4DEF] hover:to-[#5253E8] rounded-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-[#3D3D3D]">
                    <span className="text-white font-bold text-sm">L</span>
                  </div>
                  <span className="text-white font-medium">LEATHER</span>
                </div>
              </button>
            </div>

            {/* Ethereum Wallets Section */}
            <div className="mt-4 pt-4 border-t border-[#3D3D3D]">
              <h4 className="text-sm font-bold text-orange-400 mb-3">ETHEREUM WALLETS</h4>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleEthConnect}
                  disabled={ethConnecting}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-md transition-all duration-200 disabled:opacity-50"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-3 border border-orange-500/30">
                      <span className="text-orange-400 font-bold text-sm">🦊</span>
                    </div>
                    <div className="text-left">
                      <span className="text-white font-medium block">
                        {ethConnecting ? 'Connecting...' : 'METAMASK'}
                      </span>
                      <span className="text-white/60 text-xs">Verify YHP Holder Status</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-400 text-center">
              <p>By connecting your wallet, you agree to our Terms of Service and Privacy Policy.</p>
              <p className="mt-2">Connect your wallet to verify if you own premium collections for enhanced access.</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
