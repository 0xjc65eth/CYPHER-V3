'use client'

import { useState, useEffect } from 'react'
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider'
import { RiImageLine, RiLoader4Line, RiInformationLine } from 'react-icons/ri'
import { DashboardCard } from '@/components/dashboard-card'

// Lista de coleções para verificar para acesso premium
const PREMIUM_COLLECTIONS = [
  'OCM Genesis',
  'OCM Katoshi Prime',
  'OCM Katoshi Classic',
  'Multiverse Pass',
  'MULTIVERSE PASS',
  'Seize CTRL',
  'SEIZE CTRL',
  'No Ordinary Kind',
  'N0 0RDINARY KIND',
  'Bitcoin Puppets',
  'BITCOIN PUPPETS',
  'The Wizards of Lords',
  'THE WIZARDS OF LORDS',
  'Yield Hacker Pass',
  'YIELD HACKER PASS',
  'Stack Sats',
  'STACK SATS'
]

export function OrdinalsViewer() {
  const { address, connected: isConnected, getOrdinals } = useLaserEyes()
  const [ordinals, setOrdinals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPremiumHolder, setIsPremiumHolder] = useState(false)
  const [premiumCollection, setPremiumCollection] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrdinals = async () => {
      if (!isConnected || !address) {
        setOrdinals([])
        setIsPremiumHolder(false)
        setPremiumCollection(null)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const userOrdinals = await getOrdinals(address)

        // Limitar a 5 ordinals para exibição
        setOrdinals(userOrdinals.slice(0, 5))

        // Verificar se o usuário possui algum Ordinal das coleções premium
        // Função para normalizar nomes de coleções para comparação
        const normalizeCollectionName = (name: string) => {
          return name.toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        // Normalizar nomes das coleções premium
        const normalizedPremiumCollections = PREMIUM_COLLECTIONS.map(normalizeCollectionName);

        let isPremium = false;
        let premiumCollectionFound = null;

        for (const ordinal of userOrdinals) {
          // Verificar em vários campos possíveis onde o nome da coleção pode estar

          // 1. Verificar no campo collection.name dos metadados
          if (ordinal.metadata && ordinal.metadata.collection && ordinal.metadata.collection.name) {
            const collectionName = ordinal.metadata.collection.name;
            const normalizedName = normalizeCollectionName(collectionName);

            if (normalizedPremiumCollections.some(name => normalizedName.includes(name)) ||
                PREMIUM_COLLECTIONS.includes(collectionName)) {
              isPremium = true;
              premiumCollectionFound = collectionName;
              break;
            }
          }

          // 2. Verificar no campo name dos metadados
          if (ordinal.metadata && ordinal.metadata.name) {
            const name = ordinal.metadata.name;
            const normalizedName = normalizeCollectionName(name);

            for (const collection of PREMIUM_COLLECTIONS) {
              if (name.includes(collection) || normalizedName.includes(normalizeCollectionName(collection))) {
                isPremium = true;
                premiumCollectionFound = collection;
                break;
              }
            }
            if (isPremium) break;
          }

          // 3. Verificar no campo content se for string
          if (ordinal.content && typeof ordinal.content === 'string') {
            const content = ordinal.content;
            const normalizedContent = normalizeCollectionName(content);

            for (const collection of PREMIUM_COLLECTIONS) {
              if (content.includes(collection) || normalizedContent.includes(normalizeCollectionName(collection))) {
                isPremium = true;
                premiumCollectionFound = collection;
                break;
              }
            }
            if (isPremium) break;
          }

          // 4. Verificar em qualquer outro campo que possa conter informações da coleção
          if (ordinal.attributes && Array.isArray(ordinal.attributes)) {
            for (const attr of ordinal.attributes) {
              if (attr.value && typeof attr.value === 'string') {
                const value = attr.value;
                const normalizedValue = normalizeCollectionName(value);

                for (const collection of PREMIUM_COLLECTIONS) {
                  if (value.includes(collection) || normalizedValue.includes(normalizeCollectionName(collection))) {
                    isPremium = true;
                    premiumCollectionFound = collection;
                    break;
                  }
                }
                if (isPremium) break;
              }
            }
            if (isPremium) break;
          }
        }

        setIsPremiumHolder(isPremium);
        setPremiumCollection(premiumCollectionFound);

      } catch (err) {
        console.error('Error fetching ordinals:', err)
        setError('Failed to fetch ordinals. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrdinals()
  }, [address, isConnected, getOrdinals])

  if (!isConnected) {
    return (
      <DashboardCard title="Your Ordinals" className="bg-gradient-to-br from-[#1A1A3A] to-[#2A2A5A] border-none shadow-xl">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <RiImageLine className="w-12 h-12 text-gray-500 mb-3" />
          <p className="text-gray-400">Connect your wallet to view your Ordinals</p>
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard
      title="Your Ordinals"
      className={`${isPremiumHolder
        ? 'bg-gradient-to-br from-[#2A1A5A] to-[#1A2A7A] border-purple-500/30'
        : 'bg-gradient-to-br from-[#1A1A3A] to-[#2A2A5A] border-none'} shadow-xl`}
    >
      {isPremiumHolder && premiumCollection && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/20 to-blue-700/20 border border-purple-500/30 rounded-lg text-center">
          <p className="text-blue-400 font-medium">
            Thank you for supporting our project by holding {premiumCollection}!
          </p>
          <p className="text-white text-sm mt-1">
            You have exclusive access to premium features and analytics.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <RiLoader4Line className="w-8 h-8 text-blue-400 animate-spin mb-3" />
          <p className="text-gray-300">Loading your Ordinals...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <RiInformationLine className="w-8 h-8 text-rose-400 mb-3" />
          <p className="text-rose-400">{error}</p>
        </div>
      ) : ordinals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <RiImageLine className="w-12 h-12 text-gray-500 mb-3" />
          <p className="text-gray-400">No Ordinals found in your wallet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ordinals.map((ordinal, index) => {
            // Verificar se este ordinal é um dos que dá acesso premium
            const isPremiumOrdinal = (() => {
              if (!ordinal.metadata) return false;

              // Verificar no nome da coleção
              if (ordinal.metadata.collection && ordinal.metadata.collection.name) {
                if (PREMIUM_COLLECTIONS.includes(ordinal.metadata.collection.name)) {
                  return true;
                }
              }

              // Verificar no nome do ordinal
              if (ordinal.metadata.name) {
                for (const collection of PREMIUM_COLLECTIONS) {
                  if (ordinal.metadata.name.includes(collection)) {
                    return true;
                  }
                }
              }

              return false;
            })();

            return (
              <div
                key={index}
                className={`${isPremiumOrdinal
                  ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/50'
                  : 'bg-[#2D2D4A] border-[#3D3D6A]'} p-3 rounded-lg border`}
              >
                <div className="flex items-start">
                  {ordinal.content && ordinal.content.includes('image') ? (
                    <div className="w-16 h-16 bg-black rounded overflow-hidden mr-3 flex-shrink-0">
                      <img
                        src={`https://ordinals.com/content/${ordinal.id}`}
                        alt="Ordinal"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Ordinal'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-[#1D1D3A] rounded overflow-hidden mr-3 flex-shrink-0 flex items-center justify-center">
                      <RiImageLine className="w-8 h-8 text-gray-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-white font-medium truncate">
                        {ordinal.metadata?.name || `Ordinal #${ordinal.number || index}`}
                      </p>
                      {isPremiumOrdinal && (
                        <span className="ml-2 px-1.5 py-0.5 bg-purple-500/30 border border-purple-500/50 rounded text-[10px] font-bold text-purple-300">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    {ordinal.metadata?.collection?.name && (
                      <p className="text-cyan-400 text-sm">{ordinal.metadata.collection.name}</p>
                    )}
                    <p className="text-gray-400 text-xs truncate mt-1">
                      {ordinal.id}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="text-center mt-4">
            <a
              href={`https://ordinals.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View all your Ordinals →
            </a>
          </div>
        </div>
      )}
    </DashboardCard>
  )
}
