/**
 * CYPHER ORDI FUTURE - Advanced Pathfinding Algorithm v4.0
 * 
 * Sistema avançado de pathfinding usando teoria de grafos para encontrar
 * as melhores rotas de trading através de múltiplas DEXs.
 * 
 * Features:
 * - Graph-based pathfinding com algoritmos otimizados
 * - A* search com heurísticas customizadas
 * - Dijkstra modificado para trading routes
 * - Bellman-Ford para detecção de arbitragem
 * - Dynamic programming para otimização
 * - Parallel path exploration
 * - Real-time graph updates
 */

import { Token, DEXType, LiquidityPool } from '@/types/quickTrade'

export interface GraphNode {
  token: Token
  id: string
  metadata: {
    tvl: number
    volume24h: number
    priceUSD: number
    lastUpdate: number
    chainId: number
  }
}

export interface GraphEdge {
  from: string
  to: string
  dex: DEXType
  weight: number
  fee: number
  gasEstimate: number
  liquidity: number
  priceImpact: number
  reliability: number
  metadata: {
    poolAddress?: string
    lastUpdate: number
    volume24h: number
    apy?: number
    isStable: boolean
  }
}

export interface PathfindingResult {
  path: GraphNode[]
  edges: GraphEdge[]
  totalWeight: number
  totalFee: number
  totalGas: number
  totalPriceImpact: number
  confidence: number
  hops: number
  strategy: 'direct' | 'multi-hop' | 'arbitrage' | 'split'
  metrics: {
    searchTime: number
    nodesExplored: number
    pathsEvaluated: number
    algorithmUsed: string
  }
}

export interface PathfindingOptions {
  maxHops: number
  maxPaths: number
  algorithm: 'dijkstra' | 'astar' | 'bellman-ford' | 'dynamic' | 'parallel'
  optimizeFor: 'output' | 'gas' | 'speed' | 'safety' | 'balanced'
  includeSplits: boolean
  includeArbitrage: boolean
  minLiquidity: number
  maxSlippage: number
  timeout: number
  parallelWorkers: number
}

export interface Heuristic {
  name: string
  calculate: (from: GraphNode, to: GraphNode, market: MarketContext) => number
  weight: number
}

export interface MarketContext {
  volatility: number
  gasPrice: number
  networkCongestion: number
  timestamp: number
  priceFeeds: Map<string, number>
}

export class AdvancedPathfinder {
  private graph: Map<string, GraphNode> = new Map()
  private edges: Map<string, GraphEdge[]> = new Map()
  private adjacencyList: Map<string, string[]> = new Map()
  private stablecoinNodes: Set<string> = new Set()
  private majorNodes: Set<string> = new Set() // High-liquidity nodes
  private pathCache: Map<string, PathfindingResult[]> = new Map()
  
  // Heuristics for A* algorithm
  private heuristics: Map<string, Heuristic> = new Map()
  
  // Performance tracking
  private performanceMetrics = {
    totalSearches: 0,
    averageSearchTime: 0,
    cacheHits: 0,
    pathsFound: 0
  }

  constructor() {
    this.initializeHeuristics()
  }

  /**
   * Encontra múltiplos caminhos otimizados entre dois tokens
   */
  async findOptimalPaths(
    fromToken: Token,
    toToken: Token,
    amount: string,
    options: Partial<PathfindingOptions> = {},
    marketContext?: MarketContext
  ): Promise<PathfindingResult[]> {
    const startTime = Date.now()
    const opts = this.getDefaultOptions(options)
    
    try {
      // Verificar cache primeiro
      const cacheKey = this.getCacheKey(fromToken, toToken, amount, opts)
      const cachedResults = this.getCachedPaths(cacheKey)
      if (cachedResults && cachedResults.length > 0) {
        this.performanceMetrics.cacheHits++
        return cachedResults
      }

      // Verificar se os nós existem no grafo
      const fromNode = this.getOrCreateNode(fromToken)
      const toNode = this.getOrCreateNode(toToken)

      let results: PathfindingResult[] = []

      // Selecionar algoritmo baseado nas opções
      switch (opts.algorithm) {
        case 'dijkstra':
          results = await this.dijkstraSearch(fromNode, toNode, amount, opts, marketContext)
          break
        case 'astar':
          results = await this.astarSearch(fromNode, toNode, amount, opts, marketContext)
          break
        case 'bellman-ford':
          results = await this.bellmanFordSearch(fromNode, toNode, amount, opts, marketContext)
          break
        case 'dynamic':
          results = await this.dynamicProgrammingSearch(fromNode, toNode, amount, opts, marketContext)
          break
        case 'parallel':
          results = await this.parallelSearch(fromNode, toNode, amount, opts, marketContext)
          break
        default:
          results = await this.hybridSearch(fromNode, toNode, amount, opts, marketContext)
      }

      // Filtrar e ordenar resultados
      results = this.filterAndSortResults(results, opts)

      // Cache dos resultados
      this.cachePaths(cacheKey, results)

      // Atualizar métricas
      this.updatePerformanceMetrics(startTime, results.length)

      return results.slice(0, opts.maxPaths)

    } catch (error) {
      console.error('❌ Pathfinding error:', error)
      throw new Error(`Pathfinding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Algoritmo de Dijkstra modificado para trading
   */
  private async dijkstraSearch(
    fromNode: GraphNode,
    toNode: GraphNode,
    amount: string,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): Promise<PathfindingResult[]> {
    const distances = new Map<string, number>()
    const previous = new Map<string, { node: string; edge: GraphEdge }>()
    const visited = new Set<string>()
    const queue: { node: GraphNode; distance: number; path: GraphEdge[] }[] = []

    // Inicializar distâncias
    distances.set(fromNode.id, 0)
    queue.push({ node: fromNode, distance: 0, path: [] })

    const results: PathfindingResult[] = []
    let nodesExplored = 0

    while (queue.length > 0 && results.length < options.maxPaths) {
      // Ordenar fila por distância (heap seria mais eficiente)
      queue.sort((a, b) => a.distance - b.distance)
      const current = queue.shift()!
      
      if (visited.has(current.node.id)) continue
      visited.add(current.node.id)
      nodesExplored++

      // Verificar se chegamos ao destino
      if (current.node.id === toNode.id && current.path.length > 0) {
        const path = this.reconstructPath(fromNode, current.node, previous)
        if (path && this.isValidPath(path, current.path, options)) {
          results.push(this.createPathfindingResult(
            path.nodes,
            current.path,
            'dijkstra',
            nodesExplored,
            Date.now()
          ))
        }
        continue
      }

      // Explorar vizinhos
      const neighbors = this.getNeighbors(current.node.id)
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue

        const neighbor = this.graph.get(neighborId)!
        const edge = this.findBestEdge(current.node.id, neighborId, marketContext)
        if (!edge) continue

        // Calcular novo custo/distância
        const newDistance = this.calculatePathWeight(
          current.distance,
          edge,
          amount,
          current.path.length,
          options,
          marketContext
        )

        if (!distances.has(neighborId) || newDistance < distances.get(neighborId)!) {
          distances.set(neighborId, newDistance)
          previous.set(neighborId, { node: current.node.id, edge })
          
          // Adicionar à fila se não exceder max hops
          if (current.path.length < options.maxHops) {
            queue.push({
              node: neighbor,
              distance: newDistance,
              path: [...current.path, edge]
            })
          }
        }
      }
    }

    return results
  }

  /**
   * Algoritmo A* com heurísticas customizadas
   */
  private async astarSearch(
    fromNode: GraphNode,
    toNode: GraphNode,
    amount: string,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): Promise<PathfindingResult[]> {
    const gScore = new Map<string, number>() // Custo real do caminho
    const fScore = new Map<string, number>() // Custo estimado total
    const cameFrom = new Map<string, { node: string; edge: GraphEdge }>()
    const openSet: { node: GraphNode; fScore: number; path: GraphEdge[] }[] = []
    const closedSet = new Set<string>()

    gScore.set(fromNode.id, 0)
    fScore.set(fromNode.id, this.calculateHeuristic(fromNode, toNode, marketContext))
    openSet.push({ node: fromNode, fScore: fScore.get(fromNode.id)!, path: [] })

    const results: PathfindingResult[] = []
    let nodesExplored = 0

    while (openSet.length > 0 && results.length < options.maxPaths) {
      // Ordenar por f-score
      openSet.sort((a, b) => a.fScore - b.fScore)
      const current = openSet.shift()!

      if (closedSet.has(current.node.id)) continue
      closedSet.add(current.node.id)
      nodesExplored++

      // Verificar se chegamos ao objetivo
      if (current.node.id === toNode.id && current.path.length > 0) {
        const path = this.reconstructPath(fromNode, current.node, cameFrom)
        if (path && this.isValidPath(path, current.path, options)) {
          results.push(this.createPathfindingResult(
            path.nodes,
            current.path,
            'astar',
            nodesExplored,
            Date.now()
          ))
        }
        continue
      }

      // Explorar vizinhos
      const neighbors = this.getNeighbors(current.node.id)
      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue

        const neighbor = this.graph.get(neighborId)!
        const edge = this.findBestEdge(current.node.id, neighborId, marketContext)
        if (!edge) continue

        const tentativeGScore = gScore.get(current.node.id)! + this.calculateEdgeWeight(edge, amount, options)

        if (!gScore.has(neighborId) || tentativeGScore < gScore.get(neighborId)!) {
          cameFrom.set(neighborId, { node: current.node.id, edge })
          gScore.set(neighborId, tentativeGScore)
          
          const heuristic = this.calculateHeuristic(neighbor, toNode, marketContext)
          fScore.set(neighborId, tentativeGScore + heuristic)

          // Adicionar à lista aberta se não exceder max hops
          if (current.path.length < options.maxHops) {
            openSet.push({
              node: neighbor,
              fScore: fScore.get(neighborId)!,
              path: [...current.path, edge]
            })
          }
        }
      }
    }

    return results
  }

  /**
   * Algoritmo Bellman-Ford para detecção de arbitragem
   */
  private async bellmanFordSearch(
    fromNode: GraphNode,
    toNode: GraphNode,
    amount: string,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): Promise<PathfindingResult[]> {
    const distances = new Map<string, number>()
    const previous = new Map<string, { node: string; edge: GraphEdge }>()
    const results: PathfindingResult[] = []

    // Inicializar distâncias
    for (const [nodeId] of this.graph) {
      distances.set(nodeId, nodeId === fromNode.id ? 0 : Infinity)
    }

    // Relaxar edges V-1 vezes
    const nodes = Array.from(this.graph.keys())
    for (let i = 0; i < nodes.length - 1; i++) {
      for (const nodeId of nodes) {
        if (distances.get(nodeId) === Infinity) continue

        const neighbors = this.getNeighbors(nodeId)
        for (const neighborId of neighbors) {
          const edge = this.findBestEdge(nodeId, neighborId, marketContext)
          if (!edge) continue

          const newDistance = distances.get(nodeId)! + this.calculateEdgeWeight(edge, amount, options)
          if (newDistance < distances.get(neighborId)!) {
            distances.set(neighborId, newDistance)
            previous.set(neighborId, { node: nodeId, edge })
          }
        }
      }
    }

    // Verificar ciclos negativos (oportunidades de arbitragem)
    if (options.includeArbitrage) {
      for (const nodeId of nodes) {
        if (distances.get(nodeId) === Infinity) continue

        const neighbors = this.getNeighbors(nodeId)
        for (const neighborId of neighbors) {
          const edge = this.findBestEdge(nodeId, neighborId, marketContext)
          if (!edge) continue

          const newDistance = distances.get(nodeId)! + this.calculateEdgeWeight(edge, amount, options)
          if (newDistance < distances.get(neighborId)!) {
            // Ciclo negativo detectado - oportunidade de arbitragem
            const arbPath = this.extractArbitragePath(nodeId, previous)
            if (arbPath) {
              results.push(this.createPathfindingResult(
                arbPath.nodes,
                arbPath.edges,
                'bellman-ford',
                nodes.length,
                Date.now(),
                'arbitrage'
              ))
            }
          }
        }
      }
    }

    // Reconstruir caminho normal se encontrado
    if (distances.get(toNode.id) !== Infinity) {
      const path = this.reconstructPath(fromNode, toNode, previous)
      if (path) {
        results.push(this.createPathfindingResult(
          path.nodes,
          path.edges,
          'bellman-ford',
          nodes.length,
          Date.now()
        ))
      }
    }

    return results
  }

  /**
   * Busca com programação dinâmica
   */
  private async dynamicProgrammingSearch(
    fromNode: GraphNode,
    toNode: GraphNode,
    amount: string,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): Promise<PathfindingResult[]> {
    // DP table: dp[hop][node] = melhor custo para chegar ao node em 'hop' passos
    const dp: Map<string, number>[] = []
    const path: Map<string, { node: string; edge: GraphEdge }>[] = []

    // Inicializar DP
    for (let hop = 0; hop <= options.maxHops; hop++) {
      dp[hop] = new Map()
      path[hop] = new Map()
      
      if (hop === 0) {
        dp[hop].set(fromNode.id, 0)
      } else {
        for (const [nodeId] of this.graph) {
          dp[hop].set(nodeId, Infinity)
        }
      }
    }

    // Preencher tabela DP
    for (let hop = 1; hop <= options.maxHops; hop++) {
      for (const [nodeId] of this.graph) {
        if (dp[hop - 1].get(nodeId) === Infinity) continue

        const neighbors = this.getNeighbors(nodeId)
        for (const neighborId of neighbors) {
          const edge = this.findBestEdge(nodeId, neighborId, marketContext)
          if (!edge) continue

          const newCost = dp[hop - 1].get(nodeId)! + this.calculateEdgeWeight(edge, amount, options)
          if (newCost < dp[hop].get(neighborId)!) {
            dp[hop].set(neighborId, newCost)
            path[hop].set(neighborId, { node: nodeId, edge })
          }
        }
      }
    }

    // Encontrar melhores caminhos
    const results: PathfindingResult[] = []
    for (let hop = 1; hop <= options.maxHops; hop++) {
      const cost = dp[hop].get(toNode.id)
      if (cost !== undefined && cost !== Infinity) {
        const reconstructed = this.reconstructDPPath(toNode, hop, path)
        if (reconstructed) {
          results.push(this.createPathfindingResult(
            reconstructed.nodes,
            reconstructed.edges,
            'dynamic',
            hop * this.graph.size,
            Date.now()
          ))
        }
      }
    }

    return results
  }

  /**
   * Busca paralela usando Web Workers (simulado)
   */
  private async parallelSearch(
    fromNode: GraphNode,
    toNode: GraphNode,
    amount: string,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): Promise<PathfindingResult[]> {
    const algorithms = ['dijkstra', 'astar', 'bellman-ford', 'dynamic']
    const promises: Promise<PathfindingResult[]>[] = []

    // Executar algoritmos em paralelo (simulado)
    for (const algorithm of algorithms.slice(0, options.parallelWorkers)) {
      const algOptions = { ...options, algorithm: algorithm as any }
      promises.push(this.findOptimalPaths(fromNode.token, toNode.token, amount, algOptions, marketContext))
    }

    // Aguardar todos os resultados
    const allResults = await Promise.all(promises)
    const combinedResults: PathfindingResult[] = []

    // Combinar e dedplicar resultados
    for (const results of allResults) {
      for (const result of results) {
        if (!this.isDuplicatePath(result, combinedResults)) {
          combinedResults.push(result)
        }
      }
    }

    return combinedResults
  }

  /**
   * Busca híbrida que escolhe o melhor algoritmo baseado no contexto
   */
  private async hybridSearch(
    fromNode: GraphNode,
    toNode: GraphNode,
    amount: string,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): Promise<PathfindingResult[]> {
    // Escolher algoritmo baseado no contexto
    let algorithm: string

    if (options.includeArbitrage) {
      algorithm = 'bellman-ford'
    } else if (this.graph.size > 1000) {
      algorithm = 'astar' // Mais eficiente para grafos grandes
    } else if (options.optimizeFor === 'safety') {
      algorithm = 'dynamic' // Melhor para análise de risco
    } else {
      algorithm = 'dijkstra' // Default
    }

    const hybridOptions = { ...options, algorithm: algorithm as any }
    return await this.findOptimalPaths(fromNode.token, toNode.token, amount, hybridOptions, marketContext)
  }

  // Utility methods

  private getDefaultOptions(options: Partial<PathfindingOptions>): PathfindingOptions {
    return {
      maxHops: 4,
      maxPaths: 5,
      algorithm: 'dijkstra',
      optimizeFor: 'balanced',
      includeSplits: false,
      includeArbitrage: false,
      minLiquidity: 10000,
      maxSlippage: 5.0,
      timeout: 10000,
      parallelWorkers: 3,
      ...options
    }
  }

  private getOrCreateNode(token: Token): GraphNode {
    const nodeId = `${token.chainId}-${token.address}`
    
    if (!this.graph.has(nodeId)) {
      const node: GraphNode = {
        token,
        id: nodeId,
        metadata: {
          tvl: 0,
          volume24h: 0,
          priceUSD: 0,
          lastUpdate: Date.now(),
          chainId: token.chainId
        }
      }
      this.graph.set(nodeId, node)
      this.adjacencyList.set(nodeId, [])
    }

    return this.graph.get(nodeId)!
  }

  private getNeighbors(nodeId: string): string[] {
    return this.adjacencyList.get(nodeId) || []
  }

  private findBestEdge(fromId: string, toId: string, marketContext?: MarketContext): GraphEdge | null {
    const edges = this.edges.get(`${fromId}-${toId}`) || []
    if (edges.length === 0) return null

    // Ordenar por peso (melhor primeiro)
    return edges.sort((a, b) => {
      const weightA = this.calculateEdgeWeight(a, '1000', this.getDefaultOptions({}), marketContext)
      const weightB = this.calculateEdgeWeight(b, '1000', this.getDefaultOptions({}), marketContext)
      return weightA - weightB
    })[0]
  }

  private calculateEdgeWeight(
    edge: GraphEdge,
    amount: string,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): number {
    let weight = edge.weight

    // Ajustar baseado na otimização
    switch (options.optimizeFor) {
      case 'output':
        weight = -edge.weight // Negative for max output
        break
      case 'gas':
        weight = edge.gasEstimate
        break
      case 'speed':
        weight = edge.gasEstimate + (edge.reliability < 90 ? 1000 : 0)
        break
      case 'safety':
        weight = edge.weight + (100 - edge.reliability) * 10
        break
      default: // balanced
        weight = edge.weight + edge.gasEstimate * 0.1 + edge.fee * 100
    }

    // Aplicar penalty por slippage
    if (edge.priceImpact > options.maxSlippage) {
      weight += 10000 // Heavy penalty
    }

    // Aplicar penalty por baixa liquidez
    if (edge.liquidity < options.minLiquidity) {
      weight += 5000
    }

    return weight
  }

  private calculatePathWeight(
    currentWeight: number,
    edge: GraphEdge,
    amount: string,
    hops: number,
    options: PathfindingOptions,
    marketContext?: MarketContext
  ): number {
    const edgeWeight = this.calculateEdgeWeight(edge, amount, options, marketContext)
    
    // Penalty por mais hops
    const hopPenalty = hops * 100
    
    return currentWeight + edgeWeight + hopPenalty
  }

  private calculateHeuristic(from: GraphNode, to: GraphNode, marketContext?: MarketContext): number {
    let totalHeuristic = 0

    // Combinar múltiplas heurísticas
    for (const [name, heuristic] of this.heuristics) {
      const value = heuristic.calculate(from, to, marketContext || this.getDefaultMarketContext())
      totalHeuristic += value * heuristic.weight
    }

    return totalHeuristic
  }

  private initializeHeuristics(): void {
    // Heurística de distância por chain
    this.heuristics.set('chain_distance', {
      name: 'Chain Distance',
      calculate: (from, to) => from.token.chainId === to.token.chainId ? 0 : 1000,
      weight: 0.3
    })

    // Heurística de liquidez
    this.heuristics.set('liquidity', {
      name: 'Liquidity Heuristic',
      calculate: (from, to) => {
        const fromLiquidity = from.metadata.tvl
        const toLiquidity = to.metadata.tvl
        return fromLiquidity + toLiquidity > 1000000 ? 0 : 500
      },
      weight: 0.2
    })

    // Heurística de stablecoin
    this.heuristics.set('stablecoin', {
      name: 'Stablecoin Route',
      calculate: (from, to) => {
        const isFromStable = this.stablecoinNodes.has(from.id)
        const isToStable = this.stablecoinNodes.has(to.id)
        return (isFromStable || isToStable) ? -100 : 0 // Bonus para stablecoins
      },
      weight: 0.1
    })

    // Heurística de volume
    this.heuristics.set('volume', {
      name: 'Volume Heuristic',
      calculate: (from, to) => {
        const avgVolume = (from.metadata.volume24h + to.metadata.volume24h) / 2
        return avgVolume > 1000000 ? -50 : 0 // Bonus para alto volume
      },
      weight: 0.2
    })

    // Heurística de volatilidade
    this.heuristics.set('volatility', {
      name: 'Volatility Heuristic',
      calculate: (from, to, market) => {
        return market.volatility > 0.05 ? 200 : 0 // Penalty para alta volatilidade
      },
      weight: 0.2
    })
  }

  private reconstructPath(
    fromNode: GraphNode,
    toNode: GraphNode,
    previous: Map<string, { node: string; edge: GraphEdge }>
  ): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    
    let current = toNode.id
    nodes.unshift(toNode)

    while (previous.has(current)) {
      const prev = previous.get(current)!
      edges.unshift(prev.edge)
      const prevNode = this.graph.get(prev.node)!
      nodes.unshift(prevNode)
      current = prev.node
    }

    return nodes.length > 1 ? { nodes, edges } : null
  }

  private reconstructDPPath(
    toNode: GraphNode,
    hop: number,
    path: Map<string, { node: string; edge: GraphEdge }>[]
  ): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    
    let current = toNode.id
    let currentHop = hop
    nodes.unshift(toNode)

    while (currentHop > 0 && path[currentHop].has(current)) {
      const prev = path[currentHop].get(current)!
      edges.unshift(prev.edge)
      const prevNode = this.graph.get(prev.node)!
      nodes.unshift(prevNode)
      current = prev.node
      currentHop--
    }

    return nodes.length > 1 ? { nodes, edges } : null
  }

  private extractArbitragePath(nodeId: string, previous: Map<string, { node: string; edge: GraphEdge }>): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
    // Implementar extração de ciclo de arbitragem
    // Por simplicidade, retornar null aqui
    return null
  }

  private isValidPath(
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: PathfindingOptions
  ): boolean {
    return (
      nodes.length <= options.maxHops + 1 &&
      edges.length <= options.maxHops &&
      edges.every(edge => edge.liquidity >= options.minLiquidity) &&
      edges.every(edge => edge.priceImpact <= options.maxSlippage)
    )
  }

  private createPathfindingResult(
    nodes: GraphNode[],
    edges: GraphEdge[],
    algorithm: string,
    nodesExplored: number,
    searchTime: number,
    strategy: 'direct' | 'multi-hop' | 'arbitrage' | 'split' = 'multi-hop'
  ): PathfindingResult {
    const totalWeight = edges.reduce((sum, edge) => sum + edge.weight, 0)
    const totalFee = edges.reduce((sum, edge) => sum + edge.fee, 0)
    const totalGas = edges.reduce((sum, edge) => sum + edge.gasEstimate, 0)
    const totalPriceImpact = edges.reduce((sum, edge) => sum + edge.priceImpact, 0)
    const avgReliability = edges.reduce((sum, edge) => sum + edge.reliability, 0) / edges.length

    return {
      path: nodes,
      edges,
      totalWeight,
      totalFee,
      totalGas,
      totalPriceImpact,
      confidence: Math.min(avgReliability, 95),
      hops: edges.length,
      strategy,
      metrics: {
        searchTime: Date.now() - searchTime,
        nodesExplored,
        pathsEvaluated: 1,
        algorithmUsed: algorithm
      }
    }
  }

  private filterAndSortResults(results: PathfindingResult[], options: PathfindingOptions): PathfindingResult[] {
    return results
      .filter(result => this.isValidPathResult(result, options))
      .sort((a, b) => this.comparePathResults(a, b, options))
  }

  private isValidPathResult(result: PathfindingResult, options: PathfindingOptions): boolean {
    return (
      result.hops <= options.maxHops &&
      result.totalPriceImpact <= options.maxSlippage &&
      result.confidence >= 60 // Minimum confidence threshold
    )
  }

  private comparePathResults(a: PathfindingResult, b: PathfindingResult, options: PathfindingOptions): number {
    switch (options.optimizeFor) {
      case 'output':
        return a.totalWeight - b.totalWeight // Lower weight = better output
      case 'gas':
        return a.totalGas - b.totalGas
      case 'speed':
        return a.metrics.searchTime - b.metrics.searchTime
      case 'safety':
        return b.confidence - a.confidence
      default: // balanced
        const scoreA = this.calculateBalancedScore(a)
        const scoreB = this.calculateBalancedScore(b)
        return scoreB - scoreA
    }
  }

  private calculateBalancedScore(result: PathfindingResult): number {
    const outputScore = (1 / (result.totalWeight + 1)) * 30
    const gasScore = Math.max(0, (500000 - result.totalGas) / 500000) * 25
    const speedScore = Math.max(0, (10000 - result.metrics.searchTime) / 10000) * 15
    const reliabilityScore = (result.confidence / 100) * 20
    const simplicityScore = Math.max(0, (4 - result.hops) / 4) * 10

    return outputScore + gasScore + speedScore + reliabilityScore + simplicityScore
  }

  private isDuplicatePath(result: PathfindingResult, existing: PathfindingResult[]): boolean {
    return existing.some(existingResult => {
      if (existingResult.path.length !== result.path.length) return false
      return existingResult.path.every((node, index) => node.id === result.path[index].id)
    })
  }

  private getCacheKey(fromToken: Token, toToken: Token, amount: string, options: PathfindingOptions): string {
    return `${fromToken.address}-${toToken.address}-${amount}-${options.algorithm}-${options.maxHops}`
  }

  private getCachedPaths(cacheKey: string): PathfindingResult[] | null {
    const cached = this.pathCache.get(cacheKey)
    if (cached) {
      // Check if cache is still valid (5 minutes TTL)
      const now = Date.now()
      if (cached[0]?.metrics && (now - cached[0].metrics.searchTime) < 300000) {
        return cached
      }
      this.pathCache.delete(cacheKey)
    }
    return null
  }

  private cachePaths(cacheKey: string, results: PathfindingResult[]): void {
    this.pathCache.set(cacheKey, results)
    
    // Auto cleanup after 5 minutes
    setTimeout(() => {
      this.pathCache.delete(cacheKey)
    }, 300000)
  }

  private updatePerformanceMetrics(startTime: number, pathsFound: number): void {
    this.performanceMetrics.totalSearches++
    this.performanceMetrics.pathsFound += pathsFound
    
    const searchTime = Date.now() - startTime
    this.performanceMetrics.averageSearchTime = 
      (this.performanceMetrics.averageSearchTime * (this.performanceMetrics.totalSearches - 1) + searchTime) / 
      this.performanceMetrics.totalSearches
  }

  private getDefaultMarketContext(): MarketContext {
    return {
      volatility: 0.02,
      gasPrice: 20,
      networkCongestion: 0.5,
      timestamp: Date.now(),
      priceFeeds: new Map()
    }
  }

  /**
   * Add or update an edge in the graph
   */
  addEdge(edge: GraphEdge): void {
    const key = `${edge.from}-${edge.to}`
    if (!this.edges.has(key)) {
      this.edges.set(key, [])
    }
    this.edges.get(key)!.push(edge)

    // Update adjacency list
    if (!this.adjacencyList.has(edge.from)) {
      this.adjacencyList.set(edge.from, [])
    }
    if (!this.adjacencyList.get(edge.from)!.includes(edge.to)) {
      this.adjacencyList.get(edge.from)!.push(edge.to)
    }
  }

  /**
   * Update graph with new liquidity data
   */
  updateGraph(pools: LiquidityPool[]): void {
    for (const pool of pools) {
      const fromNode = this.getOrCreateNode(pool.token0)
      const toNode = this.getOrCreateNode(pool.token1)

      // Create edges in both directions
      const edge1: GraphEdge = {
        from: fromNode.id,
        to: toNode.id,
        dex: pool.dex,
        weight: 1 / parseFloat(pool.tvl), // Inverse weight for liquidity
        fee: pool.fee,
        gasEstimate: this.estimateGasForDEX(pool.dex),
        liquidity: parseFloat(pool.tvl),
        priceImpact: 0.1, // Default, should be calculated
        reliability: this.getReliabilityForDEX(pool.dex),
        metadata: {
          poolAddress: pool.address,
          lastUpdate: Date.now(),
          volume24h: parseFloat(pool.volume24h),
          apy: pool.apy,
          isStable: this.isStablecoinPair(pool.token0, pool.token1)
        }
      }

      const edge2: GraphEdge = {
        ...edge1,
        from: toNode.id,
        to: fromNode.id
      }

      this.addEdge(edge1)
      this.addEdge(edge2)
    }

  }

  private estimateGasForDEX(dex: DEXType): number {
    const gasEstimates = {
      [DEXType.UNISWAP_V2]: 150000,
      [DEXType.UNISWAP_V3]: 180000,
      [DEXType.SUSHISWAP]: 150000,
      [DEXType.JUPITER]: 80000,
      [DEXType.CURVE]: 200000,
      [DEXType.BALANCER]: 250000
    }
    return gasEstimates[dex] || 150000
  }

  private getReliabilityForDEX(dex: DEXType): number {
    const reliability = {
      [DEXType.UNISWAP_V2]: 95,
      [DEXType.UNISWAP_V3]: 95,
      [DEXType.SUSHISWAP]: 90,
      [DEXType.JUPITER]: 92,
      [DEXType.CURVE]: 93,
      [DEXType.BALANCER]: 88
    }
    return reliability[dex] || 85
  }

  private isStablecoinPair(token0: Token, token1: Token): boolean {
    const stableSymbols = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'UST']
    return stableSymbols.includes(token0.symbol) && stableSymbols.includes(token1.symbol)
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return { ...this.performanceMetrics }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.pathCache.clear()
    this.performanceMetrics.cacheHits = 0
  }

  /**
   * Get graph statistics
   */
  getGraphStats() {
    return {
      totalNodes: this.graph.size,
      totalEdges: Array.from(this.edges.values()).reduce((sum, edges) => sum + edges.length, 0),
      averageDegree: this.graph.size > 0 ? Array.from(this.adjacencyList.values()).reduce((sum, neighbors) => sum + neighbors.length, 0) / this.graph.size : 0,
      stablecoinNodes: this.stablecoinNodes.size,
      majorNodes: this.majorNodes.size
    }
  }
}

export default AdvancedPathfinder