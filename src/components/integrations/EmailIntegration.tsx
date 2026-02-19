/**
 * 📧 AGENT_012: Email Notification System
 */

'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const EmailIntegration: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    portfolioUpdates: false,
    weeklyReports: true
  });

  const connectEmail = () => {
    if (email) {
      setIsConnected(true);
    }
  };

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-400" />
          Email Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Email Active</p>
                <p className="text-gray-400 text-sm">{email}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="space-y-2 text-sm">
              {Object.entries(notifications).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Configure email alerts and reports.</p>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
            <button
              onClick={connectEmail}
              disabled={!email}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
            >
              Setup Email Alerts
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailIntegration;