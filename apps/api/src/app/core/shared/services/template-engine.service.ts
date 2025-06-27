import { EventEmitter } from 'events';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { FastifyInstance } from 'fastify';
// import Handlebars from 'handlebars';
import {
  TemplateEngineConfig,
  TemplateData,
  TemplateOptions,
  TemplateResult,
  EmailTemplate,
  DocumentTemplate,
  TemplateCache,
  TemplateMetrics,
  TemplateEngineEventData,
  TemplateEngine,
  TemplateContext,
  DocumentFormat,
} from '../types/template-engine.types';

export class TemplateEngineService extends EventEmitter {
  private fastify: FastifyInstance;
  private config: TemplateEngineConfig;
  private cache: Map<string, TemplateCache> = new Map();
  private compiledTemplates: Map<string, any> = new Map();
  private templates: Map<string, EmailTemplate | DocumentTemplate> = new Map();
  private metrics: TemplateMetrics;
  private engines: Map<TemplateEngine, any> = new Map();

  constructor(fastify: FastifyInstance, config?: Partial<TemplateEngineConfig>) {
    super();
    this.fastify = fastify;
    this.config = this.buildConfig(config);
    this.metrics = this.initializeMetrics();
    this.initializeEngines();
  }

  private buildConfig(config?: Partial<TemplateEngineConfig>): TemplateEngineConfig {
    return {
      defaultEngine: config?.defaultEngine ?? 'handlebars',
      enableCaching: config?.enableCaching ?? true,
      cacheTimeout: config?.cacheTimeout ?? 300000, // 5 minutes
      maxCacheSize: config?.maxCacheSize ?? 100,
      templatesDirectory: config?.templatesDirectory ?? './templates',
      partialsDirectory: config?.partialsDirectory ?? './templates/partials',
      helpersDirectory: config?.helpersDirectory ?? './templates/helpers',
      enableMinification: config?.enableMinification ?? true,
      enableCompression: config?.enableCompression ?? false,
      autoEscape: config?.autoEscape ?? true,
      strict: config?.strict ?? true,
    };
  }

  private initializeMetrics(): TemplateMetrics {
    return {
      totalRenders: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageRenderTime: 0,
      totalRenderTime: 0,
      errorCount: 0,
      byEngine: {} as any,
      byTemplate: {},
      cacheMetrics: {
        size: 0,
        maxSize: this.config.maxCacheSize,
        hitRate: 0,
        evictions: 0,
      },
    };
  }

  private initializeEngines(): void {
    // Initialize Mock Handlebars for now (template engine will be implemented properly later)
    const mockHandlebars = {
      create: () => mockHandlebars,
      compile: (source: string) => (data: any) => `Rendered: ${source} with data: ${JSON.stringify(data)}`,
      registerHelper: () => {},
    };
    this.engines.set('handlebars', mockHandlebars);
    
    // Register built-in helpers
    this.registerHandlebarsHelpers();
    
    // Initialize metrics for each engine
    const engineNames: TemplateEngine[] = ['handlebars', 'mustache', 'ejs', 'pug', 'nunjucks', 'liquid'];
    engineNames.forEach(engine => {
      this.metrics.byEngine[engine] = {
        renders: 0,
        averageTime: 0,
        errorRate: 0,
      };
    });
  }

  private registerHandlebarsHelpers(): void {
    const handlebars = this.engines.get('handlebars');
    if (!handlebars) return;

    // Date formatting helper
    handlebars.registerHelper('formatDate', (date: Date, format: string = 'YYYY-MM-DD') => {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    });

    // Currency formatting helper
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
      if (typeof amount !== 'number') return amount;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Conditional helper
    handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    handlebars.registerHelper('lt', (a: any, b: any) => a < b);

    // Array helpers
    handlebars.registerHelper('length', (array: any[]) => array?.length || 0);
    handlebars.registerHelper('first', (array: any[]) => array?.[0]);
    handlebars.registerHelper('last', (array: any[]) => array?.[array.length - 1]);

    // String helpers
    handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());
    handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
    handlebars.registerHelper('capitalize', (str: string) => 
      str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''
    );

    // Healthcare-specific helpers
    handlebars.registerHelper('patientAge', (birthDate: Date) => {
      if (!birthDate) return '';
      const today = new Date();
      const birth = new Date(birthDate);
      const age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        return age - 1;
      }
      return age;
    });

    handlebars.registerHelper('formatMedicalId', (id: string) => {
      if (!id) return '';
      // Format as XXX-XX-XXXX pattern for medical IDs
      return id.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');
    });
  }

  async loadTemplatesFromDirectory(): Promise<void> {
    try {
      const templatesDir = this.config.templatesDirectory;
      const files = await readdir(templatesDir);
      
      for (const file of files) {
        const filePath = join(templatesDir, file as string);
        const fileStats = await stat(filePath);
        
        if (fileStats.isFile() && this.isTemplateFile(filePath)) {
          await this.loadTemplate(filePath);
        }
      }
      
      this.fastify.log.info(`Loaded ${this.templates.size} templates from directory`);
    } catch (error) {
      this.fastify.log.error('Failed to load templates from directory:', error);
    }
  }

  private isTemplateFile(filePath: string): boolean {
    const validExtensions = ['.hbs', '.handlebars', '.mustache', '.ejs', '.pug', '.njk', '.liquid'];
    return validExtensions.includes(extname(filePath));
  }

  private async loadTemplate(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const fileName = basename(filePath, extname(filePath));
      
      // Try to parse template metadata from comments
      const metadata = this.parseTemplateMetadata(content);
      
      const template: EmailTemplate = {
        name: fileName,
        subject: metadata.subject || fileName,
        htmlTemplate: content,
        textTemplate: metadata.textTemplate,
        attachments: metadata.attachments || [],
        variables: metadata.variables || [],
        category: metadata.category || 'system',
        language: metadata.language || 'en',
        version: metadata.version || '1.0.0',
      };
      
      this.templates.set(fileName, template);
    } catch (error) {
      this.fastify.log.error(`Failed to load template ${filePath}:`, error);
    }
  }

  private parseTemplateMetadata(content: string): any {
    // Extract metadata from template comments
    const metadataMatch = content.match(/<!--\s*TEMPLATE_METADATA\s*([\s\S]*?)\s*-->/);
    if (metadataMatch) {
      try {
        return JSON.parse(metadataMatch[1]);
      } catch (error) {
        this.fastify.log.warn('Failed to parse template metadata:', error);
      }
    }
    return {};
  }

  async render(
    templateName: string,
    data: TemplateData,
    options: TemplateOptions = {}
  ): Promise<TemplateResult> {
    const startTime = Date.now();
    const engine = options.engine || this.config.defaultEngine;
    const cacheKey = this.generateCacheKey(templateName, data, options);

    this.emit('template-rendered', {
      type: 'template-rendered',
      timestamp: new Date(),
      templateName,
      engine,
      data: { cacheKey },
    } as TemplateEngineEventData);

    try {
      // Check cache first
      if (this.config.enableCaching && options.cache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.updateMetrics(templateName, engine, Date.now() - startTime, true);
          return {
            html: cached.result,
            metadata: {
              engine,
              renderTime: Date.now() - startTime,
              cacheHit: true,
              size: cached.size,
              minified: false,
            },
          };
        }
      }

      // Get or compile template
      const compiled = await this.getCompiledTemplate(templateName, engine);
      
      // Prepare data with context
      const templateData = this.prepareTemplateData(data, options.context);
      
      // Render template
      let html = '';
      switch (engine) {
        case 'handlebars':
          html = compiled(templateData);
          break;
        default:
          throw new Error(`Template engine '${engine}' not supported`);
      }

      // Apply post-processing
      if (this.config.enableMinification && options.minify !== false) {
        html = this.minifyHtml(html);
      }

      // Cache result
      if (this.config.enableCaching && options.cache !== false) {
        this.addToCache(cacheKey, templateName, compiled, templateData, html, options.cacheTTL);
      }

      const renderTime = Date.now() - startTime;
      this.updateMetrics(templateName, engine, renderTime, false);

      return {
        html,
        metadata: {
          engine,
          renderTime,
          cacheHit: false,
          size: Buffer.byteLength(html, 'utf8'),
          minified: this.config.enableMinification && options.minify !== false,
        },
      };
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.byEngine[engine].errorRate = 
        this.metrics.errorCount / this.metrics.totalRenders;

      this.emit('template-error', {
        type: 'template-error',
        timestamp: new Date(),
        templateName,
        engine,
        data: { error: (error as Error).message },
      } as TemplateEngineEventData);

      throw error;
    }
  }

  private async getCompiledTemplate(templateName: string, engine: TemplateEngine): Promise<any> {
    const cacheKey = `${templateName}:${engine}`;
    
    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey);
    }

    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let compiled: any;
    switch (engine) {
      case 'handlebars':
        const handlebars = this.engines.get('handlebars');
        compiled = handlebars.compile((template as any).htmlTemplate || (template as any).content?.html || 'Template content not found', {
          strict: this.config.strict,
          noEscape: !this.config.autoEscape,
        });
        break;
      default:
        throw new Error(`Template engine '${engine}' not supported`);
    }

    this.compiledTemplates.set(cacheKey, compiled);
    
    this.emit('template-compiled', {
      type: 'template-compiled',
      timestamp: new Date(),
      templateName,
      engine,
    } as TemplateEngineEventData);

    return compiled;
  }

  private prepareTemplateData(data: TemplateData, context?: TemplateContext): TemplateData {
    return {
      ...data,
      _context: context,
      _timestamp: new Date(),
      _helpers: {
        currentYear: new Date().getFullYear(),
        currentDate: new Date().toISOString().split('T')[0],
      },
    };
  }

  private generateCacheKey(
    templateName: string,
    data: TemplateData,
    options: TemplateOptions
  ): string {
    if (options.cacheKey) {
      return options.cacheKey;
    }
    
    const dataHash = this.hashObject(data);
    const optionsHash = this.hashObject({
      engine: options.engine,
      layout: options.layout,
      minify: options.minify,
    });
    
    return `${templateName}:${dataHash}:${optionsHash}`;
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 16);
  }

  private getFromCache(key: string): TemplateCache | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.metrics.cacheMisses++;
      this.emit('cache-miss', {
        type: 'cache-miss',
        timestamp: new Date(),
        data: { key },
      } as TemplateEngineEventData);
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    cached.hits++;
    this.metrics.cacheHits++;
    
    this.emit('cache-hit', {
      type: 'cache-hit',
      timestamp: new Date(),
      data: { key, hits: cached.hits },
    } as TemplateEngineEventData);

    return cached;
  }

  private addToCache(
    key: string,
    templateName: string,
    compiled: any,
    data: TemplateData,
    result: string,
    ttl?: number
  ): void {
    // Check cache size limits
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestCache();
    }

    const cacheEntry: TemplateCache = {
      key,
      template: templateName,
      compiled,
      data,
      result,
      timestamp: new Date(),
      ttl: ttl || this.config.cacheTimeout,
      hits: 0,
      size: Buffer.byteLength(result, 'utf8'),
    };

    this.cache.set(key, cacheEntry);
    this.metrics.cacheMetrics.size = this.cache.size;
    
    this.emit('template-compiled', {
      type: 'template-compiled',
      timestamp: new Date(),
      data: { key, templateName, size: cacheEntry.size },
    } as TemplateEngineEventData);
  }

  private evictOldestCache(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, cache] of this.cache) {
      if (cache.timestamp.getTime() < oldestTime) {
        oldestTime = cache.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.cacheMetrics.evictions++;
    }
  }

  private minifyHtml(html: string): string {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  private updateMetrics(
    templateName: string,
    engine: TemplateEngine,
    renderTime: number,
    cacheHit: boolean
  ): void {
    this.metrics.totalRenders++;
    this.metrics.totalRenderTime += renderTime;
    this.metrics.averageRenderTime = this.metrics.totalRenderTime / this.metrics.totalRenders;

    // Update engine metrics
    const engineMetrics = this.metrics.byEngine[engine];
    engineMetrics.renders++;
    engineMetrics.averageTime = 
      (engineMetrics.averageTime * (engineMetrics.renders - 1) + renderTime) / engineMetrics.renders;

    // Update template metrics
    if (!this.metrics.byTemplate[templateName]) {
      this.metrics.byTemplate[templateName] = {
        renders: 0,
        averageTime: 0,
        lastRendered: new Date(),
      };
    }
    
    const templateMetrics = this.metrics.byTemplate[templateName];
    templateMetrics.renders++;
    templateMetrics.averageTime = 
      (templateMetrics.averageTime * (templateMetrics.renders - 1) + renderTime) / templateMetrics.renders;
    templateMetrics.lastRendered = new Date();

    // Update cache metrics
    this.metrics.cacheMetrics.hitRate = 
      this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100;

    this.emit('template-rendered', {
      type: 'template-rendered',
      timestamp: new Date(),
      data: { templateName, engine, renderTime, cacheHit },
    } as TemplateEngineEventData);
  }

  // Email-specific methods
  async renderEmail(
    templateName: string,
    data: TemplateData,
    options: TemplateOptions = {}
  ): Promise<{ html: string; text?: string; subject: string }> {
    const template = this.templates.get(templateName) as EmailTemplate;
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const htmlResult = await this.render(templateName, data, options);
    let textResult: TemplateResult | undefined;

    if (template.textTemplate) {
      textResult = await this.render(`${templateName}_text`, data, options);
    }

    // Render subject line
    const handlebars = this.engines.get('handlebars');
    const subjectTemplate = handlebars.compile(template.subject);
    const subject = subjectTemplate(this.prepareTemplateData(data, options.context));

    return {
      html: htmlResult.html,
      text: textResult?.html,
      subject,
    };
  }

  // Document-specific methods
  async renderDocument(
    templateName: string,
    data: TemplateData,
    format: DocumentFormat = 'html',
    options: TemplateOptions = {}
  ): Promise<TemplateResult> {
    const result = await this.render(templateName, data, options);
    
    // For now, we only support HTML format
    // PDF, DOCX, etc. would require additional libraries
    if (format !== 'html') {
      throw new Error(`Document format '${format}' not yet supported`);
    }

    return result;
  }

  // Template management methods
  registerTemplate(template: EmailTemplate | DocumentTemplate): void {
    this.templates.set(template.name, template);
    this.fastify.log.info(`Template '${template.name}' registered`);
  }

  getTemplate(name: string): EmailTemplate | DocumentTemplate | undefined {
    return this.templates.get(name);
  }

  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  removeTemplate(name: string): boolean {
    const removed = this.templates.delete(name);
    if (removed) {
      // Clear related compiled templates and cache
      this.clearTemplateCache(name);
      this.fastify.log.info(`Template '${name}' removed`);
    }
    return removed;
  }

  clearTemplateCache(templateName?: string): void {
    if (templateName) {
      // Clear specific template cache
      for (const [key, cache] of this.cache) {
        if (cache.template === templateName) {
          this.cache.delete(key);
        }
      }
      
      // Clear compiled templates
      for (const key of this.compiledTemplates.keys()) {
        if (key.startsWith(templateName + ':')) {
          this.compiledTemplates.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
      this.compiledTemplates.clear();
    }
    
    this.metrics.cacheMetrics.size = this.cache.size;
  }

  // Helper registration
  registerHelper(name: string, helper: Function, engine: TemplateEngine = 'handlebars'): void {
    switch (engine) {
      case 'handlebars':
        const handlebars = this.engines.get('handlebars');
        handlebars.registerHelper(name, helper);
        break;
      default:
        throw new Error(`Helper registration not supported for engine '${engine}'`);
    }
  }

  // Metrics and monitoring
  getMetrics(): TemplateMetrics {
    return { ...this.metrics };
  }

  clearMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheStats(): any {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: this.metrics.cacheMetrics.hitRate,
      evictions: this.metrics.cacheMetrics.evictions,
      entries: Array.from(this.cache.values()).map(cache => ({
        key: cache.key,
        template: cache.template,
        hits: cache.hits,
        size: cache.size,
        age: Date.now() - cache.timestamp.getTime(),
      })),
    };
  }

  getConfig(): TemplateEngineConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<TemplateEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Clear cache if caching was disabled
    if (!this.config.enableCaching) {
      this.clearTemplateCache();
    }
  }
}