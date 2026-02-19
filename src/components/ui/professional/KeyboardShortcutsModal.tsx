'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Shortcut {
  keys: string[];
  description: string;
  category?: string;
}

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts
}: KeyboardShortcutsModalProps) {
  // Group shortcuts by category
  const grouped = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
          >
            <div className="bg-gray-900 border-2 border-orange-500/30 rounded-terminal shadow-terminal-glow overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-black/40">
                <div className="flex items-center gap-3">
                  <Keyboard className="h-5 w-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-orange-400 uppercase tracking-wide">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
                {Object.entries(grouped).map(([category, categoryShortcuts]) => (
                  <div key={category}>
                    <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-800/50 transition-colors"
                        >
                          <span className="text-sm text-gray-300">
                            {shortcut.description}
                          </span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && (
                                  <span className="text-gray-600 mx-1">+</span>
                                )}
                                <kbd className="px-2 py-1 text-xs font-mono font-semibold text-orange-400 bg-gray-800 border border-gray-700 rounded shadow-sm">
                                  {key}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-800 bg-black/40">
                <p className="text-xs text-gray-500 text-center">
                  Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-800 border border-gray-700 rounded">?</kbd> to toggle this dialog
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Default shortcuts for Runes Terminal
export const defaultRunesShortcuts: Shortcut[] = [
  { keys: ['1'], description: 'Market Overview', category: 'Navigation' },
  { keys: ['2'], description: 'Etching History', category: 'Navigation' },
  { keys: ['3'], description: 'Marketplace', category: 'Navigation' },
  { keys: ['4'], description: 'Arbitrage', category: 'Navigation' },
  { keys: ['5'], description: 'Live Feed', category: 'Navigation' },
  { keys: ['6'], description: 'Analytics', category: 'Navigation' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Help' },
  { keys: ['Ctrl', 'K'], description: 'Search', category: 'Actions' },
  { keys: ['Ctrl', 'E'], description: 'Export data', category: 'Actions' },
  { keys: ['Ctrl', 'R'], description: 'Refresh data', category: 'Actions' },
  { keys: ['Esc'], description: 'Close modal/dialog', category: 'General' },
];
