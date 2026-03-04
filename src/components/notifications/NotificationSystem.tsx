'use client';

import React, { useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { Bell, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function NotificationSystem() {
  const { notifications, removeNotification } = useNotification();

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      case 'bullish': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'bearish': return <TrendingDown className="w-5 h-5 text-red-400" />;
      default: return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 shadow-green-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/30 shadow-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 shadow-yellow-500/20';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30 shadow-blue-500/20';
      case 'bullish':
        return 'bg-green-500/10 border-green-500/30 shadow-green-500/20';
      case 'bearish':
        return 'bg-red-500/10 border-red-500/30 shadow-red-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/30 shadow-gray-500/20';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 w-80 space-y-3 max-h-[calc(100vh-100px)] overflow-y-auto">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getColorClasses(notification.type)} backdrop-blur-md border rounded-lg p-4 shadow-lg animate-in slide-in-from-right duration-300`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white mb-1">
                  {notification.title}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {notification.message}
                </p>
                <span className="text-xs text-gray-500 mt-2 block">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-white transition-colors ml-2 p-1 rounded-full hover:bg-white/10"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}