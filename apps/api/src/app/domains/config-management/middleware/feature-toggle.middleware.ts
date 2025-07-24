import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '../services/config-service';
import { ConfigEnvironment } from '../types/config.types';

/**
 * Feature Toggle Middleware
 * ใช้สำหรับตรวจสอบว่า feature เปิดใช้งานหรือไม่
 */

export interface FeatureToggleOptions {
  /** ชื่อ feature ที่ต้องการตรวจสอบ */
  featureName: string;
  /** Environment ที่ใช้ตรวจสอบ (ถ้าไม่ระบุจะใช้จาก process.env.NODE_ENV) */
  environment?: ConfigEnvironment;
  /** Response เมื่อ feature ปิดอยู่ */
  disabledResponse?: {
    statusCode?: number;
    message?: string;
    data?: any;
  };
  /** Function สำหรับตรวจสอบเพิ่มเติม (optional) */
  customCheck?: (request: FastifyRequest, reply: FastifyReply) => boolean | Promise<boolean>;
}

/**
 * สร้าง middleware สำหรับตรวจสอบ feature toggle
 */
export function createFeatureToggleMiddleware(options: FeatureToggleOptions) {
  return async function featureToggleMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const configService = request.server.configService as ConfigService;
      
      if (!configService) {
        request.log.error('ConfigService not available in feature toggle middleware');
        return reply.status(500).send({
          success: false,
          message: 'Configuration service unavailable',
        });
      }

      // กำหนด environment ที่ใช้ตรวจสอบ
      const environment = options.environment || 
                         (process.env.NODE_ENV as ConfigEnvironment) || 
                         'development';

      // ตรวจสอบ feature toggle
      const isEnabled = await configService.isFeatureEnabled(options.featureName, environment);

      if (!isEnabled) {
        // ตรวจสอบเพิ่มเติมถ้ามี
        if (options.customCheck) {
          const customResult = await options.customCheck(request, reply);
          if (customResult) {
            return; // ผ่านการตรวจสอบเพิ่มเติม
          }
        }

        // Feature ปิดอยู่
        const response = options.disabledResponse || {
          statusCode: 404,
          message: `Feature '${options.featureName}' is not available`,
        };

        request.log.info(`Feature toggle blocked request`, {
          featureName: options.featureName,
          environment,
          path: request.url,
          method: request.method,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        });

        return reply.status(response.statusCode || 404).send({
          success: false,
          message: response.message,
          data: response.data,
          feature: options.featureName,
          environment,
        });
      }

      // Feature เปิดอยู่ ให้ผ่านไปยัง handler ถัดไป
      request.log.debug(`Feature toggle allowed request`, {
        featureName: options.featureName,
        environment,
        path: request.url,
      });

    } catch (error) {
      request.log.error('Feature toggle middleware error:', error);
      
      // Fail-safe: ในกรณีเกิดข้อผิดพลาด ให้อนุญาต request (หรือสามารถเปลี่ยนเป็นปฏิเสธได้)
      // ขึ้นอยู่กับ security policy ของระบบ
      request.log.warn(`Feature toggle check failed, allowing request (fail-safe)`, {
        featureName: options.featureName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Middleware สำหรับตรวจสอบหลาย features พร้อมกัน
 */
export function createMultiFeatureToggleMiddleware(features: {
  featureName: string;
  required?: boolean; // ถ้า true = ต้องเปิดถึงจะผ่าน, false = เปิดอย่างใดอย่างหนึ่งก็ผ่าน
}[], options: {
  environment?: ConfigEnvironment;
  requireAll?: boolean; // true = ต้องเปิดทุก feature, false = เปิดอย่างใดอย่างหนึ่งก็ผ่าน
  disabledResponse?: {
    statusCode?: number;
    message?: string;
    data?: any;
  };
} = {}) {
  
  return async function multiFeatureToggleMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const configService = request.server.configService as ConfigService;
      
      if (!configService) {
        request.log.error('ConfigService not available in multi-feature toggle middleware');
        return reply.status(500).send({
          success: false,
          message: 'Configuration service unavailable',
        });
      }

      const environment = options.environment || 
                         (process.env.NODE_ENV as ConfigEnvironment) || 
                         'development';

      const featureStates: Record<string, boolean> = {};
      
      // ตรวจสอบทุก feature
      for (const feature of features) {
        const isEnabled = await configService.isFeatureEnabled(feature.featureName, environment);
        featureStates[feature.featureName] = isEnabled;
      }

      // ตรวจสอบเงื่อนไข
      const requireAll = options.requireAll !== false; // default true
      let shouldAllow = false;

      if (requireAll) {
        // ต้องเปิดทุก feature
        shouldAllow = features.every(f => featureStates[f.featureName]);
      } else {
        // เปิดอย่างใดอย่างหนึ่งก็ผ่าน
        shouldAllow = features.some(f => featureStates[f.featureName]);
      }

      if (!shouldAllow) {
        const response = options.disabledResponse || {
          statusCode: 404,
          message: `Required features are not available`,
        };

        const disabledFeatures = features
          .filter(f => !featureStates[f.featureName])
          .map(f => f.featureName);

        request.log.info(`Multi-feature toggle blocked request`, {
          requiredFeatures: features.map(f => f.featureName),
          disabledFeatures,
          environment,
          requireAll,
          path: request.url,
          method: request.method,
        });

        return reply.status(response.statusCode || 404).send({
          success: false,
          message: response.message,
          data: response.data,
          requiredFeatures: features.map(f => f.featureName),
          disabledFeatures,
          featureStates,
          environment,
        });
      }

      request.log.debug(`Multi-feature toggle allowed request`, {
        features: features.map(f => f.featureName),
        featureStates,
        environment,
      });

    } catch (error) {
      request.log.error('Multi-feature toggle middleware error:', error);
      
      // Fail-safe: allow request on error
      request.log.warn(`Multi-feature toggle check failed, allowing request (fail-safe)`, {
        features: features.map(f => f.featureName),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Decorator สำหรับใช้ feature toggle ใน route handler
 */
export function requireFeature(
  featureName: string, 
  environment?: ConfigEnvironment,
  customMessage?: string
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(request: FastifyRequest, reply: FastifyReply) {
      try {
        const configService = request.server.configService as ConfigService;
        
        if (!configService) {
          return reply.status(500).send({
            success: false,
            message: 'Configuration service unavailable',
          });
        }

        const env = environment || (process.env.NODE_ENV as ConfigEnvironment) || 'development';
        const isEnabled = await configService.isFeatureEnabled(featureName, env);

        if (!isEnabled) {
          return reply.status(404).send({
            success: false,
            message: customMessage || `Feature '${featureName}' is not available`,
            feature: featureName,
            environment: env,
          });
        }

        return originalMethod.call(this, request, reply);
      } catch (error) {
        request.log.error('Feature toggle decorator error:', error);
        return originalMethod.call(this, request, reply); // Fail-safe
      }
    };

    return descriptor;
  };
}

/**
 * Helper function สำหรับตรวจสอบ feature toggle ใน route handler
 */
export async function checkFeatureToggle(
  request: FastifyRequest,
  featureName: string,
  environment?: ConfigEnvironment
): Promise<boolean> {
  try {
    const configService = request.server.configService as ConfigService;
    
    if (!configService) {
      request.log.error('ConfigService not available for feature toggle check');
      return false;
    }

    const env = environment || (process.env.NODE_ENV as ConfigEnvironment) || 'development';
    return await configService.isFeatureEnabled(featureName, env);
  } catch (error) {
    request.log.error('Feature toggle check error:', error);
    return false; // Fail-safe
  }
}