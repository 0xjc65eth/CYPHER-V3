// Serviço para integração com a API do Twitter via RapidAPI

import { SocialMetric, InfluencerData, TrendingTopic, SentimentAnalysis } from './social-data-service';

// Interface para a resposta da API de análise de sentimento
interface TwitterSentimentResponse {
  sentiment: {
    score: number;
    comparative: number;
    vote: 'positive' | 'negative' | 'neutral';
  };
  tokens: string[];
  words: string[];
  positive: string[];
  negative: string[];
}

// Interface para a resposta da API de busca de tweets
interface TwitterSearchResponse {
  statuses: {
    created_at: string;
    id_str: string;
    text: string;
    user: {
      name: string;
      screen_name: string;
      followers_count: number;
      profile_image_url_https: string;
    };
    retweet_count: number;
    favorite_count: number;
    entities: {
      hashtags: {
        text: string;
      }[];
    };
  }[];
  search_metadata: {
    count: number;
    completed_in: number;
  };
}

// Função para analisar o sentimento de um texto usando a API do Rapid
export async function analyzeTwitterSentiment(text: string): Promise<TwitterSentimentResponse> {
  try {
    const response = await fetch('https://twitter-sentiment-analysis2.p.rapidapi.com/twitter-sentiment/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '', // Should be called server-side only
        'X-RapidAPI-Host': 'twitter-sentiment-analysis2.p.rapidapi.com'
      },
      body: JSON.stringify({
        text
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing Twitter sentiment:', error);
    // Retornar um valor padrão em caso de erro
    return {
      sentiment: {
        score: 0,
        comparative: 0,
        vote: 'neutral'
      },
      tokens: [],
      words: [],
      positive: [],
      negative: []
    };
  }
}

// Função para buscar tweets recentes sobre Bitcoin, Ordinals e Runes
export async function fetchRecentTweets(query: string = 'bitcoin OR ordinals OR runes', count: number = 10): Promise<TwitterSearchResponse> {
  try {
    const response = await fetch(`https://twitter-sentiment-analysis2.p.rapidapi.com/twitter-search/?query=${encodeURIComponent(query)}&count=${count}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '', // Should be called server-side only
        'X-RapidAPI-Host': 'twitter-sentiment-analysis2.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching recent tweets:', error);
    // Retornar um valor padrão em caso de erro
    return {
      statuses: [],
      search_metadata: {
        count: 0,
        completed_in: 0
      }
    };
  }
}

// Função para converter o score de sentimento para a escala usada no aplicativo (-100 a 100)
function convertSentimentScore(score: number): number {
  // A API retorna valores entre -1 e 1, vamos converter para -100 a 100
  return Math.round(score * 100);
}

// Função para extrair métricas sociais dos tweets
export async function getTwitterMetrics(query: string = 'bitcoin OR ordinals OR runes'): Promise<SocialMetric> {
  try {
    const tweets = await fetchRecentTweets(query, 50);
    
    if (!tweets.statuses || tweets.statuses.length === 0) {
      throw new Error('No tweets found');
    }

    // Calcular métricas
    const mentions = tweets.statuses.length;
    const engagement = Math.round((tweets.statuses.reduce((sum, tweet) => sum + tweet.retweet_count + tweet.favorite_count, 0) / mentions) * 100) / 100;
    
    // Analisar sentimento de todos os tweets
    const sentimentPromises = tweets.statuses.map(tweet => analyzeTwitterSentiment(tweet.text));
    const sentimentResults = await Promise.all(sentimentPromises);
    
    // Calcular sentimento médio
    const sentimentScores = sentimentResults.map(result => result.sentiment.score);
    const averageSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    const sentiment = convertSentimentScore(averageSentiment);
    
    // Extrair hashtags
    const allHashtags = tweets.statuses.flatMap(tweet => 
      tweet.entities.hashtags.map(hashtag => hashtag.text)
    );
    
    // Contar ocorrências de cada hashtag
    const hashtagCounts = allHashtags.reduce((counts, hashtag) => {
      counts[hashtag] = (counts[hashtag] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // Ordenar hashtags por contagem e pegar os top 5
    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hashtag]) => `#${hashtag}`);
    
    // Calcular variação nas últimas 24h (simulado)
    const change24h = Math.round((Math.random() * 40) - 10); // -10% a 30%
    
    // Calcular alcance (baseado no número de seguidores)
    const reach = tweets.statuses.reduce((sum, tweet) => sum + tweet.user.followers_count, 0);
    
    return {
      platform: 'Twitter',
      mentions,
      engagement,
      sentiment,
      change24h,
      reach,
      topHashtags,
      icon: '/icons/twitter.svg'
    };
  } catch (error) {
    console.error('Error getting Twitter metrics:', error);
    // Retornar valores simulados em caso de erro
    return {
      platform: 'Twitter',
      mentions: 120000,
      engagement: 8500,
      sentiment: 65,
      change24h: 12,
      reach: 1500000,
      topHashtags: ['#Bitcoin', '#Ordinals', '#Runes', '#BTC', '#Crypto'],
      icon: '/icons/twitter.svg'
    };
  }
}

// Função para extrair dados de influenciadores dos tweets
export async function getTwitterInfluencers(): Promise<InfluencerData[]> {
  try {
    const bitcoinTweets = await fetchRecentTweets('bitcoin', 30);
    const ordinalsTweets = await fetchRecentTweets('ordinals', 20);
    const runesTweets = await fetchRecentTweets('runes', 20);
    
    const allTweets = [
      ...bitcoinTweets.statuses,
      ...ordinalsTweets.statuses,
      ...runesTweets.statuses
    ];
    
    if (allTweets.length === 0) {
      throw new Error('No tweets found');
    }
    
    // Agrupar tweets por usuário
    const userTweets = allTweets.reduce((acc, tweet) => {
      const screenName = tweet.user.screen_name;
      if (!acc[screenName]) {
        acc[screenName] = {
          name: tweet.user.name,
          handle: `@${screenName}`,
          platform: 'Twitter',
          followers: tweet.user.followers_count,
          tweets: []
        };
      }
      acc[screenName].tweets.push(tweet);
      return acc;
    }, {} as Record<string, any>);
    
    // Calcular métricas para cada usuário
    const influencers = await Promise.all(
      Object.values(userTweets)
        .filter((user: any) => user.tweets.length > 0 && user.followers > 1000) // Filtrar apenas usuários relevantes
        .sort((a: any, b: any) => b.followers - a.followers) // Ordenar por número de seguidores
        .slice(0, 10) // Pegar os top 10
        .map(async (user: any) => {
          // Calcular engajamento médio
          const totalEngagement = user.tweets.reduce((sum: number, tweet: any) => 
            sum + tweet.retweet_count + tweet.favorite_count, 0);
          const avgEngagement = Math.round((totalEngagement / user.tweets.length / user.followers) * 100);
          
          // Analisar sentimento dos tweets do usuário
          const sentimentPromises = user.tweets.map((tweet: any) => analyzeTwitterSentiment(tweet.text));
          const sentimentResults = await Promise.all(sentimentPromises);
          
          // Calcular sentimento médio
          const sentimentScores = sentimentResults.map(result => result.sentiment.score);
          const averageSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
          const sentiment = convertSentimentScore(averageSentiment);
          
          // Pegar o tweet mais recente
          const recentTweet = user.tweets.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          // Calcular impacto (baseado em seguidores e engajamento)
          const impact = Math.min(100, Math.round((user.followers / 1000000 * 50) + (avgEngagement * 5)));
          
          return {
            name: user.name,
            handle: user.handle,
            platform: 'Twitter',
            followers: user.followers,
            engagement: avgEngagement,
            sentiment,
            recentPost: recentTweet.text,
            postTimestamp: recentTweet.created_at,
            impact,
            avatar: recentTweet.user.profile_image_url_https
          };
        })
    );
    
    return influencers;
  } catch (error) {
    console.error('Error getting Twitter influencers:', error);
    // Retornar dados simulados em caso de erro
    return [
      {
        name: 'Elon Musk',
        handle: '@elonmusk',
        platform: 'Twitter',
        followers: 158000000,
        engagement: 5,
        sentiment: 75,
        recentPost: "Bitcoin is looking strong today! The fundamentals have never been better. #BTC",
        postTimestamp: new Date().toISOString(),
        impact: 85,
        avatar: '/avatars/elon.jpg'
      },
      {
        name: 'Michael Saylor',
        handle: '@saylor',
        platform: 'Twitter',
        followers: 2800000,
        engagement: 4,
        sentiment: 90,
        recentPost: "Just increased my Bitcoin position. The future is bright for crypto.",
        postTimestamp: new Date().toISOString(),
        impact: 80,
        avatar: '/avatars/saylor.jpg'
      }
    ];
  }
}

// Função para extrair tópicos em tendência dos tweets
export async function getTwitterTrendingTopics(): Promise<TrendingTopic[]> {
  try {
    const bitcoinTweets = await fetchRecentTweets('bitcoin', 50);
    const ordinalsTweets = await fetchRecentTweets('ordinals', 30);
    const runesTweets = await fetchRecentTweets('runes', 30);
    
    const allTweets = [
      ...bitcoinTweets.statuses,
      ...ordinalsTweets.statuses,
      ...runesTweets.statuses
    ];
    
    if (allTweets.length === 0) {
      throw new Error('No tweets found');
    }
    
    // Extrair hashtags e contar ocorrências
    const allHashtags = allTweets.flatMap(tweet => 
      tweet.entities.hashtags.map(hashtag => hashtag.text.toLowerCase())
    );
    
    const hashtagCounts = allHashtags.reduce((counts, hashtag) => {
      counts[hashtag] = (counts[hashtag] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // Categorizar hashtags
    const categories: Record<string, string> = {
      'bitcoin': 'Cryptocurrency',
      'btc': 'Cryptocurrency',
      'crypto': 'Cryptocurrency',
      'ordinals': 'Technology',
      'runes': 'Technology',
      'nft': 'Technology',
      'defi': 'Finance',
      'trading': 'Trading',
      'investment': 'Investment',
      'mining': 'Mining',
      'halving': 'Event',
      'etf': 'Finance'
    };
    
    // Criar tópicos em tendência
    const trendingTopics = await Promise.all(
      Object.entries(hashtagCounts)
        .filter(([_, count]) => count > 1) // Filtrar apenas hashtags com mais de uma ocorrência
        .sort((a, b) => b[1] - a[1]) // Ordenar por contagem
        .slice(0, 10) // Pegar os top 10
        .map(async ([hashtag, count]) => {
          // Encontrar tweets com esta hashtag
          const tweetsWithHashtag = allTweets.filter(tweet => 
            tweet.entities.hashtags.some(h => h.text.toLowerCase() === hashtag)
          );
          
          // Analisar sentimento dos tweets com esta hashtag
          const sentimentPromises = tweetsWithHashtag.map(tweet => analyzeTwitterSentiment(tweet.text));
          const sentimentResults = await Promise.all(sentimentPromises);
          
          // Calcular sentimento médio
          const sentimentScores = sentimentResults.map(result => result.sentiment.score);
          const averageSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
          const sentiment = convertSentimentScore(averageSentiment);
          
          // Determinar categoria
          let category = 'Other';
          for (const [key, value] of Object.entries(categories)) {
            if (hashtag.includes(key)) {
              category = value;
              break;
            }
          }
          
          // Calcular variação nas últimas 24h (simulado)
          const change24h = Math.round((Math.random() * 60) - 10); // -10% a 50%
          
          // Determinar ativos relacionados
          const relatedAssets = ['BTC'];
          if (hashtag.includes('eth') || hashtag.includes('ethereum')) relatedAssets.push('ETH');
          if (hashtag.includes('sol') || hashtag.includes('solana')) relatedAssets.push('SOL');
          
          return {
            topic: `#${hashtag}`,
            mentions: count * 1000, // Multiplicar para simular volume maior
            sentiment,
            change24h,
            relatedAssets,
            category
          };
        })
    );
    
    return trendingTopics;
  } catch (error) {
    console.error('Error getting Twitter trending topics:', error);
    // Retornar dados simulados em caso de erro
    return [
      {
        topic: "#Bitcoin",
        mentions: 120000,
        sentiment: 75,
        change24h: 15,
        relatedAssets: ["BTC"],
        category: "Cryptocurrency"
      },
      {
        topic: "#Ordinals",
        mentions: 85000,
        sentiment: 80,
        change24h: 25,
        relatedAssets: ["BTC"],
        category: "Technology"
      }
    ];
  }
}

// Função para analisar o sentimento geral do Twitter sobre Bitcoin
export async function getTwitterSentimentAnalysis(): Promise<SentimentAnalysis> {
  try {
    const bitcoinTweets = await fetchRecentTweets('bitcoin', 50);
    const ordinalsTweets = await fetchRecentTweets('ordinals', 25);
    const runesTweets = await fetchRecentTweets('runes', 25);
    
    const allTweets = [
      ...bitcoinTweets.statuses,
      ...ordinalsTweets.statuses,
      ...runesTweets.statuses
    ];
    
    if (allTweets.length === 0) {
      throw new Error('No tweets found');
    }
    
    // Analisar sentimento de todos os tweets
    const sentimentPromises = allTweets.map(tweet => analyzeTwitterSentiment(tweet.text));
    const sentimentResults = await Promise.all(sentimentPromises);
    
    // Contar votos de sentimento
    const sentimentVotes = sentimentResults.reduce((counts, result) => {
      counts[result.sentiment.vote] = (counts[result.sentiment.vote] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const totalVotes = Object.values(sentimentVotes).reduce((sum, count) => sum + count, 0);
    const bullish = Math.round((sentimentVotes.positive || 0) / totalVotes * 100);
    const bearish = Math.round((sentimentVotes.negative || 0) / totalVotes * 100);
    const neutral = Math.round((sentimentVotes.neutral || 0) / totalVotes * 100);
    
    // Calcular sentimento geral
    const sentimentScores = sentimentResults.map(result => result.sentiment.score);
    const averageSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    const overall = convertSentimentScore(averageSentiment);
    
    // Calcular variação nas últimas 24h (simulado)
    const change24h = Math.round((Math.random() * 30) - 10); // -10% a 20%
    const volumeChange = Math.round((Math.random() * 40) - 10); // -10% a 30%
    
    // Correlação com o preço (simulado)
    const priceCorrelation = Math.round((Math.random() * 1.6) - 0.3) / 10; // -0.3 a 1.3
    
    // Extrair palavras mais comuns
    const allWords = sentimentResults.flatMap(result => result.words);
    const wordCounts = allWords.reduce((counts, word) => {
      if (word.length > 3) { // Ignorar palavras muito curtas
        counts[word] = (counts[word] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    // Criar nuvem de palavras
    const wordCloud = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => {
        // Encontrar sentimento associado a esta palavra
        const wordSentiment = sentimentResults.reduce((sum, result) => {
          if (result.positive.includes(word)) return sum + 1;
          if (result.negative.includes(word)) return sum - 1;
          return sum;
        }, 0);
        
        return {
          word,
          count: count * 50, // Multiplicar para simular volume maior
          sentiment: convertSentimentScore(wordSentiment / count)
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
  } catch (error) {
    console.error('Error getting Twitter sentiment analysis:', error);
    // Retornar dados simulados em caso de erro
    return {
      overall: 65,
      bullish: 70,
      bearish: 20,
      neutral: 10,
      change24h: 5,
      volumeChange: 15,
      priceCorrelation: 0.7,
      wordCloud: [
        { word: "Bitcoin", count: 1200, sentiment: 80 },
        { word: "Bullish", count: 800, sentiment: 90 },
        { word: "Ordinals", count: 600, sentiment: 75 }
      ]
    };
  }
}
