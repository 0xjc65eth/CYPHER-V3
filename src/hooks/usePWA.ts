/**
 * PWA Hook - Service Worker registration and management
 * Gerencia registro do SW, atualizações e funcionalidades PWA
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

export interface PWAUpdateInfo {
  isUpdateAvailable: boolean;
  newWorker?: ServiceWorker;
  updatePending: boolean;
}

export interface PWAStatus {
  isSupported: boolean;
  isInstalled: boolean;
  isRegistered: boolean;
  updateInfo: PWAUpdateInfo;
  registration?: ServiceWorkerRegistration;
}

export const usePWA = () => {
  const [status, setStatus] = useState<PWAStatus>({
    isSupported: false,
    isInstalled: false,
    isRegistered: false,
    updateInfo: {
      isUpdateAvailable: false,
      updatePending: false
    }
  });

  const [error, setError] = useState<string | null>(null);

  // Verificar se PWA é suportado
  const checkPWASupport = useCallback(() => {
    const isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    
    return isSupported;
  }, []);

  // Verificar se já está instalado
  const checkInstallStatus = useCallback(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    return isStandalone || localStorage.getItem('pwa-installed') === 'true';
  }, []);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!checkPWASupport()) {
      setError('Service Worker não é suportado neste navegador');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });


      // Verificar atualizações imediatamente
      registration.update();

      // Listener para nova versão do SW
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          
          setStatus(prev => ({
            ...prev,
            updateInfo: {
              isUpdateAvailable: true,
              newWorker,
              updatePending: true
            }
          }));

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Notificar usuário sobre atualização disponível
            }
          });
        }
      });

      // Verificar se há um SW aguardando
      if (registration.waiting) {
        setStatus(prev => ({
          ...prev,
          updateInfo: {
            isUpdateAvailable: true,
            newWorker: registration.waiting,
            updatePending: true
          }
        }));
      }

      setStatus(prev => ({
        ...prev,
        isRegistered: true,
        registration
      }));

      return registration;

    } catch (error) {
      console.error('[PWA] Erro ao registrar Service Worker:', error);
      setError('Falha ao registrar Service Worker');
      return null;
    }
  }, [checkPWASupport]);

  // Aplicar atualização do SW
  const applyUpdate = useCallback(async () => {
    const { newWorker } = status.updateInfo;
    
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Recarregar página após atualização
      window.location.reload();
    }
  }, [status.updateInfo]);

  // Verificar atualizações periodicamente
  const checkForUpdates = useCallback(async () => {
    if (status.registration) {
      try {
        await status.registration.update();
      } catch (error) {
        console.error('[PWA] Erro ao verificar atualizações:', error);
      }
    }
  }, [status.registration]);

  // Limpar cache
  const clearCache = useCallback(async () => {
    try {
      if (status.registration) {
        const sw = status.registration.active;
        if (sw) {
          sw.postMessage({ type: 'CLEAR_CACHE' });
        }
      }
      
      // Limpar caches do navigator
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

    } catch (error) {
      console.error('[PWA] Erro ao limpar cache:', error);
    }
  }, [status.registration]);

  // Obter informações do SW
  const getServiceWorkerInfo = useCallback(async () => {
    if (status.registration) {
      const sw = status.registration.active;
      if (sw) {
        return new Promise((resolve) => {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data);
          };
          
          sw.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
        });
      }
    }
    return null;
  }, [status.registration]);

  // Configurar notificações push
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      throw new Error('Este navegador não suporta notificações');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      
      // Configurar push subscription se necessário
      if (status.registration && 'PushManager' in window) {
        try {
          const subscription = await status.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: null // Configurar com sua chave VAPID
          });
          
          return subscription;
        } catch (error) {
          console.error('[PWA] Erro ao criar push subscription:', error);
        }
      }
    }
    
    return permission;
  }, [status.registration]);

  // Instalar PWA (para casos especiais)
  const installPWA = useCallback(async () => {
    // Esta função é principalmente para tracking
    // A instalação real é feita através do beforeinstallprompt
    localStorage.setItem('pwa-installed', 'true');
    
    setStatus(prev => ({
      ...prev,
      isInstalled: true
    }));
  }, []);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      const isSupported = checkPWASupport();
      const isInstalled = checkInstallStatus();
      
      setStatus(prev => ({
        ...prev,
        isSupported,
        isInstalled
      }));

      if (isSupported) {
        await registerServiceWorker();
      }
    };

    init();
  }, [checkPWASupport, checkInstallStatus, registerServiceWorker]);

  // Verificar atualizações periodicamente (a cada 30 minutos)
  useEffect(() => {
    if (status.isRegistered) {
      const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [status.isRegistered, checkForUpdates]);

  // Listener para mudanças no estado da rede
  useEffect(() => {
    const handleOnline = () => {
      checkForUpdates();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [checkForUpdates]);

  return {
    status,
    error,
    actions: {
      applyUpdate,
      checkForUpdates,
      clearCache,
      getServiceWorkerInfo,
      requestNotificationPermission,
      installPWA
    }
  };
};

export default usePWA;
