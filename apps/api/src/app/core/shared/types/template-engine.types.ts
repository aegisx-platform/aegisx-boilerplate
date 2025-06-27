export interface TemplateEngineConfig {
  defaultEngine: TemplateEngine;
  enableCaching: boolean;
  cacheTimeout: number;
  maxCacheSize: number;
  templatesDirectory: string;
  partialsDirectory: string;
  helpersDirectory: string;
  enableMinification: boolean;
  enableCompression: boolean;
  autoEscape: boolean;
  strict: boolean;
}

export interface TemplateData {
  [key: string]: any;
}

export interface TemplateOptions {
  engine?: TemplateEngine;
  layout?: string;
  partials?: Record<string, string>;
  helpers?: Record<string, Function>;
  minify?: boolean;
  cache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  context?: TemplateContext;
}

export interface TemplateContext {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
    logo?: string;
  };
  request?: {
    id: string;
    timestamp: Date;
    ip: string;
  };
  metadata?: Record<string, any>;
}

export interface TemplateResult {
  html: string;
  text?: string;
  subject?: string;
  metadata: {
    engine: TemplateEngine;
    renderTime: number;
    cacheHit: boolean;
    size: number;
    minified: boolean;
  };
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  attachments?: TemplateAttachment[];
  variables: TemplateVariable[];
  category: EmailCategory;
  language: string;
  version: string;
}

export interface TemplateAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  cid?: string;
  contentType?: string;
  encoding?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: TemplateVariableValidation;
}

export interface TemplateVariableValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: any[];
}

export interface DocumentTemplate {
  name: string;
  template: string;
  format: DocumentFormat;
  variables: TemplateVariable[];
  header?: string;
  footer?: string;
  styles?: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  creator: string;
  producer: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface TemplateCache {
  key: string;
  template: string;
  compiled: any;
  data: TemplateData;
  result: string;
  timestamp: Date;
  ttl: number;
  hits: number;
  size: number;
}

export interface TemplateMetrics {
  totalRenders: number;
  cacheHits: number;
  cacheMisses: number;
  averageRenderTime: number;
  totalRenderTime: number;
  errorCount: number;
  byEngine: Record<TemplateEngine, {
    renders: number;
    averageTime: number;
    errorRate: number;
  }>;
  byTemplate: Record<string, {
    renders: number;
    averageTime: number;
    lastRendered: Date;
  }>;
  cacheMetrics: {
    size: number;
    maxSize: number;
    hitRate: number;
    evictions: number;
  };
}

export interface TemplateEngineEventData {
  type: 'template-rendered' | 'template-error' | 'cache-hit' | 'cache-miss' | 'template-compiled';
  timestamp: Date;
  templateName?: string;
  engine?: TemplateEngine;
  data?: any;
}

export type TemplateEngine = 
  | 'handlebars'
  | 'mustache'
  | 'ejs'
  | 'pug'
  | 'nunjucks'
  | 'liquid';

export type EmailCategory = 
  | 'welcome'
  | 'notification'
  | 'alert'
  | 'reminder'
  | 'report'
  | 'marketing'
  | 'system'
  | 'healthcare'
  | 'appointment'
  | 'prescription'
  | 'billing';

export type DocumentFormat = 
  | 'html'
  | 'pdf'
  | 'docx'
  | 'txt'
  | 'csv'
  | 'xlsx';

export type TemplateEngineEvents = 
  | 'template-rendered'
  | 'template-error'
  | 'cache-hit'
  | 'cache-miss'
  | 'template-compiled'
  | 'template-cached'
  | 'template-invalidated'
  | 'metrics-updated';