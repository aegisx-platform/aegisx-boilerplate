import { FastifyInstance } from 'fastify';
import { Knex } from 'knex';
import { AuditLogData } from '../audit/interfaces/audit-adapter.interface';
import { AuditCryptoService, AuditSecurityData, IntegrityVerificationResult } from './audit-crypto.service';

export interface SecureAuditLogRecord {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  metadata: Record<string, any> | null;
  status: string;
  error_message: string | null;
  created_at: Date;

  // Security fields
  data_hash: string;
  previous_hash: string | null;
  chain_hash: string;
  digital_signature: string;
  signing_key_id: string;
  sequence_number: number;
  integrity_verified: boolean;
  last_verified_at: Date | null;
}

export interface TamperingDetectionResult {
  total_records: number;
  verified_records: number;
  tampered_records: string[];
  integrity_score: number; // 0-100%
  last_check: Date;
}

export class SecureAuditService {
  private cryptoService: AuditCryptoService;
  private knex: Knex;
  private readonly TABLE_NAME = 'audit_logs';

  constructor(private fastify: FastifyInstance) {
    this.knex = fastify.knex;
    this.cryptoService = new AuditCryptoService(fastify);
  }

  /**
   * Initialize the service - ต้องเรียกหลัง constructor
   */
  public async initialize(): Promise<void> {
    await this.cryptoService.initialize();
  }

  /**
   * บันทึก audit log พร้อม security features
   */
  public async logSecureAudit(auditData: AuditLogData): Promise<string> {
    return this.knex.transaction(async (trx) => {
      try {
        // 1. หา previous hash และ sequence number
        const { previousHash, nextSequenceNumber } = await this.getChainInfo(trx);

        // 2. สร้าง security data
        const securityData = await this.cryptoService.generateSecurityData(
          auditData,
          previousHash,
          nextSequenceNumber
        );

        // 3. บันทึกลงฐานข้อมูล
        const [insertedRecord] = await trx(this.TABLE_NAME)
          .insert({
            ...auditData,
            ...securityData,
            integrity_verified: true,
            last_verified_at: new Date(),
            created_at: new Date()
          })
          .returning('id');

        const auditId = insertedRecord.id;

        this.fastify.log.info(`Secure audit log created: ${auditId}`, {
          action: auditData.action,
          resource_type: auditData.resource_type,
          sequence_number: nextSequenceNumber,
          data_hash: securityData.data_hash.substring(0, 8) + '...'
        });

        return auditId;

      } catch (error) {
        this.fastify.log.error('Failed to create secure audit log', {
          error: error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          auditAction: auditData.action,
          auditResourceType: auditData.resource_type
        });
        throw error;
      }
    });
  }

  /**
   * หาข้อมูล chain สำหรับ record ใหม่
   */
  private async getChainInfo(trx: Knex.Transaction): Promise<{
    previousHash: string | null;
    nextSequenceNumber: number;
  }> {
    const lastRecord = await trx(this.TABLE_NAME)
      .select('chain_hash', 'sequence_number')
      .orderBy('sequence_number', 'desc')
      .first();

    return {
      previousHash: lastRecord?.chain_hash || null,
      nextSequenceNumber: (lastRecord?.sequence_number || 0) + 1
    };
  }

  /**
   * ตรวจสอบความสมบูรณ์ของ audit logs ในช่วงเวลา
   */
  public async verifyIntegrityByDateRange(
    fromDate: Date,
    toDate: Date
  ): Promise<IntegrityVerificationResult> {
    const records = await this.knex(this.TABLE_NAME)
      .select('*')
      .whereBetween('created_at', [fromDate, toDate])
      .orderBy('sequence_number', 'asc');

    const auditRecords = records.map(record => ({
      id: record.id,
      data: this.extractAuditData(record),
      security: this.extractSecurityData(record)
    }));

    const result = await this.cryptoService.verifyChainIntegrity(auditRecords);

    // อัพเดท verification status
    if (result.verified_count > 0) {
      await this.updateVerificationStatus(
        records.filter(r => !result.tampered_records.includes(r.id)).map(r => r.id)
      );
    }

    return result;
  }

  /**
   * ตรวจจับ tampering และสร้างรายงาน
   */
  public async detectTamperingAndReport(
    fromDate?: Date,
    toDate?: Date
  ): Promise<TamperingDetectionResult> {
    const records = await this.knex(this.TABLE_NAME)
      .select('*')
      .modify((queryBuilder) => {
        if (fromDate && toDate) {
          queryBuilder.whereBetween('created_at', [fromDate, toDate]);
        }
      })
      .orderBy('sequence_number', 'asc');

    const auditRecords = records.map((record: any) => ({
      id: record.id,
      data: this.extractAuditData(record),
      security: this.extractSecurityData(record)
    }));

    const verificationResult = await this.cryptoService.verifyChainIntegrity(auditRecords);

    const integrityScore = records.length > 0 ?
      (verificationResult.verified_count / records.length) * 100 : 100;

    // Log tampering detection results
    if (verificationResult.tampered_records.length > 0) {
      this.fastify.log.warn('Tampering detected in audit logs', {
        tampered_count: verificationResult.tampered_records.length,
        total_count: records.length,
        integrity_score: integrityScore,
        tampered_ids: verificationResult.tampered_records
      });
    }

    return {
      total_records: records.length,
      verified_records: verificationResult.verified_count,
      tampered_records: verificationResult.tampered_records,
      integrity_score: Math.round(integrityScore * 100) / 100,
      last_check: new Date()
    };
  }

  /**
   * สร้าง integrity proof สำหรับ audit record
   */
  public async generateIntegrityProof(auditId: string): Promise<string | null> {
    const record = await this.knex(this.TABLE_NAME)
      .select('*')
      .where('id', auditId)
      .first();

    if (!record) {
      return null;
    }

    const auditData = this.extractAuditData(record);
    const securityData = this.extractSecurityData(record);

    return this.cryptoService.generateIntegrityProof(auditData, securityData);
  }

  /**
   * ตรวจสอบ integrity proof จากภายนอก
   */
  public async verifyIntegrityProof(proofBase64: string): Promise<boolean> {
    try {
      const proof = JSON.parse(Buffer.from(proofBase64, 'base64').toString());

      const record = await this.knex(this.TABLE_NAME)
        .select('*')
        .where('id', proof.record_id)
        .first();

      if (!record) {
        return false;
      }

      const auditData = this.extractAuditData(record);
      const securityData = this.extractSecurityData(record);

      return this.cryptoService.verifyRecordIntegrity(auditData, securityData);
    } catch (error) {
      return false;
    }
  }

  /**
   * รับสถิติความปลอดภัย
   */
  public async getSecurityStats(): Promise<{
    total_records: number;
    verified_records: number;
    unverified_records: number;
    last_verification: Date | null;
    integrity_score: number;
  }> {
    const stats = await this.knex(this.TABLE_NAME)
      .select(
        this.knex.raw('COUNT(*) as total_records'),
        this.knex.raw('SUM(CASE WHEN integrity_verified = true THEN 1 ELSE 0 END) as verified_records'),
        this.knex.raw('MAX(last_verified_at) as last_verification')
      )
      .first();

    const totalRecords = parseInt(stats.total_records);
    const verifiedRecords = parseInt(stats.verified_records);
    const unverifiedRecords = totalRecords - verifiedRecords;
    const integrityScore = totalRecords > 0 ? (verifiedRecords / totalRecords) * 100 : 100;

    return {
      total_records: totalRecords,
      verified_records: verifiedRecords,
      unverified_records: unverifiedRecords,
      last_verification: stats.last_verification,
      integrity_score: Math.round(integrityScore * 100) / 100
    };
  }

  /**
   * รันการตรวจสอบ integrity แบบ batch
   */
  public async runIntegrityCheck(batchSize: number = 1000): Promise<TamperingDetectionResult> {
    const totalRecords = await this.knex(this.TABLE_NAME).count('* as count').first();
    const total = parseInt(totalRecords?.count as string || '0');

    let processedRecords = 0;
    let totalVerified = 0;
    let totalTampered: string[] = [];

    // ประมวลผลเป็น batch
    for (let offset = 0; offset < total; offset += batchSize) {
      const records = await this.knex(this.TABLE_NAME)
        .select('*')
        .orderBy('sequence_number', 'asc')
        .limit(batchSize)
        .offset(offset);

      const auditRecords = records.map((record: any) => ({
        id: record.id,
        data: this.extractAuditData(record),
        security: this.extractSecurityData(record)
      }));

      const result = await this.cryptoService.verifyChainIntegrity(auditRecords);

      totalVerified += result.verified_count;
      totalTampered = [...totalTampered, ...result.tampered_records];
      processedRecords += records.length;

      this.fastify.log.info(`Integrity check progress: ${processedRecords}/${total}`);
    }

    const integrityScore = total > 0 ? (totalVerified / total) * 100 : 100;

    return {
      total_records: total,
      verified_records: totalVerified,
      tampered_records: totalTampered,
      integrity_score: Math.round(integrityScore * 100) / 100,
      last_check: new Date()
    };
  }

  /**
   * แยกข้อมูล audit จาก record
   */
  private extractAuditData(record: any): AuditLogData {
    return {
      user_id: record.user_id,
      action: record.action,
      resource_type: record.resource_type,
      resource_id: record.resource_id,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      session_id: record.session_id,
      metadata: record.metadata,
      status: record.status,
      error_message: record.error_message
    };
  }

  /**
   * แยกข้อมูล security จาก record
   */
  private extractSecurityData(record: any): AuditSecurityData {
    return {
      data_hash: record.data_hash,
      previous_hash: record.previous_hash,
      chain_hash: record.chain_hash,
      digital_signature: record.digital_signature,
      signing_key_id: record.signing_key_id,
      sequence_number: record.sequence_number
    };
  }

  /**
   * อัพเดทสถานะการตรวจสอบ
   */
  private async updateVerificationStatus(auditIds: string[]): Promise<void> {
    if (auditIds.length === 0) return;

    await this.knex(this.TABLE_NAME)
      .whereIn('id', auditIds)
      .update({
        integrity_verified: true,
        last_verified_at: new Date()
      });
  }

  /**
   * รับ public key สำหรับการตรวจสอบจากภายนอก
   */
  public getPublicKey(): string {
    return this.cryptoService.getPublicKey();
  }
}
