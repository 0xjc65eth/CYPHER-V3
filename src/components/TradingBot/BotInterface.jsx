// components/TradingBot/BotInterface.jsx
import React, { useState, useEffect } from 'react';
import { automatedTradingBot } from '../../services/AutomatedTradingBotService';
import { VoiceInterface } from '../CypherAI/VoiceInterface';

export const BotInterface = ({ wallet }) => {
  const [botStatus, setBotStatus] = useState('stopped');
  const [config, setConfig] = useState({
    minProfitPercent: 1,
    maxRisk: 5,
    minLiquidity: 10000,
    interval: 5000,
    maxTradesPerDay: 50,
    strategies: ['arbitrage', 'trend', 'momentum']
  });
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [expandedView, setExpandedView] = useState(false);

  const bot = automatedTradingBot;

  useEffect(() => {
    const interval = setInterval(() => {
      if (botStatus === 'running') {
        updateStats();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [botStatus]);

  const updateStats = () => {
    const currentStats = bot.getStats();
    setStats(currentStats);
    
    const recentTrades = bot.getRecentTrades();
    setLogs(recentTrades);
  };

  const handleStart = async () => {
    setBotStatus('running');
    
    // Iniciar bot em thread separada
    setTimeout(async () => {
      await bot.startBot(config);
      setBotStatus('stopped');
    }, 100);
  };

  const handleStop = () => {
    bot.stopBot();
    setBotStatus('stopped');
    updateStats();
  };

  const handleVoiceCommand = async (command) => {
    if (command.type === 'analyze') {
      const opportunities = await bot.scanOpportunities();
      return opportunities;
    } else if (command.type === 'execute_all') {
      await bot.executeStrategies();
    }
  };

  const toggleStrategy = (strategy) => {
    const newStrategies = config.strategies.includes(strategy)
      ? config.strategies.filter(s => s !== strategy)
      : [...config.strategies, strategy];
    
    setConfig({ ...config, strategies: newStrategies });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  const formatPercent = (num) => {
    return `${formatNumber(num)}%`;
  };

  return (
    <div className="bot-interface bg-gray-900 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="header bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold flex items-center">
              <span className="text-3xl mr-3">🤖</span>
              Bot de Trading Automatizado
            </h2>
          </div>
          
          <div className="status flex items-center">
            <div className={`status-indicator w-3 h-3 rounded-full mr-2 ${
              botStatus === 'running' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-lg font-medium capitalize">{botStatus}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bot-controls p-6 bg-gray-800 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <button 
            onClick={botStatus === 'stopped' ? handleStart : handleStop}
            className={`control-btn px-6 py-3 rounded-lg font-bold text-white transition-all duration-300 ${
              botStatus === 'stopped' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
            }`}
          >
            {botStatus === 'stopped' ? '▶️ Iniciar Bot' : '⏹️ Parar Bot'}
          </button>

          <button
            onClick={() => setExpandedView(!expandedView)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {expandedView ? '📉 Modo Compacto' : '📊 Modo Expandido'}
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="bot-config p-6 bg-gray-850">
        <h3 className="text-lg font-bold text-white mb-4">Configurações do Bot</h3>
        
        <div className="config-grid grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="config-item">
            <label className="text-gray-400 text-sm block mb-2">
              Lucro Mínimo (%)
            </label>
            <input
              type="number"
              value={config.minProfitPercent}
              onChange={(e) => setConfig({
                ...config,
                minProfitPercent: parseFloat(e.target.value)
              })}
              disabled={botStatus === 'running'}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              step="0.1"
              min="0.1"
            />
          </div>
          
          <div className="config-item">
            <label className="text-gray-400 text-sm block mb-2">
              Risco Máximo (%)
            </label>
            <input
              type="number"
              value={config.maxRisk}
              onChange={(e) => setConfig({
                ...config,
                maxRisk: parseFloat(e.target.value)
              })}
              disabled={botStatus === 'running'}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              step="0.1"
              min="0.1"
            />
          </div>
          
          <div className="config-item">
            <label className="text-gray-400 text-sm block mb-2">
              Liquidez Mínima ($)
            </label>
            <input
              type="number"
              value={config.minLiquidity}
              onChange={(e) => setConfig({
                ...config,
                minLiquidity: parseFloat(e.target.value)
              })}
              disabled={botStatus === 'running'}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              step="1000"
              min="1000"
            />
          </div>
        </div>

        {/* Strategies */}
        <div className="strategies mt-6">
          <label className="text-gray-400 text-sm block mb-2">Estratégias Ativas</label>
          <div className="flex gap-3">
            {['arbitrage', 'trend', 'momentum'].map(strategy => (
              <button
                key={strategy}
                onClick={() => toggleStrategy(strategy)}
                disabled={botStatus === 'running'}
                className={`strategy-btn px-4 py-2 rounded-lg capitalize transition-all ${
                  config.strategies.includes(strategy)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {strategy}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bot-stats p-6 bg-gray-800">
          <h3 className="text-lg font-bold text-white mb-4">Estatísticas em Tempo Real</h3>
          <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat bg-gray-700 p-4 rounded-lg">
              <label className="text-gray-400 text-sm">Total de Trades</label>
              <span className="text-2xl font-bold text-white block mt-1">
                {stats.totalTrades}
              </span>
            </div>
            <div className="stat bg-gray-700 p-4 rounded-lg">
              <label className="text-gray-400 text-sm">Taxa de Sucesso</label>
              <span className={`text-2xl font-bold block mt-1 ${
                stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatPercent(stats.winRate)}
              </span>
            </div>
            <div className="stat bg-gray-700 p-4 rounded-lg">
              <label className="text-gray-400 text-sm">Lucro Total</label>
              <span className={`text-2xl font-bold block mt-1 ${
                stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ${formatNumber(stats.totalProfit)}
              </span>
            </div>
            <div className="stat bg-gray-700 p-4 rounded-lg">
              <label className="text-gray-400 text-sm">Trades/Hora</label>
              <span className="text-2xl font-bold text-white block mt-1">
                {stats.tradesPerHour || '0'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trade Logs */}
      {expandedView && (
        <div className="trade-logs p-6 bg-gray-850">
          <h3 className="text-lg font-bold text-white mb-4">Últimos Trades</h3>
          <div className="logs-container bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum trade executado ainda</p>
            ) : (
              logs.map((trade, idx) => (
                <div key={trade.id || idx} className="log-entry flex justify-between items-center py-2 px-3 hover:bg-gray-800 rounded">
                  <span className="time text-gray-500 text-sm">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`type px-2 py-1 rounded text-xs font-medium ${
                    trade.opportunity?.type === 'arbitrage' ? 'bg-blue-900 text-blue-300' :
                    trade.opportunity?.type === 'trend' ? 'bg-purple-900 text-purple-300' :
                    'bg-green-900 text-green-300'
                  }`}>
                    {trade.opportunity?.type || 'unknown'}
                  </span>
                  <span className="token text-white font-medium">
                    {trade.opportunity?.token || 'N/A'}
                  </span>
                  <span className={`profit font-bold ${
                    trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.profit >= 0 ? '+' : ''}{formatPercent(trade.profit || 0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Voice Interface Integration */}
      <div className="p-6 border-t border-gray-700">
        <VoiceInterface 
          onCommand={handleVoiceCommand}
          onResponse={(data) => console.log('🎤 Resposta do Cypher:', data)}
        />
      </div>

      {/* Footer */}
      <div className="footer p-4 bg-gray-800 rounded-b-xl text-center text-gray-500 text-xs">
        <p>⚡ Bot de alta frequência • 🔐 Segurança garantida • 💰 Taxa Cypher: 0.33%</p>
      </div>
    </div>
  );
};

export default BotInterface;