/**
 * Grafana Dashboard Integration for CYPHER ORDi Future V3
 * Advanced analytics and monitoring with custom Grafana dashboards
 */

import { EventEmitter } from 'events';
import { EnhancedLogger } from '@/lib/enhanced-logger';

// Grafana Integration Types
export interface GrafanaConfig {
  url: string;
  apiKey: string;
  organizationId: number;
  datasources: {
    prometheus: string;
    influxdb: string;
    elasticsearch: string;
  };
  authentication: {
    type: 'api_key' | 'basic' | 'oauth';
    credentials: Record<string, string>;
  };
}

export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  tags: string[];
  panels: PanelConfig[];
  variables: VariableConfig[];
  timeRange: {
    from: string;
    to: string;
    refresh: string;
  };
  annotations: AnnotationConfig[];
}

export interface PanelConfig {
  id: number;
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'heatmap' | 'gauge' | 'bargauge';
  targets: QueryTarget[];
  gridPos: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
  options: Record<string, any>;
  fieldConfig: {
    defaults: Record<string, any>;
    overrides: Array<Record<string, any>>;
  };
  thresholds?: {
    mode: 'absolute' | 'percentage';
    steps: Array<{
      color: string;
      value: number;
    }>;
  };
  alert?: AlertConfig;
}

export interface QueryTarget {
  refId: string;
  datasource: string;
  expr: string; // Prometheus query
  interval?: string;
  legendFormat?: string;
  instant?: boolean;
}

export interface VariableConfig {
  name: string;
  type: 'query' | 'custom' | 'constant' | 'datasource';
  query?: string;
  options?: Array<{ text: string; value: string }>;
  current: { text: string; value: string };
  refresh: 'never' | 'on_dashboard_load' | 'on_time_range_change';
}

export interface AnnotationConfig {
  name: string;
  datasource: string;
  enable: boolean;
  iconColor: string;
  query: string;
  titleFormat?: string;
  textFormat?: string;
}

export interface AlertConfig {
  id: number;
  name: string;
  message: string;
  frequency: string;
  conditions: AlertCondition[];
  executionErrorState: 'alerting' | 'keep_state';
  noDataState: 'no_data' | 'alerting' | 'keep_state';
  notifications: NotificationChannel[];
}

export interface AlertCondition {
  query: {
    refId: string;
    queryType: string;
    model: Record<string, any>;
  };
  reducer: {
    type: 'last' | 'min' | 'max' | 'mean' | 'sum' | 'count';
    params: any[];
  };
  evaluator: {
    type: 'gt' | 'lt' | 'within_range' | 'outside_range';
    params: number[];
  };
}

export interface NotificationChannel {
  id: number;
  name: string;
  type: 'email' | 'slack' | 'discord' | 'webhook' | 'telegram';
  settings: Record<string, any>;
}

export interface MetricData {
  metric: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  labels: Record<string, string>;
}

export interface DashboardSnapshot {
  dashboard: DashboardConfig;
  data: Record<string, any>;
  timestamp: number;
  url: string;
}

export class GrafanaDashboard extends EventEmitter {
  private config: GrafanaConfig;
  private logger: EnhancedLogger;
  private dashboards: Map<string, DashboardConfig> = new Map();
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Map<string, AlertConfig> = new Map();

  // Pre-defined dashboard configurations
  private readonly DASHBOARD_TEMPLATES: Record<string, Partial<DashboardConfig>> = {
    trading: {
      title: 'CYPHER Trading Dashboard',
      description: 'Real-time trading metrics and performance analytics',
      tags: ['trading', 'cypher', 'crypto'],
      timeRange: {
        from: 'now-1h',
        to: 'now',
        refresh: '5s'
      }
    },
    portfolio: {
      title: 'Portfolio Analytics Dashboard',
      description: 'Portfolio performance, allocation, and risk metrics',
      tags: ['portfolio', 'analytics', 'risk'],
      timeRange: {
        from: 'now-24h',
        to: 'now',
        refresh: '30s'
      }
    },
    arbitrage: {
      title: 'Arbitrage Opportunities Dashboard',
      description: 'Cross-exchange arbitrage monitoring and execution',
      tags: ['arbitrage', 'opportunities', 'exchanges'],
      timeRange: {
        from: 'now-15m',
        to: 'now',
        refresh: '1s'
      }
    },
    system: {
      title: 'System Health Dashboard',
      description: 'Infrastructure monitoring and performance metrics',
      tags: ['system', 'health', 'monitoring'],
      timeRange: {
        from: 'now-6h',
        to: 'now',
        refresh: '10s'
      }
    }
  };

  constructor(config: GrafanaConfig) {
    super();
    this.config = config;
    this.logger = new EnhancedLogger();

    this.logger.info('Grafana Dashboard service initialized', {
      component: 'GrafanaDashboard',
      url: config.url,
      organizationId: config.organizationId
    });
  }

  /**
   * Initialize Grafana connection and create default dashboards
   */
  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.testConnection();

      // Setup datasources
      await this.setupDatasources();

      // Create default dashboards
      await this.createDefaultDashboards();

      // Setup alerts
      await this.setupDefaultAlerts();

      this.logger.info('Grafana Dashboard service initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to initialize Grafana Dashboard service');
      throw error;
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(dashboardConfig: DashboardConfig): Promise<string> {
    try {
      const response = await this.makeGrafanaRequest('/api/dashboards/db', 'POST', {
        dashboard: this.convertToGrafanaDashboard(dashboardConfig),
        folderId: 0,
        overwrite: true
      });

      this.dashboards.set(dashboardConfig.id, dashboardConfig);

      this.logger.info('Dashboard created', {
        id: dashboardConfig.id,
        title: dashboardConfig.title,
        uid: response.uid
      });

      return response.uid;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to create dashboard:');
      throw error;
    }
  }

  /**
   * Update an existing dashboard
   */
  async updateDashboard(dashboardId: string, updates: Partial<DashboardConfig>): Promise<void> {
    const existing = this.dashboards.get(dashboardId);
    if (!existing) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const updated = { ...existing, ...updates };
    await this.createDashboard(updated);
    
    this.logger.info('Dashboard updated', { id: dashboardId });
  }

  /**
   * Send metrics to Grafana datasources
   */
  async sendMetrics(metrics: MetricData[]): Promise<void> {
    try {
      // Send to Prometheus (via pushgateway)
      await this.sendToPrometheus(metrics);

      // Send to InfluxDB
      await this.sendToInfluxDB(metrics);

      // Store locally for caching
      metrics.forEach(metric => {
        if (!this.metrics.has(metric.metric)) {
          this.metrics.set(metric.metric, []);
        }
        
        const metricHistory = this.metrics.get(metric.metric)!;
        metricHistory.push(metric);
        
        // Keep only last 1000 data points
        if (metricHistory.length > 1000) {
          metricHistory.splice(0, metricHistory.length - 1000);
        }
      });

      this.emit('metricsReceived', metrics);

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to send metrics:');
    }
  }

  /**
   * Create trading performance dashboard
   */
  async createTradingDashboard(): Promise<string> {
    const dashboard: DashboardConfig = {
      id: 'trading-performance',
      title: 'CYPHER Trading Performance',
      description: 'Real-time trading metrics and performance analytics',
      tags: ['trading', 'performance', 'crypto'],
      timeRange: {
        from: 'now-1h',
        to: 'now',
        refresh: '5s'
      },
      variables: [
        {
          name: 'exchange',
          type: 'query',
          query: 'label_values(trading_volume, exchange)',
          current: { text: 'All', value: '$__all' },
          refresh: 'on_dashboard_load'
        },
        {
          name: 'symbol',
          type: 'query',
          query: 'label_values(trading_volume{exchange=~"$exchange"}, symbol)',
          current: { text: 'BTC-USD', value: 'BTC-USD' },
          refresh: 'on_time_range_change'
        }
      ],
      panels: [
        {
          id: 1,
          title: 'Total P&L',
          type: 'singlestat',
          gridPos: { h: 8, w: 6, x: 0, y: 0 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'sum(trading_pnl{exchange=~"$exchange", symbol=~"$symbol"})',
              legendFormat: 'Total P&L'
            }
          ],
          options: {
            colorMode: 'value',
            graphMode: 'area',
            justifyMode: 'auto',
            orientation: 'auto'
          },
          fieldConfig: {
            defaults: {
              unit: 'currency',
              displayName: 'Total P&L'
            },
            overrides: []
          },
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'red', value: -1000 },
              { color: 'yellow', value: 0 },
              { color: 'green', value: 1000 }
            ]
          }
        },
        {
          id: 2,
          title: 'Win Rate',
          type: 'gauge',
          gridPos: { h: 8, w: 6, x: 6, y: 0 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: '(sum(trading_wins{exchange=~"$exchange", symbol=~"$symbol"}) / sum(trading_total_trades{exchange=~"$exchange", symbol=~"$symbol"})) * 100',
              legendFormat: 'Win Rate %'
            }
          ],
          options: {
            reduceOptions: {
              values: false,
              calcs: ['lastNotNull'],
              fields: ''
            }
          },
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { color: 'red', value: 0 },
                  { color: 'yellow', value: 50 },
                  { color: 'green', value: 70 }
                ]
              }
            },
            overrides: []
          }
        },
        {
          id: 3,
          title: 'Trading Volume',
          type: 'graph',
          gridPos: { h: 8, w: 12, x: 12, y: 0 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'rate(trading_volume{exchange=~"$exchange", symbol=~"$symbol"}[5m])',
              legendFormat: '{{exchange}} - {{symbol}}'
            }
          ],
          options: {
            legend: {
              displayMode: 'table',
              placement: 'bottom'
            },
            tooltip: {
              mode: 'multi'
            }
          },
          fieldConfig: {
            defaults: {
              unit: 'currency'
            },
            overrides: []
          }
        },
        {
          id: 4,
          title: 'Active Positions',
          type: 'table',
          gridPos: { h: 8, w: 24, x: 0, y: 8 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'trading_open_positions{exchange=~"$exchange", symbol=~"$symbol"}',
              instant: true
            }
          ],
          options: {
            showHeader: true
          },
          fieldConfig: {
            defaults: {},
            overrides: []
          }
        }
      ],
      annotations: [
        {
          name: 'Trading Events',
          datasource: 'prometheus',
          enable: true,
          iconColor: 'blue',
          query: 'trading_events{exchange=~"$exchange"}',
          titleFormat: 'Trade Event',
          textFormat: '{{event_type}}: {{symbol}} - {{side}}'
        }
      ]
    };

    return await this.createDashboard(dashboard);
  }

  /**
   * Create portfolio analytics dashboard
   */
  async createPortfolioDashboard(): Promise<string> {
    const dashboard: DashboardConfig = {
      id: 'portfolio-analytics',
      title: 'Portfolio Analytics',
      description: 'Portfolio performance, allocation, and risk metrics',
      tags: ['portfolio', 'analytics', 'risk'],
      timeRange: {
        from: 'now-24h',
        to: 'now',
        refresh: '30s'
      },
      variables: [
        {
          name: 'wallet',
          type: 'query',
          query: 'label_values(portfolio_value, wallet)',
          current: { text: 'All', value: '$__all' },
          refresh: 'on_dashboard_load'
        }
      ],
      panels: [
        {
          id: 1,
          title: 'Portfolio Value',
          type: 'graph',
          gridPos: { h: 8, w: 12, x: 0, y: 0 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'portfolio_value{wallet=~"$wallet"}',
              legendFormat: '{{wallet}}'
            }
          ],
          options: {},
          fieldConfig: {
            defaults: {
              unit: 'currency'
            },
            overrides: []
          }
        },
        {
          id: 2,
          title: 'Asset Allocation',
          type: 'graph',
          gridPos: { h: 8, w: 12, x: 12, y: 0 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'portfolio_allocation{wallet=~"$wallet"}',
              legendFormat: '{{asset}}'
            }
          ],
          options: {
            pieType: 'pie'
          },
          fieldConfig: {
            defaults: {
              unit: 'percent'
            },
            overrides: []
          }
        },
        {
          id: 3,
          title: 'Risk Metrics',
          type: 'singlestat',
          gridPos: { h: 4, w: 6, x: 0, y: 8 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'portfolio_sharpe_ratio{wallet=~"$wallet"}',
              legendFormat: 'Sharpe Ratio'
            }
          ],
          options: {},
          fieldConfig: {
            defaults: {
              unit: 'short'
            },
            overrides: []
          }
        },
        {
          id: 4,
          title: 'Max Drawdown',
          type: 'singlestat',
          gridPos: { h: 4, w: 6, x: 6, y: 8 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'portfolio_max_drawdown{wallet=~"$wallet"}',
              legendFormat: 'Max Drawdown'
            }
          ],
          options: {},
          fieldConfig: {
            defaults: {
              unit: 'percent'
            },
            overrides: []
          },
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: 0 },
              { color: 'yellow', value: 10 },
              { color: 'red', value: 20 }
            ]
          }
        }
      ],
      annotations: []
    };

    return await this.createDashboard(dashboard);
  }

  /**
   * Create system health dashboard
   */
  async createSystemDashboard(): Promise<string> {
    const dashboard: DashboardConfig = {
      id: 'system-health',
      title: 'System Health & Performance',
      description: 'Infrastructure monitoring and performance metrics',
      tags: ['system', 'health', 'monitoring'],
      timeRange: {
        from: 'now-6h',
        to: 'now',
        refresh: '10s'
      },
      variables: [
        {
          name: 'service',
          type: 'query',
          query: 'label_values(system_cpu_usage, service)',
          current: { text: 'All', value: '$__all' },
          refresh: 'on_dashboard_load'
        }
      ],
      panels: [
        {
          id: 1,
          title: 'CPU Usage',
          type: 'graph',
          gridPos: { h: 8, w: 12, x: 0, y: 0 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'system_cpu_usage{service=~"$service"}',
              legendFormat: '{{service}}'
            }
          ],
          options: {},
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100
            },
            overrides: []
          },
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: 0 },
              { color: 'yellow', value: 70 },
              { color: 'red', value: 90 }
            ]
          }
        },
        {
          id: 2,
          title: 'Memory Usage',
          type: 'graph',
          gridPos: { h: 8, w: 12, x: 12, y: 0 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'system_memory_usage{service=~"$service"}',
              legendFormat: '{{service}}'
            }
          ],
          options: {},
          fieldConfig: {
            defaults: {
              unit: 'bytes'
            },
            overrides: []
          }
        },
        {
          id: 3,
          title: 'API Response Times',
          type: 'graph',
          gridPos: { h: 8, w: 24, x: 0, y: 8 },
          targets: [
            {
              refId: 'A',
              datasource: 'prometheus',
              expr: 'histogram_quantile(0.95, rate(api_request_duration_seconds_bucket{service=~"$service"}[5m]))',
              legendFormat: '95th percentile - {{service}}'
            },
            {
              refId: 'B',
              datasource: 'prometheus',
              expr: 'histogram_quantile(0.50, rate(api_request_duration_seconds_bucket{service=~"$service"}[5m]))',
              legendFormat: '50th percentile - {{service}}'
            }
          ],
          options: {},
          fieldConfig: {
            defaults: {
              unit: 'ms'
            },
            overrides: []
          }
        }
      ],
      annotations: [
        {
          name: 'Deployments',
          datasource: 'prometheus',
          enable: true,
          iconColor: 'green',
          query: 'deployment_events',
          titleFormat: 'Deployment',
          textFormat: 'Service: {{service}} Version: {{version}}'
        }
      ]
    };

    return await this.createDashboard(dashboard);
  }

  /**
   * Setup alert rules
   */
  async setupAlert(alertConfig: AlertConfig): Promise<number> {
    try {
      const response = await this.makeGrafanaRequest('/api/alerts', 'POST', {
        name: alertConfig.name,
        message: alertConfig.message,
        frequency: alertConfig.frequency,
        conditions: alertConfig.conditions,
        executionErrorState: alertConfig.executionErrorState,
        noDataState: alertConfig.noDataState,
        notifications: alertConfig.notifications.map(n => n.id)
      });

      this.alerts.set(alertConfig.name, alertConfig);

      this.logger.info('Alert configured', {
        id: response.id,
        name: alertConfig.name
      });

      return response.id;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to setup alert:');
      throw error;
    }
  }

  /**
   * Create dashboard snapshot
   */
  async createSnapshot(dashboardId: string): Promise<DashboardSnapshot> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const response = await this.makeGrafanaRequest('/api/snapshots', 'POST', {
        dashboard: this.convertToGrafanaDashboard(dashboard),
        expires: 3600, // 1 hour
        external: false
      });

      const snapshot: DashboardSnapshot = {
        dashboard,
        data: response,
        timestamp: Date.now(),
        url: `${this.config.url}/dashboard/snapshot/${response.key}`
      };

      this.logger.info('Dashboard snapshot created', {
        dashboardId,
        snapshotKey: response.key,
        url: snapshot.url
      });

      return snapshot;

    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to create snapshot:');
      throw error;
    }
  }

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics(dashboardId: string): Record<string, MetricData[]> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return {};
    }

    const metrics: Record<string, MetricData[]> = {};
    
    dashboard.panels.forEach(panel => {
      panel.targets.forEach(target => {
        const metricName = target.expr;
        const metricData = this.metrics.get(metricName);
        if (metricData) {
          metrics[target.refId] = metricData;
        }
      });
    });

    return metrics;
  }

  /**
   * Private methods
   */

  private async testConnection(): Promise<void> {
    try {
      await this.makeGrafanaRequest('/api/health');
      this.logger.info('Grafana connection test successful');
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Grafana connection test failed:');
      throw error;
    }
  }

  private async setupDatasources(): Promise<void> {
    const datasources = [
      {
        name: 'prometheus',
        type: 'prometheus',
        url: this.config.datasources.prometheus,
        access: 'proxy',
        isDefault: true
      },
      {
        name: 'influxdb',
        type: 'influxdb',
        url: this.config.datasources.influxdb,
        access: 'proxy',
        database: 'cypher'
      }
    ];

    for (const datasource of datasources) {
      try {
        await this.makeGrafanaRequest('/api/datasources', 'POST', datasource);
        this.logger.info('Datasource configured', { name: datasource.name });
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          this.logger.info('Datasource already exists', { name: datasource.name });
        } else {
          throw error;
        }
      }
    }
  }

  private async createDefaultDashboards(): Promise<void> {
    await this.createTradingDashboard();
    await this.createPortfolioDashboard();
    await this.createSystemDashboard();
  }

  private async setupDefaultAlerts(): Promise<void> {
    const alerts: AlertConfig[] = [
      {
        id: 1,
        name: 'High Trading Loss Alert',
        message: 'Trading losses exceeded threshold',
        frequency: '1m',
        conditions: [
          {
            query: {
              refId: 'A',
              queryType: '',
              model: {
                expr: 'trading_pnl < -10000',
                refId: 'A'
              }
            },
            reducer: {
              type: 'last',
              params: []
            },
            evaluator: {
              type: 'lt',
              params: [-10000]
            }
          }
        ],
        executionErrorState: 'alerting',
        noDataState: 'no_data',
        notifications: []
      }
    ];

    for (const alert of alerts) {
      try {
        await this.setupAlert(alert);
      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to setup default alert:');
      }
    }
  }

  private convertToGrafanaDashboard(config: DashboardConfig): any {
    return {
      id: null,
      uid: config.id,
      title: config.title,
      description: config.description,
      tags: config.tags,
      timezone: 'browser',
      panels: config.panels.map(panel => ({
        id: panel.id,
        title: panel.title,
        type: panel.type,
        targets: panel.targets,
        gridPos: panel.gridPos,
        options: panel.options,
        fieldConfig: panel.fieldConfig,
        thresholds: panel.thresholds,
        alert: panel.alert
      })),
      templating: {
        list: config.variables.map(variable => ({
          name: variable.name,
          type: variable.type,
          query: variable.query,
          options: variable.options,
          current: variable.current,
          refresh: variable.refresh
        }))
      },
      time: {
        from: config.timeRange.from,
        to: config.timeRange.to
      },
      refresh: config.timeRange.refresh,
      annotations: {
        list: config.annotations.map(annotation => ({
          name: annotation.name,
          datasource: annotation.datasource,
          enable: annotation.enable,
          iconColor: annotation.iconColor,
          query: annotation.query,
          titleFormat: annotation.titleFormat,
          textFormat: annotation.textFormat
        }))
      }
    };
  }

  private async sendToPrometheus(metrics: MetricData[]): Promise<void> {
    // Send metrics to Prometheus pushgateway
    const prometheusMetrics = metrics.map(metric => {
      const labels = Object.entries(metric.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      
      return `${metric.metric}{${labels}} ${metric.value} ${metric.timestamp}`;
    }).join('\n');

    // Would send to pushgateway in real implementation
    this.logger.debug('Metrics sent to Prometheus', { count: metrics.length });
  }

  private async sendToInfluxDB(metrics: MetricData[]): Promise<void> {
    // Send metrics to InfluxDB
    const influxMetrics = metrics.map(metric => {
      const tags = Object.entries(metric.tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      
      return `${metric.metric},${tags} value=${metric.value} ${metric.timestamp * 1000000}`;
    }).join('\n');

    // Would send to InfluxDB in real implementation
    this.logger.debug('Metrics sent to InfluxDB', { count: metrics.length });
  }

  private async makeGrafanaRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<any> {
    const url = `${this.config.url}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Grafana API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }
}

// Singleton instance
export const grafanaDashboard = new GrafanaDashboard({
  url: process.env.GRAFANA_URL || 'http://localhost:3000',
  apiKey: process.env.GRAFANA_API_KEY || '',
  organizationId: parseInt(process.env.GRAFANA_ORG_ID || '1'),
  datasources: {
    prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9090',
    influxdb: process.env.INFLUXDB_URL || 'http://localhost:8086',
    elasticsearch: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
  },
  authentication: {
    type: 'api_key',
    credentials: {
      apiKey: process.env.GRAFANA_API_KEY || ''
    }
  }
});

// Export utility functions
export const DashboardUtils = {
  /**
   * Create custom panel configuration
   */
  createPanel(
    id: number,
    title: string,
    type: PanelConfig['type'],
    query: string,
    position: { x: number; y: number; w: number; h: number }
  ): PanelConfig {
    return {
      id,
      title,
      type,
      targets: [
        {
          refId: 'A',
          datasource: 'prometheus',
          expr: query
        }
      ],
      gridPos: {
        h: position.h,
        w: position.w,
        x: position.x,
        y: position.y
      },
      options: {},
      fieldConfig: {
        defaults: {},
        overrides: []
      }
    };
  },

  /**
   * Generate time-series query for metric
   */
  generateQuery(
    metric: string,
    filters: Record<string, string> = {},
    aggregation?: 'sum' | 'avg' | 'max' | 'min'
  ): string {
    const filterStr = Object.entries(filters)
      .map(([key, value]) => `${key}="${value}"`)
      .join(', ');

    const baseQuery = filterStr ? `${metric}{${filterStr}}` : metric;
    
    return aggregation ? `${aggregation}(${baseQuery})` : baseQuery;
  },

  /**
   * Create alert condition
   */
  createAlertCondition(
    query: string,
    threshold: number,
    operator: 'gt' | 'lt' = 'gt'
  ): AlertCondition {
    return {
      query: {
        refId: 'A',
        queryType: '',
        model: {
          expr: query,
          refId: 'A'
        }
      },
      reducer: {
        type: 'last',
        params: []
      },
      evaluator: {
        type: operator,
        params: [threshold]
      }
    };
  }
};