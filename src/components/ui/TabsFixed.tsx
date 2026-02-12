'use client';

import React, { useState, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsFixedProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabsFixed({ tabs, activeTab, onTabChange, className = '' }: TabsFixedProps) {
  // Force re-render on mount to ensure event handlers are attached
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div role="tablist" className={`flex items-center gap-1 ${className}`}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => {
              onTabChange(tab.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                const currentIndex = tabs.findIndex(t => t.id === tab.id);
                const nextIndex = (currentIndex + 1) % tabs.length;
                onTabChange(tabs[nextIndex].id);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const currentIndex = tabs.findIndex(t => t.id === tab.id);
                const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                onTabChange(tabs[prevIndex].id);
              }
            }}
            className={`
              flex items-center gap-2 px-4 py-3
              border-b-2 transition-colors cursor-pointer
              select-none touch-manipulation
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
              ${isSelected
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-white'
              }
            `}
            style={{
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              touchAction: 'manipulation'
            }}
          >
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}