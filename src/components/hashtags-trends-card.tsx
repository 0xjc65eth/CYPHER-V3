import { DashboardCard } from './dashboard-card'

function HashtagsTrendsCard({ data }: { data: any[] }) {
  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case 'Twitter':
        return {
          bg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20',
          border: 'border-blue-500/30',
          text: 'text-blue-400'
        };
      case 'Reddit':
        return {
          bg: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20',
          border: 'border-orange-500/30',
          text: 'text-orange-400'
        };
      case 'Telegram':
        return {
          bg: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20',
          border: 'border-cyan-500/30',
          text: 'text-cyan-400'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500/20 to-gray-600/20',
          border: 'border-gray-500/30',
          text: 'text-gray-400'
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

  const getHashtagColor = (index: number) => {
    const colors = [
      'text-purple-400',
      'text-blue-400',
      'text-cyan-400',
      'text-green-400',
      'text-yellow-400',
      'text-orange-400',
      'text-rose-400',
      'text-pink-400'
    ];
    return colors[index % colors.length];
  };

  return (
    <DashboardCard
      title="Top Hashtags & Trends"
      subtitle="Real-time analysis of trending topics across platforms"
      colorScheme="purple"
      headerRight={
        <div className="flex items-center gap-2">
          <select className="bg-slate-800/80 border border-purple-500/30 text-gray-200 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500/50">
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
        </div>
      }
    >
      <div className="overflow-hidden">
        <div className="grid grid-cols-12 text-xs font-medium text-gray-300 border-b border-slate-700/30 pb-3 mb-3">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Hashtag/Topic</div>
          <div className="col-span-2">Platform</div>
          <div className="col-span-2">Volume</div>
          <div className="col-span-2">Sentiment</div>
          <div className="col-span-2 text-right">Change</div>
        </div>

        <div className="space-y-2">
          {data.map((item, index) => {
            const platformColors = getPlatformColors(item.platform);
            const sentimentColors = getSentimentColors(item.sentiment);
            const hashtagColor = getHashtagColor(index);

            return (
              <div
                key={index}
                className="grid grid-cols-12 items-center py-2.5 px-2 text-sm hover:bg-slate-800/30 rounded-lg transition-all"
              >
                <div className="col-span-1 text-gray-400 font-bold">{index + 1}</div>
                <div className={`col-span-3 font-bold ${hashtagColor}`}>#{item.hashtag}</div>
                <div className="col-span-2">
                  <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs ${platformColors.bg} border ${platformColors.border} ${platformColors.text}`}>
                    {item.platform}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="w-full bg-slate-700/50 rounded-full h-2 p-0.5">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${item.volume}%` }}
                    >
                      <div className="w-full h-full bg-white/30 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs ${sentimentColors.bg} border ${sentimentColors.border} ${sentimentColors.text}`}>
                    {sentimentColors.icon}
                    {item.sentiment}
                  </div>
                </div>
                <div className={`col-span-2 text-right font-medium ${
                  item.change > 0 ? 'text-green-400' :
                  item.change < 0 ? 'text-rose-400' :
                  'text-gray-400'
                }`}>
                  {item.change > 0 ? (
                    <div className="inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      +{item.change}
                    </div>
                  ) : item.change < 0 ? (
                    <div className="inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                      {item.change}
                    </div>
                  ) : (
                    <div className="inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                      {item.change}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
                <span className="text-gray-300">Bullish</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500"></div>
                <span className="text-gray-300">Neutral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-500 to-red-500"></div>
                <span className="text-gray-300">Bearish</span>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/social-analytics'}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg transition-colors"
            >
              View all trends
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-700/30 text-xs text-gray-300 flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Data from 12+ social platforms
          </span>
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </DashboardCard>
  )
}

export { HashtagsTrendsCard }
