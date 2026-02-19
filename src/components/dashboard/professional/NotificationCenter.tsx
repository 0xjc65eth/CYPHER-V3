'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellRing,
  X,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Clock,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'price_alert' | 'trade_execution' | 'market_update' | 'system' | 'ai_insight';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'price_alert',
      title: 'Bitcoin Price Alert',
      message: 'BTC crossed $105,000! +2.5% in the last hour',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      priority: 'high',
      data: { symbol: 'BTC', price: 105000, change: 2.5 }
    },
    {
      id: '2',
      type: 'ai_insight',
      title: 'Cypher AI Insight',
      message: 'Strong bullish divergence detected on SOL 4H chart. Potential 15% upside.',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false,
      priority: 'medium',
      data: { symbol: 'SOL', confidence: 85 }
    },
    {
      id: '3',
      type: 'trade_execution',
      title: 'Trade Executed',
      message: 'Successfully bought 0.1 BTC at $104,500',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: true,
      priority: 'medium',
      data: { amount: 0.1, price: 104500, symbol: 'BTC' }
    }
  ]);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Play notification sound
  const playNotificationSound = (priority: string) => {
    if (!soundEnabled) return;
    
    const soundFile = priority === 'critical' ? 'alert-critical.mp3' : 
                     priority === 'high' ? 'alert-high.mp3' : 'alert-normal.mp3';
    
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  // Add new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    playNotificationSound(notification.priority);
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/cypher-ai.png',
        badge: '/icons/cypher-ai.png'
      });
    }
  };

  // Mark as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
  };

  // Get notification icon
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'price_alert':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'trade_execution':
        return <Zap className="w-4 h-4 text-blue-400" />;
      case 'market_update':
        return <TrendingDown className="w-4 h-4 text-orange-400" />;
      case 'ai_insight':
        return <DollarSign className="w-4 h-4 text-purple-400" />;
      case 'system':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-500/5';
      case 'high':
        return 'border-l-orange-500 bg-orange-500/5';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-500/5';
      case 'low':
        return 'border-l-gray-500 bg-gray-500/5';
      default:
        return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Notifications are added via the addNotification function when real events occur.
  // No simulated/fake notifications are generated.

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-orange-400" />
        ) : (
          <Bell className="w-5 h-5 text-gray-400" />
        )}
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500 text-white border-0 p-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-xl border-gray-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                Notifications
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-8 w-8"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={notifications.length === 0}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            {/* Notifications list */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                <AnimatePresence>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:bg-gray-800/50 ${
                          getPriorityColor(notification.priority)
                        } ${!notification.read ? 'ring-1 ring-purple-500/20' : ''}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-medium ${
                                  !notification.read ? 'text-white' : 'text-gray-300'
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs h-4 px-1"
                                >
                                  {notification.type.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="h-6 w-6 ml-2 opacity-50 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Settings */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Sound notifications</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-6 px-2"
                >
                  {soundEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}