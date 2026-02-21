/**
 * 🔗 AGENT_007: GitHub OAuth Integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Github, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const GitHubIntegration: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      // Fetch token from server-side session instead of localStorage (XSS-safe)
      const tokenRes = await fetch('/api/auth/github/token');
      if (!tokenRes.ok) return;
      const { token } = await tokenRes.json();
      if (token) {
        const response = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsConnected(true);
        }
      }
    } catch (err) {
      console.error('GitHub connection check failed:', err);
    }
  };

  const connectGitHub = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'demo_client_id';
      const redirectUri = `${window.location.origin}/api/auth/github/callback`;
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email,repo`;
      
      const popup = window.open(githubAuthUrl, 'github-oauth', 'width=600,height=600');
      
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          checkGitHubConnection();
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      setIsConnecting(false);
    }
  };

  const disconnectGitHub = async () => {
    try {
      await fetch('/api/auth/github/token', { method: 'DELETE' });
    } catch (err) {
      console.error('GitHub disconnect failed:', err);
    }
    setUser(null);
    setIsConnected(false);
  };  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5 text-gray-400" />
          GitHub Integration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected && user ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full" />
              <div>
                <p className="font-semibold text-white text-sm">{user.name || user.login}</p>
                <p className="text-xs text-gray-400">@{user.login}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
            </div>
            <button
              onClick={disconnectGitHub}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Connect GitHub for development metrics.</p>
            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={connectGitHub}
              disabled={isConnecting}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center justify-center space-x-2"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              <span>{isConnecting ? 'Connecting...' : 'Connect GitHub'}</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GitHubIntegration;