import { FastifyInstance } from 'fastify';
import { AuditIntegrityService } from '../services/audit-integrity.service';
import { AuditIntegrityController } from '../controllers/audit-integrity.controller';
import {
  SecurityStatsResponseSchema,
  VerifyIntegrityRequestSchema,
  VerifyIntegrityResponseSchema,
  DetectTamperingRequestSchema,
  DetectTamperingResponseSchema,
  AuditIdParamSchema,
  IntegrityProofResponseSchema,
  VerifyProofRequestSchema,
  VerifyProofResponseSchema,
  FullCheckRequestSchema,
  FullCheckResponseSchema,
  PublicKeyResponseSchema,
  ErrorResponseSchema,
  SecurityStatsExample,
  TamperingDetectionExample,
  IntegrityProofExample
} from '../schemas/audit-integrity-schemas';

export default async function auditIntegrityRoutes(fastify: FastifyInstance) {
  // Initialize dependencies following Clean Architecture
  const auditIntegrityService = new AuditIntegrityService(fastify);
  await auditIntegrityService.initialize();
  
  const auditIntegrityController = new AuditIntegrityController(auditIntegrityService);

  // Get security statistics
  fastify.get('/integrity/stats', {
    schema: {
      summary: 'Get audit log security statistics',
      description: 'Returns statistics about audit log integrity verification',
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      response: {
        200: SecurityStatsResponseSchema,
        500: ErrorResponseSchema
      },
      examples: [
        {
          title: 'Success Response',
          response: SecurityStatsExample
        }
      ]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditIntegrityController.getSecurityStats.bind(auditIntegrityController)
  });

  // Verify integrity for date range
  fastify.post('/integrity/verify', {
    schema: {
      summary: 'Verify audit log integrity for date range',
      description: 'Verifies the integrity of audit logs within a specified date range',
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      body: VerifyIntegrityRequestSchema,
      response: {
        200: VerifyIntegrityResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditIntegrityController.verifyIntegrity.bind(auditIntegrityController)
  });

  // Run tampering detection
  fastify.post('/integrity/detect-tampering', {
    schema: {
      summary: 'Detect tampering in audit logs',
      description: 'Scans audit logs for potential tampering and returns a detailed report',
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      body: DetectTamperingRequestSchema,
      response: {
        200: DetectTamperingResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      examples: [
        {
          title: 'Tampering Detected',
          response: TamperingDetectionExample
        }
      ]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditIntegrityController.detectTampering.bind(auditIntegrityController)
  });

  // Generate integrity proof for specific audit record
  fastify.get('/integrity/proof/:auditId', {
    schema: {
      summary: 'Generate integrity proof for audit record',
      description: 'Generates a cryptographic proof of integrity for a specific audit record',
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      params: AuditIdParamSchema,
      response: {
        200: IntegrityProofResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      examples: [
        {
          title: 'Integrity Proof Generated',
          response: IntegrityProofExample
        }
      ]
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditIntegrityController.generateIntegrityProof.bind(auditIntegrityController)
  });

  // Verify integrity proof
  fastify.post('/integrity/verify-proof', {
    schema: {
      summary: 'Verify integrity proof',
      description: 'Verifies a cryptographic proof of integrity for an audit record',
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      body: VerifyProofRequestSchema,
      response: {
        200: VerifyProofResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditIntegrityController.verifyIntegrityProof.bind(auditIntegrityController)
  });

  // Run full integrity check
  fastify.post('/integrity/full-check', {
    schema: {
      summary: 'Run full integrity check on all audit logs',
      description: 'Performs a comprehensive integrity check on all audit logs (may take time)',
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      body: FullCheckRequestSchema,
      response: {
        202: FullCheckResponseSchema,
        500: ErrorResponseSchema
      }
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditIntegrityController.runFullIntegrityCheck.bind(auditIntegrityController)
  });

  // Get public key for external verification  
  fastify.get('/integrity/public-key', {
    schema: {
      summary: 'Get public key for external verification',
      description: 'Returns the public key used for digital signature verification',
      tags: ['Audit'],
      security: [{ bearerAuth: [] }],
      response: {
        200: PublicKeyResponseSchema,
        500: ErrorResponseSchema
      }
    },
    preHandler: [fastify.authenticate, fastify.rbacRequire(['admin'])],
    handler: auditIntegrityController.getPublicKey.bind(auditIntegrityController)
  });
}