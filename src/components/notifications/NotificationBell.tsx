'use client';

import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function NotificationBell() {
  const context = useNotifications() as any;
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead = () => {},
    markAllAsRead = () => {},
    clearAll = context?.clearNotifications || (() => {}),
    settings = {
      soundEnabled: true,
      priceAlerts: true,
      arbitrageAlerts: true,
      neuralInsights: true,
      showDesktopNotifications: true
    },
    updateSettings = () => {}
  } = context || {};

  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-gray-900 border border-orange-500/20 rounded-lg shadow-xl z-50"
          >
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {showSettings ? (
              <div className="p-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Notification Settings</h4>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Sound Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Price Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.priceAlerts}
                    onChange={(e) => updateSettings({ priceAlerts: e.target.checked })}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Arbitrage Opportunities</span>
                  <input
                    type="checkbox"
                    checked={settings.arbitrageAlerts}
                    onChange={(e) => updateSettings({ arbitrageAlerts: e.target.checked })}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Neural Insights</span>
                  <input
                    type="checkbox"
                    checked={settings.neuralInsights}
                    onChange={(e) => updateSettings({ neuralInsights: e.target.checked })}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Desktop Notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.showDesktopNotifications}
                    onChange={(e) => updateSettings({ showDesktopNotifications: e.target.checked })}
                    className="toggle"
                  />
                </label>
              </div>
            ) : (
              <>
                <div className="max-h-96 overflow-y-auto">
                  {recentNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    recentNotifications.map((notification: any) => {
                      const notifId = notification.id;
                      const notifRead = notification.read ?? false;
                      const notifTimestamp = notification.timestamp || Date.now();

                      return (
                      <div
                        key={notifId}
                        className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer ${
                          !notifRead ? 'bg-orange-500/5' : ''
                        }`}
                        onClick={() => markAsRead(notifId)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(notifTimestamp).toLocaleTimeString()}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{notification.title}</h4>
                            <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                          </div>
                          {!notifRead && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          )}
                        </div>
                      </div>
                    )})
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-800 flex items-center justify-between">
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-orange-500 hover:text-orange-400"
                    >
                      Mark all as read
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}