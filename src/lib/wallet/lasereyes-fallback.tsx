'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Tipo para o contexto
interface LaserEyesContextType {
  connected: boolean;
  isConnected: boolean;
  isInitializing: boolean;
  publicKey: string;
  address: string;
  balance: number;
  network: string;
  library: any;
  provider: any;
  accounts: string[];
  hasProvider: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
}

// Contexto padrão
const LaserEyesContext = createContext<LaserEyesContextType>({
  connected: false,
  isConnected: false,
  isInitializing: false,
  publicKey: '',
  address: '',
  balance: 0,
  network: 'mainnet',
  library: null,
  provider: null,
  accounts: [],
  hasProvider: false,
  connect: async () => false,
  disconnect: async () => {},
});

// Provider Mock
export const LaserEyesProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<LaserEyesContextType>({
    connected: false,
    isConnected: false,
    isInitializing: false,
    publicKey: '',
    address: '',
    balance: 0,
    network: 'mainnet',
    library: null,
    provider: null,
    accounts: [],
    hasProvider: false,
    connect: async () => {
      setState(prev => ({ ...prev, connected: true, isConnected: true }));
      return true;
    },
    disconnect: async () => {
      setState(prev => ({ ...prev, connected: false, isConnected: false }));
    },
  });

  return (
    <LaserEyesContext.Provider value={state}>
      {children}
    </LaserEyesContext.Provider>
  );
};

// Hook
export const useLaserEyes = () => {
  const context = useContext(LaserEyesContext);
  if (!context) {
    throw new Error('useLaserEyes must be used within LaserEyesProvider');
  }
  return context;
};

// Mock do XVERSE
export const XVERSE = 'xverse';