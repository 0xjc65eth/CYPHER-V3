'use client';

import React, { useState, useEffect } from 'react';
import { devDebugger, ComponentDebugInfo, logger } from '@/lib/debug/developmentUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';

interface DebugDashboardProps {
  isVisible?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function DebugDashboard({ 
  isVisible = false, 
  position = 'bottom-right' 
}: DebugDashboardProps) {
  const [isOpen, setIsOpen] = useState(isVisible);
  const [activeTab, setActiveTab] = useState('components');
  const [componentData, setComponentData] = useState<Map<string, ComponentDebugInfo>>(new Map());
  const [errorLog, setErrorLog] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refresh debug data
  const refreshData = () => {
    setComponentData(devDebugger.getComponentInfo() as Map<string, ComponentDebugInfo>);
    setErrorLog(devDebugger.getErrorLog());
    setPerformanceData(devDebugger.getPerformanceEntries());
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && isOpen) {
      const interval = setInterval(refreshData, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isOpen]);

  // Initial data load
  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  const components = Array.from(componentData.values());
  const errorCount = errorLog.length;
  const warningCount = components.reduce((acc, comp) => acc + comp.warnings.length, 0);
  const slowComponents = performanceData.filter(entry => entry.duration > 16);

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${positionClasses[position]} z-50 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200`}
          title="Open Debug Dashboard"
        >
          🔍
        </button>
      )}

      {/* Debug Dashboard */}
      {isOpen && (
        <div className={`fixed ${positionClasses[position]} z-50 w-96 max-h-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden`}>
          {/* Header */}
          <div className="bg-gray-100 dark:bg-gray-700 p-3 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Debug Dashboard</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-xs px-2 py-1 rounded ${autoRefresh ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
                  title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                >
                  {autoRefresh ? '🔄' : '⏸️'}
                </button>
                <button
                  onClick={refreshData}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Refresh data"
                >
                  ↻
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Status Overview */}
            <div className="flex gap-2 mt-2">
              <Badge variant={errorCount > 0 ? "destructive" : "secondary"}>
                {errorCount} Errors
              </Badge>
              <Badge variant={warningCount > 0 ? "default" : "secondary"}>
                {warningCount} Warnings
              </Badge>
              <Badge variant={slowComponents.length > 0 ? "default" : "secondary"}>
                {slowComponents.length} Slow
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="p-3">
            <div className="flex space-x-1 mb-3">
              {['components', 'errors', 'performance', 'report'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="max-h-64 overflow-y-auto text-xs">
              {activeTab === 'components' && (
                <ComponentsTab components={components} />
              )}
              {activeTab === 'errors' && (
                <ErrorsTab errors={errorLog} />
              )}
              {activeTab === 'performance' && (
                <PerformanceTab data={performanceData} />
              )}
              {activeTab === 'report' && (
                <ReportTab />
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-100 dark:bg-gray-700 p-2 border-t border-gray-300 dark:border-gray-600">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  devDebugger.clearDebugData();
                  refreshData();
                }}
                className="text-xs"
              >
                Clear Data
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  logger.component('DebugDashboard', 'Report generated to console');
                }}
                className="text-xs"
              >
                Log Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Components Tab
function ComponentsTab({ components }: { components: ComponentDebugInfo[] }) {
  return (
    <div className="space-y-2">
      {components.length === 0 ? (
        <p className="text-gray-500">No components tracked yet</p>
      ) : (
        components.map((comp) => (
          <div key={comp.name} className="border border-gray-200 dark:border-gray-600 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">{comp.name}</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {comp.renderCount}x
                </Badge>
                {comp.errors.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {comp.errors.length} err
                  </Badge>
                )}
                {comp.warnings.length > 0 && (
                  <Badge variant="default" className="text-xs">
                    {comp.warnings.length} warn
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-300 mt-1">
              Last: {comp.lastRender.toLocaleTimeString()}
              {comp.performance.renderTime > 16 && (
                <span className="text-orange-500 ml-2">
                  🐌 {comp.performance.renderTime.toFixed(1)}ms
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Errors Tab
function ErrorsTab({ errors }: { errors: any[] }) {
  return (
    <div className="space-y-2">
      {errors.length === 0 ? (
        <p className="text-gray-500">No errors logged</p>
      ) : (
        errors.slice(-10).reverse().map((entry, index) => (
          <div key={index} className="border border-red-200 dark:border-red-600 rounded p-2 bg-red-50 dark:bg-red-900/20">
            <div className="font-medium text-red-900 dark:text-red-200">
              {entry.error.message}
            </div>
            <div className="text-red-700 dark:text-red-300 mt-1">
              {entry.context.componentStack}
            </div>
            <div className="text-red-600 dark:text-red-400 text-xs mt-1">
              {entry.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Performance Tab
function PerformanceTab({ data }: { data: any[] }) {
  const slowEntries = data.filter(entry => entry.duration > 16).slice(-10);
  
  return (
    <div className="space-y-2">
      {slowEntries.length === 0 ? (
        <p className="text-gray-500">No slow components detected</p>
      ) : (
        slowEntries.reverse().map((entry, index) => (
          <div key={index} className="border border-orange-200 dark:border-orange-600 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-white">{entry.name}</span>
              <Badge variant={entry.duration > 32 ? "destructive" : "default"} className="text-xs">
                {entry.duration.toFixed(1)}ms
              </Badge>
            </div>
            <div className="text-gray-600 dark:text-gray-300 text-xs">
              {entry.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Report Tab
function ReportTab() {
  const [report, setReport] = useState('');

  useEffect(() => {
    setReport(devDebugger.generateReport());
  }, []);

  return (
    <div>
      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
        {report}
      </pre>
    </div>
  );
}