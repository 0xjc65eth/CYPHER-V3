// Serviço para gerar dados sociais e análise de sentimento para criptomoedas

export interface SocialMetric {
  platform: string;
  mentions: number;
  engagement: number;
  sentiment: number; // -100 to 100
  change24h: number;
  reach: number;
  topHashtags: string[];
  icon: string;
}

export interface InfluencerData {
  name: string;
  handle: string;
  platform: string;
  followers: number;
  engagement: number;
  sentiment: number;
  recentPost: string;
  postTimestamp: string;
  impact: number; // 0-100
  avatar?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  sentiment: number;
  impact: number;
  categories: string[];
  summary: string;
}

export interface SentimentAnalysis {
  overall: number; // -100 to 100
  bullish: number; // percentage
  bearish: number; // percentage
  neutral: number; // percentage
  change24h: number;
  volumeChange: number;
  priceCorrelation: number; // -1 to 1
  wordCloud: {
    word: string;
    count: number;
    sentiment: number;
  }[];
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  sentiment: number;
  change24h: number;
  relatedAssets: string[];
  category: string;
}

export interface SocialProjection {
  timeframe: '24h' | '7d' | '30d';
  sentimentProjection: number;
  priceImpact: number;
  confidence: number;
  factors: string[];
}

export interface SocialData {
  metrics: SocialMetric[];
  influencers: InfluencerData[];
  news: NewsItem[];
  sentiment: SentimentAnalysis;
  trendingTopics: TrendingTopic[];
  projections: SocialProjection[];
  lastUpdated: string;
}

// Função para gerar métricas sociais
function generateSocialMetrics(): SocialMetric[] {
  const platforms = [
    { name: 'Twitter', icon: '/icons/twitter.svg' },
    { name: 'Reddit', icon: '/icons/reddit.svg' },
    { name: 'Telegram', icon: '/icons/telegram.svg' },
    { name: 'Discord', icon: '/icons/discord.svg' },
    { name: 'YouTube', icon: '/icons/youtube.svg' },
    { name: 'TikTok', icon: '/icons/tiktok.svg' }
  ];
  
  const bitcoinHashtags = ['#Bitcoin', '#BTC', '#Crypto', '#Ordinals', '#Runes', '#HODL', '#ToTheMoon', '#Satoshi', '#BTCETFs', '#CryptoTrading'];
  
  return platforms.map(platform => {
    const baseMentions = platform.name === 'Twitter' ? 120000 :
                         platform.name === 'Reddit' ? 85000 :
                         platform.name === 'Telegram' ? 65000 :
                         platform.name === 'Discord' ? 45000 :
                         platform.name === 'YouTube' ? 30000 : 25000;
    
    const mentions = baseMentions;
    const engagement = 0;
    const sentiment = 0;
    const change24h = 0;
    const reach = 0;

    // Select first 3 hashtags
    const selectedHashtags = bitcoinHashtags.slice(0, 3);
    
    return {
      platform: platform.name,
      mentions,
      engagement,
      sentiment,
      change24h,
      reach,
      topHashtags: selectedHashtags,
      icon: platform.icon
    };
  });
}

// Função para gerar dados de influenciadores
function generateInfluencerData(): InfluencerData[] {
  const influencers = [
    { name: 'Elon Musk', handle: '@elonmusk', platform: 'Twitter', followers: 158000000, avatar: '/avatars/elon.jpg' },
    { name: 'Michael Saylor', handle: '@saylor', platform: 'Twitter', followers: 2800000, avatar: '/avatars/saylor.jpg' },
    { name: 'Vitalik Buterin', handle: '@VitalikButerin', platform: 'Twitter', followers: 4700000, avatar: '/avatars/vitalik.jpg' },
    { name: 'CZ Binance', handle: '@cz_binance', platform: 'Twitter', followers: 8500000, avatar: '/avatars/cz.jpg' },
    { name: 'Cathie Wood', handle: '@CathieDWood', platform: 'Twitter', followers: 1500000, avatar: '/avatars/cathie.jpg' },
    { name: 'Anthony Pompliano', handle: '@APompliano', platform: 'Twitter', followers: 1700000, avatar: '/avatars/pomp.jpg' },
    { name: 'Crypto Banter', handle: 'Crypto Banter', platform: 'YouTube', followers: 850000, avatar: '/avatars/banter.jpg' },
    { name: 'Coin Bureau', handle: 'Coin Bureau', platform: 'YouTube', followers: 2200000, avatar: '/avatars/bureau.jpg' },
    { name: 'r/Bitcoin', handle: 'r/Bitcoin', platform: 'Reddit', followers: 4900000, avatar: '/avatars/bitcoin.jpg' },
    { name: 'r/CryptoCurrency', handle: 'r/CryptoCurrency', platform: 'Reddit', followers: 5800000, avatar: '/avatars/cryptocurrency.jpg' }
  ];
  
  const recentPosts = [
    "Bitcoin is looking strong today! The fundamentals have never been better. #BTC",
    "Just increased my Bitcoin position. The future is bright for crypto.",
    "ETFs are changing the game for Bitcoin adoption. Institutional money is flowing in.",
    "The next Bitcoin halving will be a major catalyst. Prepare accordingly.",
    "Don't be distracted by short-term price action. Bitcoin is a long-term play.",
    "Ordinals and Runes are bringing new utility to Bitcoin. This is just the beginning.",
    "Smart money is accumulating Bitcoin at these levels. What are you doing?",
    "Bitcoin mining is becoming more decentralized. Great for the network!",
    "Layer 2 solutions will help Bitcoin scale. Exciting developments ahead.",
    "Bitcoin's volatility is decreasing as adoption increases. Bullish!"
  ];
  
  return influencers.map((influencer, index) => {
    const engagement = 0;
    const sentiment = 0;
    const impact = 0;
    const randomPost = recentPosts[0];
    const randomTime = new Date(Date.now() - 86400000).toISOString();
    
    return {
      name: influencer.name,
      handle: influencer.handle,
      platform: influencer.platform,
      followers: influencer.followers,
      engagement,
      sentiment,
      recentPost: randomPost,
      postTimestamp: randomTime,
      impact,
      avatar: influencer.avatar
    };
  }).sort((a, b) => b.impact - a.impact);
}

// Função para gerar itens de notícias
function generateNewsItems(): NewsItem[] {
  const newsTitles = [
    "Bitcoin ETFs See Record Inflows as Institutional Interest Grows",
    "Major Bank Announces Bitcoin Custody Services for Clients",
    "Bitcoin Mining Difficulty Reaches All-Time High",
    "New Legislation Could Impact Crypto Regulations",
    "Bitcoin Ordinals Surpass 10 Million Inscriptions",
    "Runes Protocol Gains Traction with Developers",
    "Bitcoin Lightning Network Capacity Hits New Record",
    "Central Banks Continue Gold Purchases Amid Bitcoin Rise",
    "Bitcoin Hashrate Recovers Following Recent Decline",
    "Analysts Predict Bitcoin Price Movement Based on On-Chain Metrics",
    "Major Retailer Announces Bitcoin Payment Integration",
    "Bitcoin Dominance Rises as Altcoins Struggle",
    "New Bitcoin Improvement Proposal Gains Community Support",
    "Bitcoin Conference Attracts Record Attendance",
    "Study Shows Increasing Bitcoin Adoption Among Millennials"
  ];
  
  const newsSources = ["CoinDesk", "Cointelegraph", "Bitcoin Magazine", "The Block", "Decrypt", "Bloomberg", "CNBC", "Forbes", "Reuters", "Wall Street Journal"];
  const categories = ["Markets", "Regulation", "Technology", "Adoption", "Mining", "NFTs", "DeFi", "Macro", "Security", "Innovation"];
  
  return newsTitles.map((title, index) => {
    const source = newsSources[0];
    const sentiment = 0;
    const impact = 0;
    const timestamp = new Date(Date.now() - 172800000).toISOString();

    // Select first category
    const selectedCategories = categories.slice(0, 1);
    
    // Generate a summary
    const summaries = [
      "The article discusses the growing institutional interest in Bitcoin ETFs, with record inflows reported in the past week.",
      "A comprehensive analysis of recent regulatory developments and their potential impact on the cryptocurrency market.",
      "The report highlights technological advancements in the Bitcoin ecosystem, focusing on scalability and security improvements.",
      "An in-depth look at Bitcoin mining operations and the increasing hashrate despite market volatility.",
      "The piece examines the correlation between Bitcoin price movements and macroeconomic factors.",
      "A detailed exploration of Ordinals and Runes protocols and their growing adoption within the Bitcoin community.",
      "The article analyzes on-chain metrics to predict potential price movements in the coming weeks.",
      "A discussion of Bitcoin's role as a store of value in the current economic climate.",
      "The report covers recent developments in Lightning Network adoption and its implications for Bitcoin scalability.",
      "An examination of changing sentiment among retail and institutional investors regarding Bitcoin."
    ];
    
    return {
      id: `NEWS-${index + 1}`,
      title,
      source,
      url: `https://example.com/news/${index + 1}`,
      timestamp,
      sentiment,
      impact,
      categories: selectedCategories,
      summary: summaries[0]
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Função para gerar análise de sentimento
function generateSentimentAnalysis(): SentimentAnalysis {
  const overall = 0;
  const bullish = 0;
  const bearish = 0;
  const neutral = 0;
  const change24h = 0;
  const volumeChange = 0;
  const priceCorrelation = 0;

  // Gerar nuvem de palavras
  const words = [
    "Bitcoin", "ETF", "Bullish", "Bearish", "Halving", "Mining", "Adoption",
    "Regulation", "Institutional", "Volatility", "HODL", "Ordinals", "Runes",
    "Lightning", "Scalability", "Security", "Decentralization", "Inflation",
    "Store of Value", "Digital Gold", "Satoshi", "Blockchain", "Hash Rate",
    "Difficulty", "Wallet", "Exchange", "Trading", "Investment", "Future"
  ];

  const wordCloud = words.map(word => {
    return {
      word,
      count: 0,
      sentiment: 0
    };
  });
  
  return {
    overall,
    bullish,
    bearish,
    neutral,
    change24h,
    volumeChange,
    priceCorrelation,
    wordCloud
  };
}

// Função para gerar tópicos em tendência
function generateTrendingTopics(): TrendingTopic[] {
  const topics = [
    { topic: "Bitcoin ETFs", category: "Investment" },
    { topic: "Halving Countdown", category: "Event" },
    { topic: "Ordinals NFTs", category: "Technology" },
    { topic: "Runes Protocol", category: "Technology" },
    { topic: "Mining Profitability", category: "Mining" },
    { topic: "Institutional Adoption", category: "Adoption" },
    { topic: "Regulatory Developments", category: "Regulation" },
    { topic: "Lightning Network", category: "Scaling" },
    { topic: "Bitcoin Reserve Currency", category: "Macro" },
    { topic: "Bitcoin vs Gold", category: "Investment" },
    { topic: "Self-Custody", category: "Security" },
    { topic: "Bitcoin Development", category: "Technology" }
  ];
  
  const assets = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];
  
  return topics.map(topic => {
    const mentions = 0;
    const sentiment = 0;
    const change24h = 0;

    // Select first asset
    const selectedAssets = assets.slice(0, 1);
    
    return {
      topic: topic.topic,
      mentions,
      sentiment,
      change24h,
      relatedAssets: selectedAssets,
      category: topic.category
    };
  }).sort((a, b) => b.mentions - a.mentions);
}

// Função para gerar projeções sociais
function generateSocialProjections(): SocialProjection[] {
  const timeframes: ('24h' | '7d' | '30d')[] = ['24h', '7d', '30d'];
  
  const factorSets = [
    ["Increasing institutional mentions", "Positive regulatory news", "Growing retail interest"],
    ["ETF inflow discussions", "Technical analysis sentiment", "Halving anticipation"],
    ["Macro economic concerns", "Whale movement discussions", "Mining profitability debates"],
    ["Ordinals and Runes adoption", "Layer 2 development interest", "Security enhancement discussions"],
    ["Market cycle narratives", "Altcoin rotation sentiment", "New use case exploration"]
  ];
  
  return timeframes.map(timeframe => {
    const sentimentProjection = 0;
    const priceImpact = 0;
    const confidence = 0;

    // Select first set of factors
    const selectedFactors = factorSets[0];
    
    return {
      timeframe,
      sentimentProjection,
      priceImpact,
      confidence,
      factors: selectedFactors
    };
  });
}

import { 
  getTwitterMetrics, 
  getTwitterInfluencers, 
  getTwitterTrendingTopics, 
  getTwitterSentimentAnalysis 
} from './twitter-api-service';

// Função principal para gerar todos os dados
export async function generateSocialData(): Promise<SocialData> {
  try {
    // Tentar obter dados reais da API do Twitter
    const [twitterMetrics, twitterInfluencers, twitterTrendingTopics, twitterSentiment] = await Promise.all([
      getTwitterMetrics(),
      getTwitterInfluencers(),
      getTwitterTrendingTopics(),
      getTwitterSentimentAnalysis()
    ]);
    
    // Combinar dados reais com dados simulados para outras plataformas
    const metrics = [
      twitterMetrics,
      ...generateSocialMetrics().filter(metric => metric.platform !== 'Twitter')
    ];
    
    // Combinar influenciadores reais com simulados
    const influencers = [
      ...twitterInfluencers,
      ...generateInfluencerData().filter(inf => !twitterInfluencers.some(ti => ti.handle === inf.handle))
    ].slice(0, 10); // Limitar a 10 influenciadores
    
    // Combinar tópicos em tendência reais com simulados
    const trendingTopics = [
      ...twitterTrendingTopics,
      ...generateTrendingTopics().filter(tt => !twitterTrendingTopics.some(ttt => ttt.topic === tt.topic))
    ].slice(0, 12); // Limitar a 12 tópicos
    
    return {
      metrics,
      influencers,
      news: generateNewsItems(),
      sentiment: twitterSentiment,
      trendingTopics,
      projections: generateSocialProjections(),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating social data with Twitter API:', error);
    // Fallback para dados simulados em caso de erro
    return {
      metrics: generateSocialMetrics(),
      influencers: generateInfluencerData(),
      news: generateNewsItems(),
      sentiment: generateSentimentAnalysis(),
      trendingTopics: generateTrendingTopics(),
      projections: generateSocialProjections(),
      lastUpdated: new Date().toISOString()
    };
  }
}

// Singleton para manter os dados consistentes entre chamadas
let socialDataInstance: SocialData | null = null;
let isGeneratingData = false;
let lastGeneratedTime = 0;

export async function getSocialData(): Promise<SocialData> {
  // Se já estamos gerando dados, retornar os dados existentes ou dados simulados
  if (isGeneratingData) {
    return socialDataInstance || {
      metrics: generateSocialMetrics(),
      influencers: generateInfluencerData(),
      news: generateNewsItems(),
      sentiment: generateSentimentAnalysis(),
      trendingTopics: generateTrendingTopics(),
      projections: generateSocialProjections(),
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Se não temos dados ou se passaram mais de 5 minutos desde a última atualização
  if (!socialDataInstance || Date.now() - lastGeneratedTime > 5 * 60 * 1000) {
    try {
      isGeneratingData = true;
      socialDataInstance = await generateSocialData();
      lastGeneratedTime = Date.now();
    } catch (error) {
      console.error('Error getting social data:', error);
    } finally {
      isGeneratingData = false;
    }
  }
  
  return socialDataInstance || {
    metrics: generateSocialMetrics(),
    influencers: generateInfluencerData(),
    news: generateNewsItems(),
    sentiment: generateSentimentAnalysis(),
    trendingTopics: generateTrendingTopics(),
    projections: generateSocialProjections(),
    lastUpdated: new Date().toISOString()
  };
}

// Função para atualizar os dados (pode ser chamada periodicamente)
export async function refreshSocialData(): Promise<SocialData> {
  try {
    isGeneratingData = true;
    socialDataInstance = await generateSocialData();
    lastGeneratedTime = Date.now();
  } catch (error) {
    console.error('Error refreshing social data:', error);
  } finally {
    isGeneratingData = false;
  }
  
  return socialDataInstance || {
    metrics: generateSocialMetrics(),
    influencers: generateInfluencerData(),
    news: generateNewsItems(),
    sentiment: generateSentimentAnalysis(),
    trendingTopics: generateTrendingTopics(),
    projections: generateSocialProjections(),
    lastUpdated: new Date().toISOString()
  };
}
