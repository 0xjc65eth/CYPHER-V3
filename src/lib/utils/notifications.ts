/**
 * 🔔 Notification System
 * Handles all notifications with sound support
 */

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  sound?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

class NotificationManager {
  private notifications: Notification[] = [];
  private audio: HTMLAudioElement | null = null;
  private hasUserInteraction = false;
  
  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize audio element
      this.initializeAudio();
      
      // Track user interaction for audio permissions
      document.addEventListener('click', () => {
        this.hasUserInteraction = true;
      }, { once: true });
    }
  }
  
  private initializeAudio() {
    try {
      this.audio = new Audio('/sounds/notification-sound.mp3');
      this.audio.volume = 0.5;
    } catch (error) {
    }
  }
  
  async playSound() {
    if (!this.audio || !this.hasUserInteraction) return;
    
    try {
      // Reset audio to beginning
      this.audio.currentTime = 0;
      
      // Play with user interaction
      await this.audio.play();
    } catch (error) {
      
      // Try to get user permission if needed
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.requestAudioPermission();
      }
    }
  }
  
  private requestAudioPermission() {
    // Create a visual prompt for audio permission
    const button = document.createElement('button');
    button.textContent = 'Enable Notification Sounds';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #f7931a;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      z-index: 9999;
      font-weight: 600;
    `;
    
    button.onclick = async () => {
      try {
        await this.audio?.play();
        this.hasUserInteraction = true;
        button.remove();
      } catch (error) {
        console.error('Audio permission denied:', error);
      }
    };
    
    document.body.appendChild(button);
    
    // Auto-remove after 10 seconds
    setTimeout(() => button.remove(), 10000);
  }
  
  async notify(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    this.notifications.push(newNotification);
    
    // Play sound if enabled
    if (notification.sound !== false) {
      await this.playSound();
    }
    
    // Check for browser notification support
    if ('Notification' in window && Notification.permission === 'granted') {
      this.showBrowserNotification(newNotification);
    }
    
    // Emit custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification', { detail: newNotification }));
    }
    
    return newNotification;
  }
  
  private showBrowserNotification(notification: Notification) {
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/cypher-ai-icon.svg',
        badge: '/icons/icon-72x72.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
      });
      
      // Handle click
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // Execute first action if available
        if (notification.actions?.[0]) {
          notification.actions[0].action();
        }
      };
      
      // Auto-close after 5 seconds for non-high priority
      if (notification.priority !== 'high') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    } catch (error) {
      console.error('Browser notification failed:', error);
    }
  }
  
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  getNotifications(): Notification[] {
    return this.notifications;
  }
  
  clearNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
  
  clearAll() {
    this.notifications = [];
  }
}

// Create singleton instance
export const notificationManager = new NotificationManager();

// Convenience functions
export async function showNotification(
  title: string,
  message: string,
  type: Notification['type'] = 'info',
  priority: Notification['priority'] = 'medium'
) {
  return notificationManager.notify({
    type,
    title,
    message,
    priority,
  });
}

export async function showSuccess(title: string, message: string) {
  return showNotification(title, message, 'success');
}

export async function showError(title: string, message: string) {
  return showNotification(title, message, 'error', 'high');
}

export async function showWarning(title: string, message: string) {
  return showNotification(title, message, 'warning', 'medium');
}

export async function showInfo(title: string, message: string) {
  return showNotification(title, message, 'info', 'low');
}

// Trading-specific notifications
export async function notifyTradeExecuted(
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  price: number
) {
  const title = `${side.toUpperCase()} Order Executed`;
  const message = `${amount} ${symbol} at $${price.toLocaleString()}`;
  
  return showNotification(title, message, 'success', 'high');
}

export async function notifyStopLoss(symbol: string, loss: number) {
  const title = 'Stop Loss Triggered';
  const message = `${symbol} position closed. Loss: -$${Math.abs(loss).toLocaleString()}`;
  
  return showNotification(title, message, 'warning', 'high');
}

export async function notifyTakeProfit(symbol: string, profit: number) {
  const title = 'Take Profit Reached';
  const message = `${symbol} position closed. Profit: +$${profit.toLocaleString()}`;
  
  return showNotification(title, message, 'success', 'high');
}

export async function notifyAISignal(
  signal: 'buy' | 'sell' | 'hold',
  symbol: string,
  confidence: number
) {
  const title = `AI ${signal.toUpperCase()} Signal`;
  const message = `${symbol} - Confidence: ${(confidence * 100).toFixed(1)}%`;
  
  return showNotification(
    title,
    message,
    signal === 'buy' ? 'success' : signal === 'sell' ? 'warning' : 'info',
    confidence > 0.8 ? 'high' : 'medium'
  );
}

export default notificationManager;
