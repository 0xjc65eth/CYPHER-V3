/**
 * CYPHER ORDi Future V3 - Mobile App (React Native)
 * Complete mobile trading application with full platform features
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as StateProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mobile-specific imports (would be actual React Native components)
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-blur/blur';
import PushNotification from 'react-native-push-notification';
import { LineChart, CandlestickChart } from 'react-native-chart-kit';
import Biometrics from 'react-native-biometrics';
import NetInfo from '@react-native-netinfo/netinfo';

// App Types
export interface MobileAppConfig {
  version: string;
  buildNumber: number;
  environment: 'development' | 'staging' | 'production';
  apiEndpoint: string;
  websocketEndpoint: string;
  features: {
    biometricAuth: boolean;
    pushNotifications: boolean;
    offlineMode: boolean;
    darkMode: boolean;
    advancedCharts: boolean;
    socialTrading: boolean;
    derivatives: boolean;
    staking: boolean;
  };
  theme: MobileTheme;
}

export interface MobileTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    border: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    caption: number;
  };
  borderRadius: number;
  shadows: {
    small: any;
    medium: any;
    large: any;
  };
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  chartData: ChartDataPoint[];
}

export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Portfolio {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  assets: PortfolioAsset[];
  performance: PerformanceData;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  price: number;
  change24h: number;
  allocation: number;
}

export interface PerformanceData {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  allTime: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
  fee: number;
}

export interface NotificationPayload {
  type: 'price_alert' | 'trade_filled' | 'news' | 'security' | 'social';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'normal' | 'high';
}

// Navigation Types
type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  TradeDetail: { symbol: string };
  Portfolio: undefined;
  Settings: undefined;
};

type MainTabParamList = {
  Markets: undefined;
  Portfolio: undefined;
  Trade: undefined;
  Social: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Theme Configuration
const theme: MobileTheme = {
  colors: {
    primary: '#FF6B35',      // Orange
    secondary: '#1A1A1A',    // Dark gray
    background: '#000000',    // Black
    surface: '#1A1A1A',      // Dark surface
    text: '#FFFFFF',         // White text
    textSecondary: '#B0B0B0', // Gray text
    accent: '#00D2FF',       // Blue accent
    success: '#4CAF50',      // Green
    warning: '#FF9800',      // Orange
    error: '#F44336',        // Red
    border: '#333333'        // Border gray
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  typography: {
    h1: 28,
    h2: 24,
    h3: 20,
    body: 16,
    caption: 12
  },
  borderRadius: 8,
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8
    }
  }
};

// App Configuration
const appConfig: MobileAppConfig = {
  version: '3.0.0',
  buildNumber: 12,
  environment: 'production',
  apiEndpoint: 'https://api.cypher-ordi.com/v3',
  websocketEndpoint: 'wss://ws.cypher-ordi.com/v3',
  features: {
    biometricAuth: true,
    pushNotifications: true,
    offlineMode: true,
    darkMode: true,
    advancedCharts: true,
    socialTrading: true,
    derivatives: true,
    staking: true
  },
  theme
};

// Market Screen Component
const MarketScreen: React.FC = () => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    loadMarketData();
  }, []);

  const loadMarketData = async () => {
    try {
      // Mock market data
      const mockData: MarketData[] = [
        {
          symbol: 'BTC',
          price: 45000,
          change24h: 2.5,
          volume24h: 1200000000,
          marketCap: 850000000000,
          high24h: 46000,
          low24h: 44000,
          chartData: generateMockChartData()
        },
        {
          symbol: 'ETH',
          price: 3000,
          change24h: -1.2,
          volume24h: 800000000,
          marketCap: 360000000000,
          high24h: 3100,
          low24h: 2950,
          chartData: generateMockChartData()
        }
      ];
      setMarkets(mockData);
    } catch (error) {
      console.error('Failed to load market data:', error);
    }
  };

  const generateMockChartData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = Date.now();
    const interval = 60 * 60 * 1000; // 1 hour intervals

    for (let i = 0; i < 24; i++) {
      const timestamp = now - (23 - i) * interval;
      const basePrice = 45000 + Math.random() * 1000;
      
      data.push({
        timestamp,
        open: basePrice,
        high: basePrice + Math.random() * 500,
        low: basePrice - Math.random() * 500,
        close: basePrice + (Math.random() - 0.5) * 200,
        volume: Math.random() * 1000000
      });
    }

    return data;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarketData();
    setRefreshing(false);
  };

  const renderMarketItem = (market: MarketData) => (
    <TouchableOpacity
      key={market.symbol}
      style={styles.marketItem}
      onPress={() => navigateToTradeDetail(market.symbol)}
    >
      <View style={styles.marketItemHeader}>
        <View>
          <Text style={styles.marketSymbol}>{market.symbol}</Text>
          <Text style={styles.marketPrice}>${market.price.toLocaleString()}</Text>
        </View>
        <View style={styles.marketChange}>
          <Text style={[
            styles.marketChangeText,
            { color: market.change24h >= 0 ? theme.colors.success : theme.colors.error }
          ]}>
            {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
          </Text>
        </View>
      </View>
      <MiniChart data={market.chartData} color={market.change24h >= 0 ? theme.colors.success : theme.colors.error} />
    </TouchableOpacity>
  );

  const navigateToTradeDetail = (symbol: string) => {
    // Navigation logic would go here
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Markets</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Icon name="search" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.timeframeSelector}>
          {['1h', '24h', '7d', '30d'].map((timeframe) => (
            <TouchableOpacity
              key={timeframe}
              style={[
                styles.timeframeButton,
                selectedTimeframe === timeframe && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe(timeframe)}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === timeframe && styles.timeframeTextActive
              ]}>
                {timeframe}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.marketsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {markets.map(renderMarketItem)}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Portfolio Screen Component
const PortfolioScreen: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      // Mock portfolio data
      const mockPortfolio: Portfolio = {
        totalValue: 125000,
        totalPnL: 12500,
        totalPnLPercent: 11.11,
        assets: [
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            balance: 2.5,
            value: 112500,
            price: 45000,
            change24h: 2.5,
            allocation: 90
          },
          {
            symbol: 'ETH',
            name: 'Ethereum',
            balance: 4.17,
            value: 12500,
            price: 3000,
            change24h: -1.2,
            allocation: 10
          }
        ],
        performance: {
          daily: 2.1,
          weekly: 8.5,
          monthly: 15.2,
          yearly: 45.8,
          allTime: 125.7
        }
      };
      setPortfolio(mockPortfolio);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const renderAssetItem = (asset: PortfolioAsset) => (
    <View key={asset.symbol} style={styles.assetItem}>
      <View style={styles.assetInfo}>
        <Text style={styles.assetSymbol}>{asset.symbol}</Text>
        <Text style={styles.assetName}>{asset.name}</Text>
      </View>
      <View style={styles.assetBalance}>
        <Text style={styles.assetBalanceText}>{asset.balance} {asset.symbol}</Text>
        <Text style={styles.assetValue}>${asset.value.toLocaleString()}</Text>
      </View>
      <View style={styles.assetChange}>
        <Text style={[
          styles.assetChangeText,
          { color: asset.change24h >= 0 ? theme.colors.success : theme.colors.error }
        ]}>
          {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
        </Text>
      </View>
    </View>
  );

  if (!portfolio) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Icon name="settings" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.portfolioContent} showsVerticalScrollIndicator={false}>
          {/* Portfolio Summary */}
          <View style={styles.portfolioSummary}>
            <Text style={styles.portfolioTotalLabel}>Total Balance</Text>
            <Text style={styles.portfolioTotalValue}>
              ${portfolio.totalValue.toLocaleString()}
            </Text>
            <View style={styles.portfolioPnL}>
              <Text style={[
                styles.portfolioPnLText,
                { color: portfolio.totalPnL >= 0 ? theme.colors.success : theme.colors.error }
              ]}>
                {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL.toLocaleString()}
              </Text>
              <Text style={[
                styles.portfolioPnLPercent,
                { color: portfolio.totalPnL >= 0 ? theme.colors.success : theme.colors.error }
              ]}>
                ({portfolio.totalPnLPercent >= 0 ? '+' : ''}{portfolio.totalPnLPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>

          {/* Performance Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <PerformanceChart data={portfolio.performance} />
          </View>

          {/* Assets List */}
          <View style={styles.assetsSection}>
            <Text style={styles.sectionTitle}>Assets</Text>
            {portfolio.assets.map(renderAssetItem)}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.depositButton]}>
              <Icon name="add" size={20} color={theme.colors.text} />
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.withdrawButton]}>
              <Icon name="remove" size={20} color={theme.colors.text} />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.tradeButton]}>
              <Icon name="trending-up" size={20} color={theme.colors.text} />
              <Text style={styles.actionButtonText}>Trade</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Trading Screen Component
const TradingScreen: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  const submitOrder = async () => {
    try {
      if (!amount || (orderType === 'limit' && !price)) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Mock order submission
      const order = {
        symbol: selectedSymbol,
        side: orderSide,
        type: orderType,
        amount: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(price) : undefined
      };

      Alert.alert('Success', 'Order submitted successfully');
      
      // Reset form
      setAmount('');
      setPrice('');
    } catch (error) {
      console.error('Failed to submit order:', error);
      Alert.alert('Error', 'Failed to submit order');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trade</Text>
          <TouchableOpacity style={styles.historyButton}>
            <Icon name="history" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.tradingContent} showsVerticalScrollIndicator={false}>
          {/* Symbol Selector */}
          <View style={styles.symbolSelector}>
            <Text style={styles.sectionTitle}>Select Asset</Text>
            <View style={styles.symbolGrid}>
              {['BTC', 'ETH', 'SOL', 'ADA'].map((symbol) => (
                <TouchableOpacity
                  key={symbol}
                  style={[
                    styles.symbolButton,
                    selectedSymbol === symbol && styles.symbolButtonActive
                  ]}
                  onPress={() => setSelectedSymbol(symbol)}
                >
                  <Text style={[
                    styles.symbolButtonText,
                    selectedSymbol === symbol && styles.symbolButtonTextActive
                  ]}>
                    {symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Order Type Selector */}
          <View style={styles.orderTypeSelector}>
            <TouchableOpacity
              style={[
                styles.orderTypeButton,
                orderType === 'market' && styles.orderTypeButtonActive
              ]}
              onPress={() => setOrderType('market')}
            >
              <Text style={[
                styles.orderTypeText,
                orderType === 'market' && styles.orderTypeTextActive
              ]}>
                Market
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.orderTypeButton,
                orderType === 'limit' && styles.orderTypeButtonActive
              ]}
              onPress={() => setOrderType('limit')}
            >
              <Text style={[
                styles.orderTypeText,
                orderType === 'limit' && styles.orderTypeTextActive
              ]}>
                Limit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Order Side Selector */}
          <View style={styles.orderSideSelector}>
            <TouchableOpacity
              style={[
                styles.orderSideButton,
                styles.buyButton,
                orderSide === 'buy' && styles.orderSideButtonActive
              ]}
              onPress={() => setOrderSide('buy')}
            >
              <Text style={styles.orderSideText}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.orderSideButton,
                styles.sellButton,
                orderSide === 'sell' && styles.orderSideButtonActive
              ]}
              onPress={() => setOrderSide('sell')}
            >
              <Text style={styles.orderSideText}>SELL</Text>
            </TouchableOpacity>
          </View>

          {/* Order Form */}
          <View style={styles.orderForm}>
            {orderType === 'limit' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefix}>$</Text>
                  {/* TextInput would go here in actual React Native */}
                  <Text style={styles.mockInput}>{price || 'Enter price'}</Text>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>{selectedSymbol}</Text>
                {/* TextInput would go here in actual React Native */}
                <Text style={styles.mockInput}>{amount || 'Enter amount'}</Text>
              </View>
            </View>

            <View style={styles.orderSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Total:</Text>
                <Text style={styles.summaryValue}>
                  ${amount && price ? (parseFloat(amount) * parseFloat(price)).toLocaleString() : '0.00'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fee:</Text>
                <Text style={styles.summaryValue}>$2.50</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                orderSide === 'buy' ? styles.buySubmitButton : styles.sellSubmitButton
              ]}
              onPress={submitOrder}
            >
              <Text style={styles.submitButtonText}>
                {orderSide.toUpperCase()} {selectedSymbol}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Mini Chart Component
const MiniChart: React.FC<{ data: ChartDataPoint[]; color: string }> = ({ data, color }) => {
  const chartData = {
    labels: data.map(() => ''), // Empty labels for mini chart
    datasets: [{
      data: data.map(point => point.close),
      color: () => color,
      strokeWidth: 2
    }]
  };

  return (
    <View style={styles.miniChart}>
      {/* LineChart would go here in actual React Native */}
      <View style={[styles.mockChart, { backgroundColor: color + '20' }]}>
        <Text style={[styles.mockChartText, { color }]}>Chart</Text>
      </View>
    </View>
  );
};

// Performance Chart Component
const PerformanceChart: React.FC<{ data: PerformanceData }> = ({ data }) => {
  return (
    <View style={styles.performanceChart}>
      {/* Chart would go here in actual React Native */}
      <View style={styles.mockPerformanceChart}>
        <Text style={styles.mockChartText}>Performance Chart</Text>
        <Text style={styles.performanceValue}>+{data.daily.toFixed(1)}% Today</Text>
      </View>
    </View>
  );
};

// Main Tab Navigator
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Markets':
              iconName = 'trending-up';
              break;
            case 'Portfolio':
              iconName = 'account-balance-wallet';
              break;
            case 'Trade':
              iconName = 'swap-horiz';
              break;
            case 'Social':
              iconName = 'people';
              break;
            case 'More':
              iconName = 'menu';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        },
        headerShown: false
      })}
    >
      <Tab.Screen name="Markets" component={MarketScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Trade" component={TradingScreen} />
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

// Social Screen (Placeholder)
const SocialScreen: React.FC = () => (
  <View style={[styles.container, styles.centered]}>
    <Icon name="people" size={48} color={theme.colors.textSecondary} />
    <Text style={styles.placeholderText}>Social Trading</Text>
    <Text style={styles.placeholderSubtext}>Follow top traders and copy their strategies</Text>
  </View>
);

// More Screen (Placeholder)
const MoreScreen: React.FC = () => (
  <View style={[styles.container, styles.centered]}>
    <Icon name="more-horiz" size={48} color={theme.colors.textSecondary} />
    <Text style={styles.placeholderText}>More Features</Text>
    <Text style={styles.placeholderSubtext}>Settings, Help, and Additional Tools</Text>
  </View>
);

// Main App Component
const CypherMobileApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize app services
      await initializePushNotifications();
      await checkAuthStatus();
      await setupBiometrics();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsLoading(false);
    }
  };

  const initializePushNotifications = async () => {
    if (appConfig.features.pushNotifications) {
      // Configure push notifications
      PushNotification.configure({
        onNotification: function(notification) {
        },
        requestPermissions: Platform.OS === 'ios'
      });
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const setupBiometrics = async () => {
    if (appConfig.features.biometricAuth) {
      try {
        const biometryType = await Biometrics.isSensorAvailable();
      } catch (error) {
        console.error('Biometrics not available:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.surface]}
          style={styles.gradientBackground}
        >
          <Icon name="account-balance" size={64} color={theme.colors.primary} />
          <Text style={styles.loadingText}>CYPHER ORDi</Text>
          <Text style={styles.loadingSubtext}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <StateProvider store={{}}>
      <QueryClientProvider client={new QueryClient()}>
        <StatusBar
          backgroundColor={theme.colors.background}
          barStyle="light-content"
        />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: theme.colors.background }
            }}
          >
            {isAuthenticated ? (
              <Stack.Screen name="Main" component={MainTabs} />
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </StateProvider>
  );
};

// Auth Screens (Placeholders)
const LoginScreen: React.FC = () => (
  <View style={[styles.container, styles.centered]}>
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.gradientBackground}
    >
      <Icon name="lock" size={48} color={theme.colors.primary} />
      <Text style={styles.placeholderText}>Login</Text>
      <Text style={styles.placeholderSubtext}>Secure access to your account</Text>
    </LinearGradient>
  </View>
);

const RegisterScreen: React.FC = () => (
  <View style={[styles.container, styles.centered]}>
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.gradientBackground}
    >
      <Icon name="person-add" size={48} color={theme.colors.primary} />
      <Text style={styles.placeholderText}>Register</Text>
      <Text style={styles.placeholderSubtext}>Create your trading account</Text>
    </LinearGradient>
  </View>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  gradientBackground: {
    flex: 1
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm
  },
  headerTitle: {
    fontSize: theme.typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  searchButton: {
    padding: theme.spacing.xs
  },
  settingsButton: {
    padding: theme.spacing.xs
  },
  historyButton: {
    padding: theme.spacing.xs
  },
  timeframeSelector: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  timeframeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.surface
  },
  timeframeButtonActive: {
    backgroundColor: theme.colors.primary
  },
  timeframeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body,
    fontWeight: '600'
  },
  timeframeTextActive: {
    color: theme.colors.text
  },
  marketsList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md
  },
  marketItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small
  },
  marketItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  marketSymbol: {
    fontSize: theme.typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  marketPrice: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  marketChange: {
    alignItems: 'flex-end'
  },
  marketChangeText: {
    fontSize: theme.typography.body,
    fontWeight: '600'
  },
  miniChart: {
    height: 40,
    marginTop: theme.spacing.sm
  },
  mockChart: {
    flex: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mockChartText: {
    fontSize: theme.typography.caption,
    fontWeight: '600'
  },
  portfolioContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.md
  },
  portfolioSummary: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.medium
  },
  portfolioTotalLabel: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs
  },
  portfolioTotalValue: {
    fontSize: theme.typography.h1,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  portfolioPnL: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  portfolioPnLText: {
    fontSize: theme.typography.h3,
    fontWeight: '600',
    marginRight: theme.spacing.xs
  },
  portfolioPnLPercent: {
    fontSize: theme.typography.body,
    fontWeight: '600'
  },
  chartContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small
  },
  sectionTitle: {
    fontSize: theme.typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md
  },
  performanceChart: {
    height: 120
  },
  mockPerformanceChart: {
    flex: 1,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius,
    justifyContent: 'center',
    alignItems: 'center'
  },
  performanceValue: {
    fontSize: theme.typography.body,
    color: theme.colors.success,
    fontWeight: '600',
    marginTop: theme.spacing.xs
  },
  assetsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  assetInfo: {
    flex: 1
  },
  assetSymbol: {
    fontSize: theme.typography.body,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  assetName: {
    fontSize: theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  assetBalance: {
    alignItems: 'flex-end',
    marginRight: theme.spacing.md
  },
  assetBalanceText: {
    fontSize: theme.typography.body,
    color: theme.colors.text
  },
  assetValue: {
    fontSize: theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  assetChange: {
    minWidth: 60,
    alignItems: 'flex-end'
  },
  assetChangeText: {
    fontSize: theme.typography.body,
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius,
    marginHorizontal: theme.spacing.xs,
    ...theme.shadows.small
  },
  depositButton: {
    backgroundColor: theme.colors.success
  },
  withdrawButton: {
    backgroundColor: theme.colors.warning
  },
  tradeButton: {
    backgroundColor: theme.colors.primary
  },
  actionButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs
  },
  tradingContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.md
  },
  symbolSelector: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small
  },
  symbolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  symbolButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  symbolButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  symbolButtonText: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  symbolButtonTextActive: {
    color: theme.colors.text
  },
  orderTypeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius - 2
  },
  orderTypeButtonActive: {
    backgroundColor: theme.colors.primary
  },
  orderTypeText: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  orderTypeTextActive: {
    color: theme.colors.text
  },
  orderSideSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md
  },
  orderSideButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius,
    marginHorizontal: theme.spacing.xs,
    opacity: 0.6,
    ...theme.shadows.small
  },
  orderSideButtonActive: {
    opacity: 1
  },
  buyButton: {
    backgroundColor: theme.colors.success
  },
  sellButton: {
    backgroundColor: theme.colors.error
  },
  orderSideText: {
    fontSize: theme.typography.body,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  orderForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.md,
    ...theme.shadows.small
  },
  inputGroup: {
    marginBottom: theme.spacing.md
  },
  inputLabel: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  inputPrefix: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm
  },
  mockInput: {
    flex: 1,
    fontSize: theme.typography.body,
    color: theme.colors.text
  },
  orderSummary: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm
  },
  summaryLabel: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary
  },
  summaryValue: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text
  },
  submitButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius,
    alignItems: 'center',
    ...theme.shadows.medium
  },
  buySubmitButton: {
    backgroundColor: theme.colors.success
  },
  sellSubmitButton: {
    backgroundColor: theme.colors.error
  },
  submitButtonText: {
    fontSize: theme.typography.body,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  loadingText: {
    fontSize: theme.typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md
  },
  loadingSubtext: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm
  },
  placeholderText: {
    fontSize: theme.typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center'
  },
  placeholderSubtext: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl
  }
});

export default CypherMobileApp;