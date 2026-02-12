'use client'
import { useState } from 'react'
import { TopNavLayout } from '@/components/layout/TopNavLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Grid, Col, Card, Title, Text, Tab, TabGroup, TabList as TremorTabList, TabPanel, TabPanels } from '@tremor/react'
import { NeuralLearningStatusCard } from './components/neural-learning-status-card'
import { NeuralArbitrageCard } from './components/neural-arbitrage-card'
import { NeuralSmcCard } from './components/neural-smc-card'
import { NeuralOrdinalsRunesCard } from './components/neural-ordinals-runes-card'
import { CloudSyncStatusCard } from './components/cloud-sync-status-card'
import { NeuralArchitectureCard } from './components/neural-architecture-card'
import { RiBrainLine, RiDatabase2Line, RiLineChartLine, RiSettings4Line, RiAiGenerate } from 'react-icons/ri'

const isDisabled = process.env.NEXT_PUBLIC_DISABLE_NEURAL_LEARNING === 'true'

export default function NeuralLearningPage() {
  if (isDisabled) {
    return (
      <TopNavLayout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <div className="w-16 h-16 bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] rounded-full flex items-center justify-center mb-4 shadow-lg shadow-[#8B5CF6]/20">
            <RiBrainLine className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-mono mb-2 bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-transparent bg-clip-text text-center">
            NEURAL LEARNING SYSTEM
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] rounded-full mb-4"></div>
          <h2 className="text-lg text-gray-300 font-mono max-w-2xl text-center mb-4">
            This section is currently under maintenance
          </h2>
          <p className="text-gray-400 font-mono text-center max-w-md">
            Our neural learning system is being upgraded to provide better insights and predictions.
            Please check back later.
          </p>
        </div>
      </TopNavLayout>
    )
  }

  return (
    <TopNavLayout>
      <div className="space-y-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] rounded-lg flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20">
              <RiBrainLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#8B5CF6] text-transparent bg-clip-text">
                NEURAL LEARNING SYSTEM
              </h1>
              <p className="text-sm text-gray-400 font-mono">
                24/7 continuous learning for Bitcoin, Ordinals, and Runes
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-gray-800 px-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent data-[state=active]:text-[#8B5CF6] text-gray-500 px-4 py-2 text-sm font-mono">
                Overview
              </TabsTrigger>
              <TabsTrigger value="insights" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent data-[state=active]:text-[#8B5CF6] text-gray-500 px-4 py-2 text-sm font-mono">
                Insights
              </TabsTrigger>
              <TabsTrigger value="data" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent data-[state=active]:text-[#8B5CF6] text-gray-500 px-4 py-2 text-sm font-mono">
                Data
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent data-[state=active]:text-[#8B5CF6] text-gray-500 px-4 py-2 text-sm font-mono">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="px-6 py-6">
            <Grid numItemsMd={1} numItemsLg={3} className="gap-6 mb-6">
              <Col numColSpanLg={1}>
                <NeuralLearningStatusCard />
              </Col>
              <Col numColSpanLg={1}>
                <CloudSyncStatusCard />
              </Col>
              <Col numColSpanLg={1}>
                <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mr-3 border border-[#8B5CF6]/30">
                      <RiAiGenerate className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    <Title className="text-white text-xl">How Neural Learning Works</Title>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/20 shadow-md">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mr-3 border border-[#8B5CF6]/30">
                          <span className="text-[#8B5CF6] font-bold">1</span>
                        </div>
                        <Text className="text-sm font-medium text-white">Continuous Data Collection</Text>
                      </div>
                      <Text className="text-sm text-white/90">
                        Our system continuously collects data from multiple official sources including:
                      </Text>
                      <ul className="mt-2 space-y-1 text-sm text-white/80 list-disc list-inside pl-2">
                        <li>Bitcoin blockchain data (transactions, blocks, mempool)</li>
                        <li>Ordinals and Runes market data from multiple marketplaces</li>
                        <li>On-chain metrics and network health indicators</li>
                        <li>Social sentiment from Twitter, Discord, and Reddit</li>
                        <li>Trading patterns and market movements</li>
                      </ul>
                      <Text className="text-sm text-white/90 mt-2">
                        All data is processed, normalized, and prepared for neural network training.
                      </Text>
                    </div>
                    <div className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/20 shadow-md">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mr-3 border border-[#8B5CF6]/30">
                          <span className="text-[#8B5CF6] font-bold">2</span>
                        </div>
                        <Text className="text-sm font-medium text-white">Specialized Neural Networks</Text>
                      </div>
                      <Text className="text-sm text-white/90">
                        We employ multiple specialized neural networks, each trained for specific tasks:
                      </Text>
                      <ul className="mt-2 space-y-1 text-sm text-white/80 list-disc list-inside pl-2">
                        <li><span className="text-[#8B5CF6] font-medium">Price Prediction Network:</span> Forecasts Bitcoin price movements</li>
                        <li><span className="text-[#8B5CF6] font-medium">SMC Analysis Network:</span> Identifies key support/resistance levels</li>
                        <li><span className="text-[#8B5CF6] font-medium">Arbitrage Detection Network:</span> Finds price discrepancies across markets</li>
                        <li><span className="text-[#8B5CF6] font-medium">Ordinals Valuation Network:</span> Estimates fair value of collections</li>
                        <li><span className="text-[#8B5CF6] font-medium">Runes Analysis Network:</span> Tracks Runes adoption and usage patterns</li>
                      </ul>
                    </div>
                    <div className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/20 shadow-md">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mr-3 border border-[#8B5CF6]/30">
                          <span className="text-[#8B5CF6] font-bold">3</span>
                        </div>
                        <Text className="text-sm font-medium text-white">Degoo Cloud Synchronization</Text>
                      </div>
                      <Text className="text-sm text-white/90">
                        Our system synchronizes with Degoo cloud storage, enabling:
                      </Text>
                      <ul className="mt-2 space-y-1 text-sm text-white/80 list-disc list-inside pl-2">
                        <li>Continuous learning even when your computer is offline</li>
                        <li>Secure storage of trained models and historical data</li>
                        <li>Distributed training across multiple instances</li>
                        <li>Backup and recovery of neural network states</li>
                        <li>Sharing of insights between authorized users</li>
                      </ul>
                    </div>
                    <div className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/20 shadow-md">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mr-3 border border-[#8B5CF6]/30">
                          <span className="text-[#8B5CF6] font-bold">4</span>
                        </div>
                        <Text className="text-sm font-medium text-white">Continuous Improvement Cycle</Text>
                      </div>
                      <Text className="text-sm text-white/90">
                        Our neural system implements a feedback loop for continuous improvement:
                      </Text>
                      <ul className="mt-2 space-y-1 text-sm text-white/80 list-disc list-inside pl-2">
                        <li>Prediction accuracy is tracked and measured against real outcomes</li>
                        <li>Models are automatically retrained with new data every 4 hours</li>
                        <li>Hyperparameters are fine-tuned based on performance metrics</li>
                        <li>New data sources are continuously evaluated and integrated</li>
                        <li>System adapts to changing market conditions and patterns</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </Col>
            </Grid>
            <Grid numItemsMd={1} numItemsLg={3} className="gap-6">
              <Col>
                <NeuralSmcCard />
              </Col>
              <Col>
                <NeuralArbitrageCard />
              </Col>
              <Col>
                <NeuralOrdinalsRunesCard />
              </Col>
            </Grid>
          </TabsContent>

          {/* Insights */}
          <TabsContent value="insights" className="px-6 py-6">
            <Grid numItemsMd={1} numItemsLg={2} className="gap-6">
              <Col numColSpanLg={2}>
                <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
                  <Title className="text-white text-xl mb-4">Latest Neural Insights</Title>
                  <TabGroup>
                    <TremorTabList className="mb-4">
                      <Tab className="text-sm">All Insights</Tab>
                      <Tab className="text-sm">Price</Tab>
                      <Tab className="text-sm">SMC</Tab>
                      <Tab className="text-sm">Arbitrage</Tab>
                      <Tab className="text-sm">Ordinals</Tab>
                      <Tab className="text-sm">Runes</Tab>
                    </TremorTabList>
                    <TabPanels>
                      <TabPanel>
                        <div className="text-center py-20">
                          <Text className="text-gray-400">Select a specific insight type to view details</Text>
                        </div>
                      </TabPanel>
                      <TabPanel>
                        <NeuralSmcCard />
                      </TabPanel>
                      <TabPanel>
                        <NeuralArbitrageCard />
                      </TabPanel>
                      <TabPanel>
                        <NeuralOrdinalsRunesCard />
                      </TabPanel>
                    </TabPanels>
                  </TabGroup>
                </Card>
              </Col>
            </Grid>
          </TabsContent>

          {/* Data */}
          <TabsContent value="data" className="px-6 py-6">
            <Grid numItemsMd={1} numItemsLg={2} className="gap-6">
              <Col>
                <NeuralArchitectureCard />
              </Col>
              <Col>
                <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mr-3 border border-[#8B5CF6]/30">
                      <RiDatabase2Line className="w-5 h-5 text-[#8B5CF6]" />
                    </div>
                    <Title className="text-white text-xl">Data Sources</Title>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/20 shadow-md">
                      <Text className="text-sm font-medium text-white mb-3">Official Bitcoin Data Sources</Text>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Bitcoin Core RPC API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Mempool.space API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Blockchain.com API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">CoinMarketCap API</Text>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/20 shadow-md">
                      <Text className="text-sm font-medium text-white mb-3">Ordinals & Runes Data</Text>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Ordiscan API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Magic Eden API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Gamma.io API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Runes Explorer API</Text>
                        </li>
                      </ul>
                    </div>
                    <div className="bg-[#8B5CF6]/10 p-4 rounded-lg border border-[#8B5CF6]/20 shadow-md">
                      <Text className="text-sm font-medium text-white mb-3">Social & Market Data</Text>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Twitter API (via RapidAPI)</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">Reddit API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">CryptoCompare API</Text>
                        </li>
                        <li className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] mr-2"></div>
                          <Text className="text-xs text-white/90">CoinGecko API</Text>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </Col>
            </Grid>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="px-6 py-6">
            <Grid numItemsMd={1} numItemsLg={2} className="gap-6">
              <Col>
                <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
                  <Title className="text-white text-xl mb-4">Neural Learning Settings</Title>
                  <div className="text-center py-20">
                    <Text className="text-gray-400">Settings will be displayed here</Text>
                  </div>
                </Card>
              </Col>
              <Col>
                <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
                  <Title className="text-white text-xl mb-4">Model Configuration</Title>
                  <div className="text-center py-20">
                    <Text className="text-gray-400">Model configuration options will be displayed here</Text>
                  </div>
                </Card>
              </Col>
            </Grid>
          </TabsContent>
        </Tabs>
      </div>
    </TopNavLayout>
  )
}
