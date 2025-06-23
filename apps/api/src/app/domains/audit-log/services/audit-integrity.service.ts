import { FastifyInstance } from 'fastify';
import { SecureAuditService } from '../../../core/shared/services/secure-audit.service';

/**
 * Audit Integrity Service - Business Logic Layer
 * 
 * Handles all audit integrity operations including:
 * - Security statistics
 * - Chain verification  
 * - Tampering detection
 * - Proof generation and verification
 */
export class AuditIntegrityService {
  private secureAuditService: SecureAuditService;
  private initialized = false;

  constructor(private fastify: FastifyInstance) {
    this.secureAuditService = new SecureAuditService(fastify);
  }

  /**
   * Initialize the service - ต้องเรียกก่อนใช้งาน
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return; // Already initialized
    }

    await this.secureAuditService.initialize();
    this.initialized = true;
    
    this.fastify.log.info('AuditIntegrityService initialized successfully');
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AuditIntegrityService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get security statistics
   */
  public async getSecurityStats() {
    this.ensureInitialized();
    return await this.secureAuditService.getSecurityStats();
  }

  /**
   * Verify integrity for date range
   */
  public async verifyIntegrityByDateRange(fromDate: Date, toDate: Date) {
    this.ensureInitialized();
    return await this.secureAuditService.verifyIntegrityByDateRange(fromDate, toDate);
  }

  /**
   * Detect tampering and generate report
   */
  public async detectTamperingAndReport(fromDate?: Date, toDate?: Date) {
    this.ensureInitialized();
    return await this.secureAuditService.detectTamperingAndReport(fromDate, toDate);
  }

  /**
   * Generate integrity proof for audit record
   */
  public async generateIntegrityProof(auditId: string) {
    this.ensureInitialized();
    return await this.secureAuditService.generateIntegrityProof(auditId);
  }

  /**
   * Verify integrity proof
   */
  public async verifyIntegrityProof(proof: string) {
    this.ensureInitialized();
    return await this.secureAuditService.verifyIntegrityProof(proof);
  }

  /**
   * Run full integrity check
   */
  public async runIntegrityCheck(batchSize: number = 1000) {
    this.ensureInitialized();
    return await this.secureAuditService.runIntegrityCheck(batchSize);
  }

  /**
   * Get public key for external verification
   */
  public getPublicKey() {
    this.ensureInitialized();
    return this.secureAuditService.getPublicKey();
  }

  /**
   * Log secure audit
   */
  public async logSecureAudit(auditData: any) {
    this.ensureInitialized();
    return await this.secureAuditService.logSecureAudit(auditData);
  }
}