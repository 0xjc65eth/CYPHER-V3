'use client';

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable as _Droppable, Draggable as _Draggable, DropResult } from 'react-beautiful-dnd';
const Droppable = _Droppable as any;
const Draggable = _Draggable as any;
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Plus, 
  X, 
  Settings, 
  Eye, 
  EyeOff,
  RotateCcw,
  Save,
  Layout
} from 'lucide-react';

interface DashboardWidget {
  id: string;
  title: string;
  component: React.ReactNode;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
  category: 'analytics' | 'trading' | 'portfolio' | 'ai' | 'system';
}

interface DraggableDashboardProps {
  children?: React.ReactNode;
}

// Sample widgets data
const defaultWidgets: DashboardWidget[] = [
  {
    id: 'bitcoin-price',
    title: 'Bitcoin Price',
    component: (
      <div className="p-4">
        <div className="text-2xl font-bold text-orange-500">$110,250</div>
        <div className="text-sm text-green-400">+2.45% (24h)</div>
      </div>
    ),
    size: 'medium',
    visible: true,
    category: 'analytics'
  },
  {
    id: 'ai-agents',
    title: 'Active AI Agents',
    component: (
      <div className="p-4">
        <div className="text-2xl font-bold text-purple-500">156</div>
        <div className="text-sm text-gray-400">Processing trades</div>
      </div>
    ),
    size: 'small',
    visible: true,
    category: 'ai'
  },
  {
    id: 'portfolio-value',
    title: 'Portfolio Value',
    component: (
      <div className="p-4">
        <div className="text-2xl font-bold text-green-500">$25,430.89</div>
        <div className="text-sm text-green-400">+1.23% (24h)</div>
      </div>
    ),
    size: 'medium',
    visible: true,
    category: 'portfolio'
  },
  {
    id: 'quick-trade',
    title: 'Quick Trade',
    component: (
      <div className="p-4">
        <div className="space-y-2">
          <input 
            type="number" 
            placeholder="Amount" 
            className="w-full bg-gray-700 rounded px-3 py-2 text-white text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">Buy</Button>
            <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700">Sell</Button>
          </div>
        </div>
      </div>
    ),
    size: 'large',
    visible: true,
    category: 'trading'
  },
  {
    id: 'network-status',
    title: 'Network Status',
    component: (
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400">All Systems Operational</span>
        </div>
        <div className="text-sm text-gray-400 mt-1">99.8% Uptime</div>
      </div>
    ),
    size: 'medium',
    visible: true,
    category: 'system'
  },
  {
    id: 'trading-volume',
    title: '24h Trading Volume',
    component: (
      <div className="p-4">
        <div className="text-2xl font-bold text-blue-500">$45.8B</div>
        <div className="text-sm text-blue-400">+8.9% vs yesterday</div>
      </div>
    ),
    size: 'small',
    visible: false,
    category: 'analytics'
  }
];

export function DraggableDashboard({ children }: DraggableDashboardProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const newWidgets = Array.from(widgets);
    const [reorderedItem] = newWidgets.splice(result.source.index, 1);
    newWidgets.splice(result.destination.index, 0, reorderedItem);

    setWidgets(newWidgets);
  }, [widgets]);

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, visible: !widget.visible }
        : widget
    ));
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
  };

  const resetLayout = () => {
    setWidgets(defaultWidgets);
    setIsEditMode(false);
  };

  const saveLayout = () => {
    // Here you would save to localStorage or API
    localStorage.setItem('dashboardLayout', JSON.stringify(widgets));
    setIsEditMode(false);
  };

  const getWidgetSize = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-2';
      case 'large': return 'col-span-3';
      default: return 'col-span-2';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'analytics': return 'bg-blue-500/20 text-blue-400';
      case 'trading': return 'bg-green-500/20 text-green-400';
      case 'portfolio': return 'bg-purple-500/20 text-purple-400';
      case 'ai': return 'bg-orange-500/20 text-orange-400';
      case 'system': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const visibleWidgets = widgets.filter(widget => widget.visible);

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <Card className="bg-gray-900 border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Layout className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Dashboard Layout</h3>
              <p className="text-sm text-gray-400">
                {isEditMode ? 'Drag widgets to reorder • Click to hide/show' : 'Customizable widget dashboard'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={isEditMode ? 'bg-orange-600' : 'bg-gray-600'}>
              {isEditMode ? 'Edit Mode' : 'View Mode'}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="border-gray-600"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className={isEditMode ? 'bg-orange-600 hover:bg-orange-700' : 'border-gray-600'}
            >
              {isEditMode ? 'Done' : 'Edit Layout'}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white">Widget Management</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetLayout}
                  className="border-gray-600"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveLayout}
                  className="border-green-600 text-green-400"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {widgets.map(widget => (
                <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs ${getCategoryColor(widget.category)}`}>
                      {widget.category}
                    </Badge>
                    <span className="text-sm text-white">{widget.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWidgetVisibility(widget.id)}
                      className="h-8 w-8 p-0"
                    >
                      {widget.visible ? (
                        <Eye className="w-4 h-4 text-green-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWidget(widget.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Draggable Dashboard Grid */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard" direction="horizontal">
          {(provided: any, snapshot: any) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`grid grid-cols-1 md:grid-cols-6 gap-4 transition-colors ${
                snapshot.isDraggingOver ? 'bg-gray-800/20 rounded-lg p-2' : ''
              }`}
            >
              {visibleWidgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!isEditMode}
                >
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${getWidgetSize(widget.size)} ${
                        snapshot.isDragging ? 'opacity-80 rotate-2' : ''
                      }`}
                    >
                      <Card className={`bg-gray-900/80 backdrop-blur border-gray-700 transition-all duration-200 ${
                        isEditMode ? 'hover:border-blue-500/50 cursor-move' : ''
                      } ${snapshot.isDragging ? 'border-blue-500 shadow-lg shadow-blue-500/20' : ''}`}>
                        
                        {/* Widget Header */}
                        <div className="flex items-center justify-between p-3 border-b border-gray-700">
                          <div className="flex items-center gap-2">
                            {isEditMode && (
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-gray-400 hover:text-white cursor-grab" />
                              </div>
                            )}
                            <h4 className="text-sm font-medium text-white">{widget.title}</h4>
                            <Badge className={`text-xs ${getCategoryColor(widget.category)}`}>
                              {widget.category}
                            </Badge>
                          </div>
                          
                          {isEditMode && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleWidgetVisibility(widget.id)}
                                className="h-6 w-6 p-0"
                              >
                                <EyeOff className="w-3 h-3 text-gray-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWidget(widget.id)}
                                className="h-6 w-6 p-0 text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Widget Content */}
                        <div className={isEditMode ? 'opacity-60' : ''}>
                          {widget.component}
                        </div>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {/* Add Widget Button */}
              {isEditMode && (
                <div className="col-span-1">
                  <Card className="bg-gray-800/50 border-gray-600 border-dashed h-full min-h-[120px] flex items-center justify-center hover:border-blue-500/50 cursor-pointer transition-colors">
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-400">Add Widget</span>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Children content */}
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  );
}