/**
 * Type declarations for external packages without @types/*
 * Eliminates TS2307 errors for packages used in non-critical paths
 */


// Web Speech API (not in all TS lib targets)
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare var SpeechRecognition: {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
};

declare module 'vite-plugin-dts' {
  const plugin: (...args: any[]) => any;
  export default plugin;
}

declare module '@vitejs/plugin-react-swc' {
  const plugin: (...args: any[]) => any;
  export default plugin;
}

declare module 'supertest' {
  import type { Server } from 'http';
  function supertest(app: any): any;
  export = supertest;
}

declare module 'react-grid-layout' {
  import type { ComponentType } from 'react';
  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }
  export interface ReactGridLayoutProps {
    layout?: Layout[];
    cols?: number;
    rowHeight?: number;
    width?: number;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    onLayoutChange?: (layout: Layout[]) => void;
    draggableHandle?: string;
    isDraggable?: boolean;
    isResizable?: boolean;
  }
  export const WidthProvider: (component: ComponentType<any>) => ComponentType<any>;
  export const Responsive: ComponentType<any>;
  const ReactGridLayout: ComponentType<ReactGridLayoutProps>;
  export default ReactGridLayout;
}

declare module 'langchain/text_splitter' {
  export class RecursiveCharacterTextSplitter {
    constructor(options?: { chunkSize?: number; chunkOverlap?: number });
    splitText(text: string): Promise<string[]>;
    createDocuments(texts: string[]): Promise<any[]>;
  }
}

declare module 'langchain/document' {
  export class Document {
    pageContent: string;
    metadata: Record<string, any>;
    constructor(fields: { pageContent: string; metadata?: Record<string, any> });
  }
}

declare module '@pinecone-database/pinecone' {
  export class Pinecone {
    constructor(config?: { apiKey?: string; environment?: string });
    index(name: string): any;
    listIndexes(): Promise<any[]>;
    createIndex(config: any): Promise<any>;
  }
  export class PineconeClient {
    init(config: { apiKey: string; environment: string }): Promise<void>;
    Index(name: string): any;
  }
}
