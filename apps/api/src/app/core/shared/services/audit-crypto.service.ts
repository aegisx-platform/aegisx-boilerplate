import * as crypto from 'crypto';
import { AuditLogData } from '../audit/interfaces/audit-adapter.interface';
import { KeyManagementService } from './key-management.service';
import { FastifyInstance } from 'fastify';

export interface AuditSecurityData {
  data_hash: string;
  previous_hash: string | null;
  chain_hash: string;
  digital_signature: string;
  signing_key_id: string;
  sequence_number: number;
}

export interface IntegrityVerificationResult {
  is_valid: boolean;
  errors: string[];
  verified_count: number;
  tampered_records: string[];
}

export class AuditCryptoService {
  private readonly ALGORITHM: string;
  private readonly HASH_ALGORITHM: string;

  private keyManagementService: KeyManagementService;

  constructor(fastify: FastifyInstance) {
    // Use environment variables for algorithms
    this.ALGORITHM = process.env.AUDIT_SIGNATURE_ALGORITHM || 'RSA-SHA256';
    this.HASH_ALGORITHM = process.env.AUDIT_HASH_ALGORITHM || 'sha256';

    this.keyManagementService = new KeyManagementService(fastify);
  }

  /**
   * Initialize keys - ต้องเรียกก่อนใช้งาน
   */
  public async initialize(): Promise<void> {
    try {
      await this.keyManagementService.initializeKeys();
    } catch (error) {
      throw new Error(`Failed to initialize crypto service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * คำนวณ hash ของข้อมูล audit
   */
  public calculateDataHash(auditData: AuditLogData): string {
    try {
      // เฉพาะ fields ที่สำคัญเท่านั้น
      const dataForHash = {
        user_id: auditData.user_id,
        action: auditData.action,
        resource_type: auditData.resource_type,
        resource_id: auditData.resource_id,
        ip_address: auditData.ip_address,
        metadata: auditData.metadata,
        status: auditData.status,
        timestamp: new Date().toISOString() // ใช้เวลาปัจจุบัน
      };

      return crypto
        .createHash(this.HASH_ALGORITHM)
        .update(JSON.stringify(dataForHash))
        .digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate data hash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * คำนวณ chain hash (data_hash + previous_hash)
   */
  public calculateChainHash(dataHash: string, previousHash: string | null): string {
    try {
      const chainData = previousHash ? `${dataHash}${previousHash}` : dataHash;
      return crypto
        .createHash(this.HASH_ALGORITHM)
        .update(chainData)
        .digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate chain hash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * สร้าง digital signature
   */
  public createDigitalSignature(dataHash: string): string {
    try {
      const keyPair = this.keyManagementService.getCurrentKeyPair();
      const sign = crypto.createSign(this.ALGORITHM);
      sign.update(dataHash);
      return sign.sign(keyPair.privateKey, 'base64');
    } catch (error) {
      throw new Error(`Failed to create digital signature: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ตรวจสอบ digital signature
   */
  public verifyDigitalSignature(dataHash: string, signature: string): boolean {
    try {
      const publicKey = this.keyManagementService.getPublicKey();
      const verify = crypto.createVerify(this.ALGORITHM);
      verify.update(dataHash);
      return verify.verify(publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * สร้างข้อมูล security ทั้งหมดสำหรับ audit record
   */
  public async generateSecurityData(
    auditData: AuditLogData,
    previousHash: string | null,
    sequenceNumber: number
  ): Promise<AuditSecurityData> {
    try {
      const dataHash = this.calculateDataHash(auditData);
      const chainHash = this.calculateChainHash(dataHash, previousHash);
      const digitalSignature = this.createDigitalSignature(dataHash);

      return {
        data_hash: dataHash,
        previous_hash: previousHash,
        chain_hash: chainHash,
        digital_signature: digitalSignature,
        signing_key_id: this.keyManagementService.getCurrentKeyId(),
        sequence_number: sequenceNumber
      };
    } catch (error) {
      throw new Error(`Failed to generate security data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ตรวจสอบความสมบูรณ์ของ audit record เดียว
   */
  public verifyRecordIntegrity(
    auditData: AuditLogData,
    securityData: AuditSecurityData
  ): boolean {
    try {
      // 1. ตรวจสอบ data hash
      const expectedDataHash = this.calculateDataHash(auditData);
      if (expectedDataHash !== securityData.data_hash) {
        return false;
      }

      // 2. ตรวจสอบ chain hash
      const expectedChainHash = this.calculateChainHash(
        securityData.data_hash,
        securityData.previous_hash
      );
      if (expectedChainHash !== securityData.chain_hash) {
        return false;
      }

      // 3. ตรวจสอบ digital signature
      return this.verifyDigitalSignature(
        securityData.data_hash,
        securityData.digital_signature
      );
    } catch {
      return false;
    }
  }

  /**
   * ตรวจสอบความสมบูรณ์ของ chain audit records
   */
  public async verifyChainIntegrity(
    auditRecords: Array<{
      id: string;
      data: AuditLogData;
      security: AuditSecurityData;
    }>
  ): Promise<IntegrityVerificationResult> {
    const result: IntegrityVerificationResult = {
      is_valid: true,
      errors: [],
      verified_count: 0,
      tampered_records: []
    };

    // เรียงลำดับตาม sequence number
    const sortedRecords = auditRecords.sort((a, b) =>
      a.security.sequence_number - b.security.sequence_number
    );

    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];

      try {
        // ตรวจสอบ record integrity
        const isValid = this.verifyRecordIntegrity(record.data, record.security);

        if (!isValid) {
          result.is_valid = false;
          result.errors.push(`Record ${record.id} integrity check failed`);
          result.tampered_records.push(record.id);
        } else {
          result.verified_count++;
        }

        // ตรวจสอบ chain linking (previous hash)
        if (i > 0) {
          const previousRecord = sortedRecords[i - 1];
          if (record.security.previous_hash !== previousRecord.security.chain_hash) {
            result.is_valid = false;
            result.errors.push(`Chain linking broken at record ${record.id}`);
            result.tampered_records.push(record.id);
          }
        }
      } catch (error) {
        result.is_valid = false;
        result.errors.push(`Failed to verify record ${record.id}: ${error instanceof Error ? error.message : String(error)}`);
        result.tampered_records.push(record.id);
      }
    }

    return result;
  }

  /**
   * ค้นหา tampering ในช่วงเวลาที่กำหนด
   */
  public async detectTampering(
    auditRecords: Array<{
      id: string;
      data: AuditLogData;
      security: AuditSecurityData;
    }>
  ): Promise<string[]> {
    const verificationResult = await this.verifyChainIntegrity(auditRecords);
    return verificationResult.tampered_records;
  }

  /**
   * สร้าง integrity proof สำหรับ audit record
   */
  public generateIntegrityProof(
    auditData: AuditLogData,
    securityData: AuditSecurityData
  ): string {
    const proof = {
      record_id: (auditData as any).id || 'unknown',
      data_hash: securityData.data_hash,
      chain_hash: securityData.chain_hash,
      signature: securityData.digital_signature,
      key_id: securityData.signing_key_id,
      sequence_number: securityData.sequence_number,
      algorithm: this.ALGORITHM,
      timestamp: new Date().toISOString()
    };

    return Buffer.from(JSON.stringify(proof)).toString('base64');
  }

  /**
   * ตรวจสอบ integrity proof
   */
  public verifyIntegrityProof(proofString: string): {
    valid: boolean;
    data?: Record<string, unknown>;
    error?: string;
  } {
    try {
      const proofData = JSON.parse(Buffer.from(proofString, 'base64').toString());

      // ตรวจสอบ signature
      const isValid = this.verifyDigitalSignature(
        proofData.data_hash,
        proofData.signature
      );

      return {
        valid: isValid,
        data: isValid ? proofData : undefined,
        error: isValid ? undefined : 'Invalid signature'
      };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to verify proof: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * รับ public key สำหรับการตรวจสอบจากภายนอก
   */
  public getPublicKey(): string {
    return this.keyManagementService.getPublicKey();
  }

  /**
   * รับ key ID
   */
  public getKeyId(): string {
    return this.keyManagementService.getCurrentKeyId();
  }

  /**
   * รับข้อมูลสถิติของ key
   */
  public getKeyStats() {
    return this.keyManagementService.getKeyStats();
  }

  /**
   * หมุนเวียน keys
   */
  public async rotateKeys() {
    return await this.keyManagementService.rotateKeys();
  }
}
