'use client'

import { useEffect, useRef, memo } from 'react'

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  width?: string | number;
  height?: string | number;
  interval?: string;
  timezone?: string;
  style?: string;
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  allow_symbol_change?: boolean;
  save_image?: boolean;
  container_id?: string;
}

function TradingViewWidget({
  symbol = 'BITSTAMP:BTCUSD',
  theme = 'dark',
  width = '100%',
  height = '100%',
  interval = '60',
  timezone = 'Etc/UTC',
  style = '1',
  locale = 'en',
  toolbar_bg = 'rgba(0, 0, 0, 0.2)',
  enable_publishing = false,
  allow_symbol_change = true,
  save_image = true,
  container_id = 'tradingview_widget'
}: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Remove any existing script
    const existingScript = document.getElementById('tradingview-widget-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Create a new script element
    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined' && container.current) {
        new window.TradingView.widget({
          autosize: true,
          symbol,
          interval,
          timezone,
          theme,
          style,
          locale,
          toolbar_bg,
          enable_publishing,
          allow_symbol_change,
          save_image,
          container_id
        });
      }
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [symbol, theme, interval, timezone, style, locale, toolbar_bg, enable_publishing, allow_symbol_change, save_image, container_id]);

  return (
    <div ref={container} id={container_id} style={{ width, height }} />
  );
}

// TradingView Window interface declared in TradingViewWidget.tsx

export default memo(TradingViewWidget);
