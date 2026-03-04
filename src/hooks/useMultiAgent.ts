'use client';

import { useState, useEffect, useCallback } from 'react';
import { cypherMultiAgent } from '@/lib/agents/multi-agent-system';
import type { Agent } from '@/lib/agents/multi-agent-system';

export const useMultiAgent = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [systemStats, setSystemStats] = useState<{ totalAgents: number; activeAgents: number; taskQueue: number; completedTasks: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setAgents(cypherMultiAgent.getAllAgents());
      const stats = cypherMultiAgent.getSystemStats();
      setSystemStats({
        totalAgents: stats.totalAgents,
        activeAgents: stats.activeAgents,
        taskQueue: stats.totalTasks,
        completedTasks: 0
      });
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
    }
  }, []);

  const designLayout = useCallback(async (layoutType: string) =>
    cypherMultiAgent.designLayout(layoutType), []);

  const createChart = useCallback(async (chartConfig: any) =>
    cypherMultiAgent.createChart(chartConfig), []);

  const connectWallet = useCallback(async (walletType: string) =>
    cypherMultiAgent.connectWallet(walletType), []);

  const analyzeOrdinals = useCallback(async (collection: string) =>
    cypherMultiAgent.addTask('AGENT_003', 'ordinals_analysis', { collection }), []);

  const processVoice = useCallback(async (transcript: string) =>
    cypherMultiAgent.addTask('AGENT_004', 'voice_processing', { transcript }), []);

  const performTechnicalAnalysis = useCallback(async (symbol: string) =>
    cypherMultiAgent.addTask('AGENT_005', 'technical_analysis', { symbol }), []);

  return {
    agents, systemStats, isLoading,
    designLayout, createChart, connectWallet,
    analyzeOrdinals, processVoice, performTechnicalAnalysis
  };
};

export default useMultiAgent;