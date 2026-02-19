/**
 * 🔔 Advanced Notification System
 * Multi-channel notifications with priority levels
 */

export type NotificationChannel = 'app' | 'browser' | 'email' | 'telegram';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'trade' | 'alert';

export interface NotificationConfig {
  channels: NotificationChannel[];
  soundEnabled: boolean;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  minPriority: NotificationPriority;
}

export interface AdvancedNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  data?: any;
  actions?: NotificationAction[];
  read: boolean;
}

export interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
}

class AdvancedNotificationService {
  private config: NotificationConfig = {
    channels: ['app', 'browser'],
    soundEnabled: true,
    emailEnabled: false,
    telegramEnabled: false,
    minPriority: 'low'
  };

  private notifications: Map<string, AdvancedNotification> = new Map();
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initializeBrowserNotifications();
  }

  private async initializeBrowserNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  async send(notification: Omit<AdvancedNotification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const fullNotification: AdvancedNotification = {
      ...notification,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date(),
      read: false
    };

    // Store notification
    this.notifications.set(fullNotification.id, fullNotification);

    // Check priority
    if (!this.shouldSendNotification(fullNotification.priority)) {
      return;
    }

    // Send to configured channels
    for (const channel of this.config.channels) {
      await this.sendToChannel(channel, fullNotification);
    }

    // Play sound if enabled
    if (this.config.soundEnabled && fullNotification.priority !== 'low') {
      this.playNotificationSound(fullNotification.priority);
    }
  }

  private shouldSendNotification(priority: NotificationPriority): boolean {
    const priorityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    return priorityLevels[priority] >= priorityLevels[this.config.minPriority];
  }

  private async sendToChannel(channel: NotificationChannel, notification: AdvancedNotification): Promise<void> {
    switch (channel) {
      case 'app':
        // In-app notification (handled by UI)
        window.dispatchEvent(new CustomEvent('app-notification', { detail: notification }));
        break;
        
      case 'browser':
        if ('Notification' in window && Notification.permission === 'granted') {
          const browserNotif = new Notification(notification.title, {
            body: notification.message,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: notification.id,
            requireInteraction: notification.priority === 'critical'
          });

          if (notification.actions && notification.actions.length > 0) {
            browserNotif.onclick = () => {
              this.handleNotificationClick(notification);
            };
          }
        }
        break;
        
      case 'email':
        if (this.config.emailEnabled) {
          // Implement email notification via API
        }
        break;
        
      case 'telegram':
        if (this.config.telegramEnabled) {
          // Implement Telegram notification via bot API
        }
        break;
    }
  }

  private playNotificationSound(priority: NotificationPriority) {
    const soundMap = {
      low: '/sounds/notification-low.mp3',
      medium: '/sounds/notification-medium.mp3',
      high: '/sounds/notification-high.mp3',
      critical: '/sounds/notification-critical.mp3'
    };

    const audio = new Audio(soundMap[priority] || soundMap.medium);
    audio.volume = 0.5;
    audio.play().catch(e => console.error('Failed to play notification sound:', e));
  }

  private handleNotificationClick(notification: AdvancedNotification) {
    this.markAsRead(notification.id);
    window.focus();
    
    if (notification.actions && notification.actions[0]) {
      window.dispatchEvent(new CustomEvent('notification-action', {
        detail: {
          notificationId: notification.id,
          action: notification.actions[0].action
        }
      }));
    }
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  getNotifications(unreadOnly: boolean = false): AdvancedNotification[] {
    const allNotifications = Array.from(this.notifications.values());
    
    if (unreadOnly) {
      return allNotifications.filter(n => !n.read);
    }
    
    return allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  clearAll() {
    this.notifications.clear();
  }
}

// Singleton instance
let serviceInstance: AdvancedNotificationService | null = null;

export function getNotificationService(): AdvancedNotificationService {
  if (!serviceInstance) {
    serviceInstance = new AdvancedNotificationService();
  }
  return serviceInstance;
}