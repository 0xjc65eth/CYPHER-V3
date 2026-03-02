import React from 'react';

/**
 * ChartVirtualization - Stub
 * Wraps chart components for virtualized rendering of large datasets.
 */
function chartVirtualization(
  ChartComponent: React.ComponentType<any>,
  props: any
): React.ReactElement {
  return React.createElement(ChartComponent, props);
}

export default chartVirtualization;
