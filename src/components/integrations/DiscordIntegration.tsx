/**
 * 🎮 AGENT_008: Discord Bot Connector
 */

'use client';

import React, { useState } from 'react';
import { MessageCircle, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const DiscordIntegration: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [serverId, setServerId] = useState('');
  const [channelId, setChannelId] = useState('');

  const connectDiscord = async () => {
    try {
      // Simulate Discord bot connection
      if (serverId && channelId) {
        setIsConnected(true);
        // Here would be actual Discord API integration
      }
    } catch (error) {
      console.error('Discord connection failed:', error);
    }
  };

  const disconnectDiscord = () => {
    setIsConnected(false);
    setServerId('');
    setChannelId('');
  };

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-400" />
          Discord Integration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Bot Connected</p>
                <p className="text-gray-400 text-sm">Notifications active</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <button
              onClick={disconnectDiscord}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Disconnect Bot
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Connect Discord bot for alerts and notifications.</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Server ID"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <input
                type="text"
                placeholder="Channel ID"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <button
              onClick={connectDiscord}
              disabled={!serverId || !channelId}
              className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded text-sm"
            >
              Connect Discord Bot
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscordIntegration;