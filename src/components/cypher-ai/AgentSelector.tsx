'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AgentOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  role: string;
}

const AGENTS: AgentOption[] = [
  { id: 'agent-alpha', name: 'Alpha', icon: '\u{1F4C8}', color: '#00ff88', role: 'Market Analyst' },
  { id: 'agent-onchain', name: 'Satoshi', icon: '\u{26D3}\u{FE0F}', color: '#3b82f6', role: 'On-Chain Analyst' },
  { id: 'agent-ordinals', name: 'Inscriber', icon: '\u{1F536}', color: '#f59e0b', role: 'Ordinals & NFTs' },
  { id: 'agent-macro', name: 'Macro', icon: '\u{1F30D}', color: '#8b5cf6', role: 'Macro Economist' },
  { id: 'agent-defi', name: 'DeFi', icon: '\u{26A1}', color: '#06b6d4', role: 'DeFi & Lightning' },
  { id: 'agent-risk', name: 'Guardian', icon: '\u{1F6E1}\u{FE0F}', color: '#ef4444', role: 'Risk Manager' },
  { id: 'agent-sentiment', name: 'Pulse', icon: '\u{1F493}', color: '#ec4899', role: 'Sentiment Analyst' },
  { id: 'agent-quant', name: 'Quant', icon: '\u{1F522}', color: '#14b8a6', role: 'Quantitative Analyst' },
];

interface AgentSelectorProps {
  value: string | null;
  onChange: (agentName: string | null) => void;
}

export function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = value ? AGENTS.find((a) => a.name === value) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-800 border border-gray-600 hover:border-gray-500 transition-colors text-gray-300"
        style={selected ? { borderColor: `${selected.color}60`, color: selected.color } : undefined}
      >
        <span>{selected ? selected.icon : '\u{1F916}'}</span>
        <span>{selected ? selected.name : 'Auto'}</span>
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-60 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
              !value ? 'text-orange-400' : 'text-gray-300'
            }`}
          >
            <span className="text-base">{'\u{1F916}'}</span>
            <div>
              <div className="font-medium">Auto</div>
              <div className="text-xs text-gray-500">AI routes your query to the best agent</div>
            </div>
          </button>

          <div className="border-t border-gray-800 my-1" />

          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => { onChange(agent.name); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
                value === agent.name ? 'bg-gray-800/50' : ''
              }`}
              style={value === agent.name ? { color: agent.color } : { color: '#d1d5db' }}
            >
              <span className="text-base">{agent.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ color: agent.color }}>{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentSelector;
