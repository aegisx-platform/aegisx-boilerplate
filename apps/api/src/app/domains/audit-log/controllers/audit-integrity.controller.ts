import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditIntegrityService } from '../services/audit-integrity.service';

/**
 * Audit Integrity Controller
 * 
 * Handles HTTP requests for audit integrity operations
 */
export class AuditIntegrityController {
  
  constructor(private auditIntegrityService: AuditIntegrityService) {}

  /**
   * Get security statistics
   */
  public async getSecurityStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.auditIntegrityService.getSecurityStats();
      return reply.code(200).send({
        success: true,
        data: stats
      });
    } catch (error) {
      request.log.error('Failed to get security stats', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get security statistics'
      });
    }
  }

  /**
   * Verify integrity for date range
   */
  public async verifyIntegrity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { from_date, to_date } = request.body as {
        from_date: string;
        to_date: string;
      };

      const fromDate = new Date(from_date);
      const toDate = new Date(to_date);

      // Validate dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid date format'
        });
      }

      if (fromDate >= toDate) {
        return reply.code(400).send({
          success: false,
          error: 'from_date must be before to_date'
        });
      }

      const result = await this.auditIntegrityService.verifyIntegrityByDateRange(fromDate, toDate);
      
      return reply.code(200).send({
        success: true,
        data: {
          verification_result: result,
          period: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          }
        }
      });
    } catch (error) {
      request.log.error('Failed to verify integrity', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to verify integrity'
      });
    }
  }

  /**
   * Detect tampering in audit logs
   */
  public async detectTampering(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { from_date, to_date } = request.body as {
        from_date?: string;
        to_date?: string;
      };

      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (from_date && to_date) {
        fromDate = new Date(from_date);
        toDate = new Date(to_date);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid date format'
          });
        }
      }

      const result = await this.auditIntegrityService.detectTamperingAndReport(fromDate, toDate);
      
      // Log critical security events
      if (result.tampered_records.length > 0) {
        request.log.warn('SECURITY ALERT: Tampering detected in audit logs', {
          tampered_count: result.tampered_records.length,
          integrity_score: result.integrity_score,
          tampered_records: result.tampered_records
        });
      }

      return reply.code(200).send({
        success: true,
        data: result,
        alert: result.tampered_records.length > 0 ? 'TAMPERING_DETECTED' : null
      });
    } catch (error) {
      request.log.error('Failed to detect tampering', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to detect tampering'
      });
    }
  }

  /**
   * Generate integrity proof for audit record
   */
  public async generateIntegrityProof(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { auditId } = request.params as { auditId: string };

      const proof = await this.auditIntegrityService.generateIntegrityProof(auditId);
      
      if (!proof) {
        return reply.code(404).send({
          success: false,
          error: 'Audit record not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          audit_id: auditId,
          integrity_proof: proof,
          generated_at: new Date().toISOString(),
          verification_instructions: 'Use POST /audit/integrity/verify-proof to verify this proof'
        }
      });
    } catch (error) {
      request.log.error('Failed to generate integrity proof', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate integrity proof'
      });
    }
  }

  /**
   * Verify integrity proof
   */
  public async verifyIntegrityProof(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { proof } = request.body as { proof: string };

      const isValid = await this.auditIntegrityService.verifyIntegrityProof(proof);
      
      return reply.code(200).send({
        success: true,
        data: {
          is_valid: isValid,
          verified_at: new Date().toISOString(),
          status: isValid ? 'PROOF_VALID' : 'PROOF_INVALID'
        }
      });
    } catch (error) {
      request.log.error('Failed to verify integrity proof', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to verify integrity proof'
      });
    }
  }

  /**
   * Run full integrity check
   */
  public async runFullIntegrityCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { batch_size = 1000 } = request.body as { batch_size?: number };

      // Start async integrity check
      const checkPromise = this.auditIntegrityService.runIntegrityCheck(batch_size);
      
      // Return immediately with job started status
      reply.code(202).send({
        success: true,
        message: 'Full integrity check started',
        job_id: `integrity_check_${Date.now()}`,
        status: 'RUNNING'
      });

      // Process check in background
      try {
        const result = await checkPromise;
        
        request.log.info('Full integrity check completed', {
          total_records: result.total_records,
          verified_records: result.verified_records,
          integrity_score: result.integrity_score,
          tampered_count: result.tampered_records.length
        });

        if (result.tampered_records.length > 0) {
          request.log.warn('CRITICAL SECURITY ALERT: Tampering detected during full check', {
            tampered_records: result.tampered_records
          });
        }
      } catch (error) {
        request.log.error('Full integrity check failed', error);
      }

    } catch (error) {
      request.log.error('Failed to start integrity check', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to start integrity check'
      });
    }
  }

  /**
   * Get public key for external verification
   */
  public async getPublicKey(request: FastifyRequest, reply: FastifyReply) {
    try {
      const publicKey = this.auditIntegrityService.getPublicKey();
      
      return reply.code(200).send({
        success: true,
        data: {
          public_key: publicKey,
          key_format: 'PEM',
          algorithm: 'RS256',
          usage: 'Digital signature verification for audit logs'
        }
      });
    } catch (error) {
      request.log.error('Failed to get public key', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get public key'
      });
    }
  }
}