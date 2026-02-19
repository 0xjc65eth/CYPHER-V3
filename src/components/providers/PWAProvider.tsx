/**
 * PWA Provider - Integra todas as funcionalidades PWA
 * Gerencia Service Worker, install prompt e notificações
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { PWAUpdateNotification, PWAConnectionStatus } from '@/components/notifications/PWAUpdateNotification';
import usePWA from '@/hooks/usePWA';

interface PWAContextType {
  isSupported: boolean;
  isInstalled: boolean;
  isRegistered: boolean;
  hasUpdate: boolean;
  applyUpdate: () => Promise<void>;
  clearCache: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | null>(null);

export const usePWAContext = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWAContext must be used within PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: React.ReactNode;
  showInstallPrompt?: boolean;
  showUpdateNotification?: boolean;
  showConnectionStatus?: boolean;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
  showInstallPrompt = true,
  showUpdateNotification = true,
  showConnectionStatus = true
}) => {
  const { status, actions, error } = usePWA();
  const [installPromptShown, setInstallPromptShown] = useState(false);

  // Log PWA status for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (error) console.error('[PWA Provider] Error:', error);
    }
  }, [status, error]);

  // Handle successful installation
  const handleInstallSuccess = () => {
    setInstallPromptShown(true);
  };

  // Context value
  const contextValue: PWAContextType = {
    isSupported: status.isSupported,
    isInstalled: status.isInstalled,
    isRegistered: status.isRegistered,
    hasUpdate: status.updateInfo.isUpdateAvailable,
    applyUpdate: actions.applyUpdate,
    clearCache: actions.clearCache,
    checkForUpdates: actions.checkForUpdates
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* PWA Components */}
      {showInstallPrompt && !status.isInstalled && !installPromptShown && (
        <PWAInstallPrompt 
          onInstalled={handleInstallSuccess}
          onDismissed={() => setInstallPromptShown(true)}
        />
      )}
      
      {showUpdateNotification && (
        <PWAUpdateNotification />
      )}
      
      {showConnectionStatus && (
        <PWAConnectionStatus />
      )}
    </PWAContext.Provider>
  );
};

export default PWAProvider;
