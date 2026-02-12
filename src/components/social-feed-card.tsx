import { DashboardCard } from './dashboard-card'

function SocialFeedCard({ posts }: { posts: any[] }) {
  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case 'Twitter':
        return {
          bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
          border: 'border-blue-500/30',
          hover: 'hover:border-blue-500/50',
          shadow: 'shadow-blue-500/20'
        };
      case 'Reddit':
        return {
          bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
          border: 'border-orange-500/30',
          hover: 'hover:border-orange-500/50',
          shadow: 'shadow-orange-500/20'
        };
      case 'Telegram':
        return {
          bg: 'bg-gradient-to-br from-cyan-500 to-blue-500',
          border: 'border-cyan-500/30',
          hover: 'hover:border-cyan-500/50',
          shadow: 'shadow-cyan-500/20'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
          border: 'border-indigo-500/30',
          hover: 'hover:border-indigo-500/50',
          shadow: 'shadow-indigo-500/20'
        };
    }
  };

  const getSentimentColors = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish':
        return {
          bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
          border: 'border-green-500/30',
          text: 'text-green-400',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )
        };
      case 'Neutral':
        return {
          bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          )
        };
      case 'Bearish':
        return {
          bg: 'bg-gradient-to-r from-rose-500/20 to-red-500/20',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          )
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500/20 to-gray-600/20',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          icon: null
        };
    }
  };

  const getAvatarGradient = (username: string) => {
    if (username.startsWith('@BTC')) {
      return 'bg-gradient-to-br from-orange-500 to-yellow-600';
    } else if (username.startsWith('@Ordinals')) {
      return 'bg-gradient-to-br from-blue-500 to-indigo-600';
    } else if (username.startsWith('@Runes')) {
      return 'bg-gradient-to-br from-green-500 to-emerald-600';
    } else {
      return 'bg-gradient-to-br from-purple-500 to-pink-600';
    }
  };

  return (
    <DashboardCard
      title="Social Feed (Realtime)"
      subtitle="Top influencer posts and market impact"
      colorScheme="pink"
      headerRight={
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 rounded-lg text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Refreshed every 60s
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {posts.map((post, index) => {
          const platformColors = getPlatformColors(post.platform);
          const sentimentColors = getSentimentColors(post.sentiment);
          const avatarGradient = getAvatarGradient(post.username);

          return (
            <div
              key={index}
              className={`bg-slate-800/50 border ${platformColors.border} ${platformColors.hover} rounded-xl p-4 transition-all ${platformColors.shadow} shadow-lg hover:shadow-xl`}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className={`w-12 h-12 rounded-xl ${avatarGradient} flex items-center justify-center text-lg font-bold text-white shadow-lg`}>
                  {post.username.charAt(1).toUpperCase()}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-base">{post.username}</div>
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <div className={`px-2 py-1 ${platformColors.bg} rounded-lg text-white font-medium`}>
                          {post.platform}
                        </div>
                        <div className={`px-2 py-1 rounded-lg ${sentimentColors.bg} border ${sentimentColors.border} ${sentimentColors.text} flex items-center`}>
                          {sentimentColors.icon}
                          {post.sentiment}
                        </div>
                        <div className="text-gray-400">{post.time} ago</div>
                      </div>
                    </div>

                    {post.trending && (
                      <div className="px-3 py-1 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 text-pink-400 rounded-lg text-xs flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Trending
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4 px-2 py-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                {post.hashtags.map((tag: string, i: number) => {
                  const colors = [
                    'text-blue-400 hover:text-blue-300',
                    'text-purple-400 hover:text-purple-300',
                    'text-pink-400 hover:text-pink-300',
                    'text-cyan-400 hover:text-cyan-300',
                    'text-green-400 hover:text-green-300',
                    'text-orange-400 hover:text-orange-300'
                  ];
                  const tagColor = colors[i % colors.length];

                  return (
                    <button
                      key={i}
                      onClick={() => window.location.href = `/search?tag=${encodeURIComponent(tag)}`}
                      className={`inline-block mr-3 ${tagColor} font-medium transition-colors cursor-pointer`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {post.likes.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {post.comments.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {post.shares.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => post.url && window.open(post.url, '_blank')}
                  className="text-xs text-pink-400 hover:text-pink-300 px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-lg transition-colors flex items-center gap-1"
                >
                  View original post
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/30">
                <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3 hover:border-pink-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="text-xs text-gray-300">Followers</div>
                  </div>
                  <div className="text-lg font-bold text-white">{post.followers.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3 hover:border-pink-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <div className="text-xs text-gray-300">Influence Score</div>
                  </div>
                  <div className="text-lg font-bold text-white">{post.influenceScore}/10</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3 hover:border-pink-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div className="text-xs text-gray-300">Market Impact</div>
                  </div>
                  <div className={`text-lg font-bold ${
                    post.marketImpact.startsWith('+') ? 'text-green-400' : 'text-rose-400'
                  }`}>{post.marketImpact}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-700/30 text-xs text-gray-300 flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          Neural system analysis of social impact
        </span>
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Updated: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </DashboardCard>
  )
}

export { SocialFeedCard }
