import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { AuditLogService } from '../../../domains/audit-log/services/audit-log-service';
import { AuditLogRepositoryImpl } from '../../../domains/audit-log/repositories/audit-log-repository';
import { AuditAction, AuditContext } from '../../../domains/audit-log/types/audit-log-types';

export interface AuditConfig {
  enabled: boolean;
  excludeRoutes?: string[];
  excludeMethods?: string[];
  logSuccessOnly?: boolean;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  maxBodySize?: number;
}

export class AuditLogMiddleware {
  private auditLogService: AuditLogService;
  private config: AuditConfig;

  constructor(
    fastify: FastifyInstance,
    config: AuditConfig = { enabled: true }
  ) {
    this.config = {
      excludeRoutes: ['/health', '/ready', '/docs', '/docs/*'],
      excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
      logSuccessOnly: false,
      logRequestBody: false,
      logResponseBody: false,
      maxBodySize: 1024 * 10, // 10KB
      ...config
    };

    // Initialize audit log service
    const auditLogRepository = new AuditLogRepositoryImpl(fastify.knex);
    this.auditLogService = new AuditLogService(auditLogRepository);
  }

  createPreHandler(): preHandlerHookHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!this.shouldAuditRequest(request)) {
        return;
      }

      // Store start time for duration calculation
      (request as any).auditStartTime = Date.now();
      
      // Store original request data if needed
      if (this.config.logRequestBody && request.body) {
        (request as any).auditRequestBody = this.sanitizeBody(request.body);
      }
    };
  }

  createOnResponse() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!this.shouldAuditRequest(request)) {
        return;
      }

      // Skip if configured to log success only and response is not successful
      if (this.config.logSuccessOnly && reply.statusCode >= 400) {
        return;
      }

      try {
        await this.logRequest(request, reply);
      } catch (error) {
        // Don't let audit logging failure affect the main request
        request.log.error('Failed to create audit log', error);
      }
    };
  }

  createOnError() {
    return async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      if (!this.shouldAuditRequest(request)) {
        return;
      }

      try {
        const context = this.extractContext(request);
        const action = this.mapMethodToAction(request.method);
        const resourceType = this.extractResourceType(request.url);

        await this.auditLogService.logError(
          action,
          resourceType,
          error,
          context,
          this.extractResourceId(request.url) || undefined,
          this.buildMetadata(request, reply, error)
        );
      } catch (auditError) {
        request.log.error('Failed to create error audit log', auditError);
      }
    };
  }

  private shouldAuditRequest(request: FastifyRequest): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Skip excluded routes
    if (this.config.excludeRoutes?.some(route => {
      if (route.endsWith('/*')) {
        return request.url.startsWith(route.slice(0, -2));
      }
      return request.url === route || request.url.startsWith(route + '?');
    })) {
      return false;
    }

    // Skip excluded methods
    if (this.config.excludeMethods?.includes(request.method)) {
      return false;
    }

    return true;
  }

  private async logRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const context = this.extractContext(request);
    const action = this.mapMethodToAction(request.method);
    const resourceType = this.extractResourceType(request.url);
    const resourceId = this.extractResourceId(request.url);
    const status = reply.statusCode < 400 ? 'success' : 'failed';

    await this.auditLogService.logAction(
      action,
      resourceType,
      context,
      {
        resourceId: resourceId || undefined,
        metadata: this.buildMetadata(request, reply),
        status,
        errorMessage: reply.statusCode >= 400 ? `HTTP ${reply.statusCode}` : undefined
      }
    );
  }

  private extractContext(request: FastifyRequest): AuditContext {
    return {
      user_id: (request as any).user?.id || null,
      ip_address: request.ip || 
                 request.headers['x-forwarded-for'] as string || 
                 request.headers['x-real-ip'] as string || 
                 request.socket?.remoteAddress || 
                 undefined,
      user_agent: request.headers['user-agent'] || undefined,
      session_id: request.headers['x-session-id'] as string || 
                  request.headers['authorization']?.split(' ')[1] || 
                  undefined,
      request_id: request.headers['x-request-id'] as string || 
                  (request as any).id || 
                  null
    };
  }

  private mapMethodToAction(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'GET':
        return 'READ';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'READ';
    }
  }

  private extractResourceType(url: string): string {
    // Remove query parameters
    const cleanUrl = url.split('?')[0];
    
    // Extract resource type from URL pattern
    // Examples: /api/v1/users -> users, /api/v1/auth/login -> auth
    const pathParts = cleanUrl.split('/').filter(part => part.length > 0);
    
    // Skip common prefixes
    const skipPrefixes = ['api', 'v1', 'v2'];
    const relevantParts = pathParts.filter(part => !skipPrefixes.includes(part));
    
    if (relevantParts.length === 0) {
      return 'unknown';
    }
    
    return relevantParts[0];
  }

  private extractResourceId(url: string): string | null {
    // Remove query parameters
    const cleanUrl = url.split('?')[0];
    const pathParts = cleanUrl.split('/').filter(part => part.length > 0);
    
    // Look for UUID-like patterns or numeric IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const numericRegex = /^\d+$/;
    
    for (const part of pathParts) {
      if (uuidRegex.test(part) || numericRegex.test(part)) {
        return part;
      }
    }
    
    return null;
  }

  private buildMetadata(
    request: FastifyRequest, 
    reply: FastifyReply, 
    error?: Error
  ): Record<string, any> {
    const metadata: Record<string, any> = {
      method: request.method,
      url: request.url,
      status_code: reply.statusCode,
      duration_ms: (request as any).auditStartTime ? 
        Date.now() - (request as any).auditStartTime : 
        null,
      headers: this.sanitizeHeaders(request.headers),
      query_params: request.query || {}
    };

    // Add request body if configured
    if (this.config.logRequestBody && (request as any).auditRequestBody) {
      metadata.request_body = (request as any).auditRequestBody;
    }

    // Add response body if configured and available
    if (this.config.logResponseBody && reply.statusCode < 400) {
      // Note: This is complex to implement with Fastify as response body is not easily accessible
      // Would need to modify response serialization if needed
    }

    // Add error details if present
    if (error) {
      metadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // Limit stack trace
      };
    }

    return metadata;
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-session-id'
    ];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = JSON.parse(JSON.stringify(body));
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'secret',
      'key',
      'credit_card',
      'ssn',
      'social_security_number'
    ];
    
    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }
      
      return obj;
    };
    
    const result = sanitizeObject(sanitized);
    
    // Limit size
    const serialized = JSON.stringify(result);
    if (serialized.length > (this.config.maxBodySize || 10240)) {
      return { _truncated: true, _size: serialized.length };
    }
    
    return result;
  }
}

// Helper function to register audit middleware
export function registerAuditMiddleware(
  fastify: FastifyInstance,
  config?: AuditConfig
): void {
  const auditMiddleware = new AuditLogMiddleware(fastify, config);
  
  // Register hooks
  fastify.addHook('preHandler', auditMiddleware.createPreHandler());
  fastify.addHook('onResponse', auditMiddleware.createOnResponse());
  fastify.addHook('onError', auditMiddleware.createOnError());
}