'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface LaserEyesContextType {
  connected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  address: string;
  balance: number;
}

const LaserEyesContext = createContext<LaserEyesContextType>({
  connected: false,
  connect: async () => false,
  disconnect: async () => {},
  address: '',
  balance: 0,
});

export const SafeLaserEyesProvider = ({ children }: { children: ReactNode }) => {
  const [connected, setConnected] = React.useState(false);

  const value = {
    connected,
    connect: async () => {
      setConnected(true);
      return true;
    },
    disconnect: async () => {
      setConnected(false);
    },
    address: connected ? 'bc1qexample...' : '',
    balance: connected ? 0.0001 : 0,
  };

  return (
    <LaserEyesContext.Provider value={value}>
      {children}
    </LaserEyesContext.Provider>
  );
};

export const useLaserEyes = () => useContext(LaserEyesContext);