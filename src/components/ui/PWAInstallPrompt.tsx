/**
 * PWA Install Prompt Component
 * Prompt para instalação do app como PWA
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor, Zap } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  onInstalled?: () => void;
  onDismissed?: () => void;
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onInstalled,
  onDismissed,
  className = ''
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detectar se já está em modo standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Listener para o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar prompt após um delay
      setTimeout(() => {
        if (!localStorage.getItem('pwa-install-dismissed')) {
          setShowPrompt(true);
        }
      }, 5000);
    };

    // Listener para quando o app é instalado
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
      onInstalled?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
      } else {
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Erro durante instalação:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onDismissed?.();
  };

  const handleLaterClick = () => {
    setShowPrompt(false);
    // Mostrar novamente em 24 horas
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-install-dismissed', tomorrow.toString());
  };

  // Não mostrar se já está instalado ou em modo standalone
  if (isStandalone || !showPrompt) {
    return null;
  }

  // Prompt especial para iOS
  if (isIOS && !isStandalone) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-4 rounded-2xl shadow-2xl border border-orange-400">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <Smartphone className="w-6 h-6 mr-2" />
              <h3 className="font-bold text-lg">Instalar CYPHER ORDI</h3>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm mb-4 text-white/90">
            Adicione este app à sua tela inicial para acesso rápido e experiência melhorada!
          </p>
          
          <div className="text-sm space-y-2 mb-4 text-white/90">
            <div className="flex items-center">
              <span className="mr-2">1.</span>
              <span>Toque no ícone de compartilhar</span>
              <span className="ml-2 text-lg">📤</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">2.</span>
              <span>Selecione "Adicionar à Tela Inicial"</span>
              <span className="ml-2 text-lg">➕</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleLaterClick}
              className="flex-1 bg-white/20 text-white py-2 px-4 rounded-xl font-medium transition-colors hover:bg-white/30"
            >
              Mais tarde
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-white text-orange-500 py-2 px-4 rounded-xl font-medium transition-colors hover:bg-white/90"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prompt padrão para Android/Desktop
  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-gradient-to-r from-gray-900 to-black text-white p-5 rounded-2xl shadow-2xl border border-orange-500/30 backdrop-blur-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="bg-orange-500 p-2 rounded-xl mr-3">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Instalar CYPHER ORDI</h3>
              <p className="text-gray-300 text-sm">Experiência completa offline</p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <Zap className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <p className="text-xs text-gray-300">Acesso rápido</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <p className="text-xs text-gray-300">Modo desktop</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <Smartphone className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <p className="text-xs text-gray-300">App nativo</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleLaterClick}
            className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-xl font-medium transition-colors hover:bg-gray-600"
          >
            Mais tarde
          </button>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-xl font-bold transition-all hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInstalling ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Instalando...
              </div>
            ) : (
              'Instalar agora'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook para verificar se o PWA está instalado
 */
export const usePWAInstallStatus = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Verificar se está em modo standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Verificar se foi instalado anteriormente
    const installed = localStorage.getItem('pwa-installed') === 'true';
    setIsInstalled(installed);

    // Listener para o evento beforeinstallprompt
    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return {
    isInstalled,
    isStandalone,
    canInstall
  };
};

export default PWAInstallPrompt;
