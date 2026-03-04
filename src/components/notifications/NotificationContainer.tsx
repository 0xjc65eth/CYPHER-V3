'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { X, TrendingUp, TrendingDown, Brain, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  // Show only the latest 5 notifications
  const displayNotifications = notifications.slice(0, 5);

  useEffect(() => {
    // Auto-dismiss notifications after 5 seconds
    displayNotifications.forEach(notification => {
      if (!visibleNotifications.includes(notification.id)) {
        setVisibleNotifications(prev => [...prev, notification.id]);

        setTimeout(() => {
          removeNotification(notification.id);
          setVisibleNotifications(prev => prev.filter(id => id !== notification.id));
        }, 5000);
      }
    });
  }, [displayNotifications, removeNotification, visibleNotifications]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'price':
        return <TrendingUp className="w-5 h-5" />;
      case 'arbitrage':
        return <TrendingDown className="w-5 h-5" />;
      case 'neural':
        return <Brain className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'price':
        return 'border-orange-500 bg-orange-500/10';
      case 'arbitrage':
        return 'border-green-500 bg-green-500/10';
      case 'neural':
        return 'border-purple-500 bg-purple-500/10';
      case 'success':
        return 'border-green-500 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'error':
        return 'border-red-500 bg-red-500/10';
      default:
        return 'border-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {displayNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className={`p-4 rounded-lg border backdrop-blur-sm ${getTypeColor(notification.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium">{notification.title}</h4>
                <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
                {notification.actions?.[0] && (
                  <button
                    onClick={notification.actions[0].action}
                    className="text-orange-500 hover:text-orange-400 text-sm mt-2 font-medium"
                  >
                    {notification.actions[0].label}
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  removeNotification(notification.id);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}