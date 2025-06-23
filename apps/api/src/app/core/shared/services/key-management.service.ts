import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { FastifyInstance } from 'fastify';

export interface KeyPairInfo {
  privateKey: string;
  publicKey: string;
  keyId: string;
  createdAt: Date;
  algorithm: string;
  keySize: number;
}

export interface KeyMetadata {
  keyId: string;
  createdAt: string;
  algorithm: string;
  keySize: number;
  status: 'active' | 'deprecated' | 'revoked';
  expiresAt?: string;
}

export class KeyManagementService {
  private readonly KEYS_DIR: string;
  private readonly PRIVATE_KEY_FILE: string;
  private readonly PUBLIC_KEY_FILE: string;
  private readonly METADATA_FILE = 'key-metadata.json';
  private readonly ALGORITHM: string;
  private readonly KEY_SIZE = 2048;

  private currentKeyPair: KeyPairInfo | null = null;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;

    // Initialize paths from environment variables or defaults
    const signingKeyPath = process.env.AUDIT_SIGNING_KEY_PATH || 'keys/audit-signing-key.pem';
    const publicKeyPath = process.env.AUDIT_PUBLIC_KEY_PATH || 'keys/audit-signing-key.pub';

    // Parse directory and filename
    this.KEYS_DIR = path.dirname(path.resolve(signingKeyPath));
    this.PRIVATE_KEY_FILE = path.basename(signingKeyPath);
    this.PUBLIC_KEY_FILE = path.basename(publicKeyPath);

    // Use environment variables for algorithm settings
    this.ALGORITHM = (process.env.AUDIT_SIGNATURE_ALGORITHM?.replace('-', '') as string) || 'RS256';

    this.ensureKeysDirectory();
  }

  /**
   * สร้างหรือโหลด key pair สำหรับ audit signing
   */
  public async initializeKeys(): Promise<KeyPairInfo> {
    try {
      // ลองโหลด keys ที่มีอยู่ก่อน
      const existingKeys = await this.loadExistingKeys();
      if (existingKeys && this.isKeyValid(existingKeys)) {
        this.currentKeyPair = existingKeys;
        this.fastify.log.info(`Loaded existing audit signing key: ${existingKeys.keyId}`);
        return existingKeys;
      }

      // ถ้าไม่มี keys หรือ keys หมดอายุ ให้สร้างใหม่
      const newKeys = await this.generateNewKeyPair();
      await this.saveKeys(newKeys);

      this.currentKeyPair = newKeys;
      this.fastify.log.info(`Generated new audit signing key: ${newKeys.keyId}`);
      return newKeys;

    } catch (error) {
      this.fastify.log.error('Failed to initialize audit signing keys', error);
      throw new Error('Key initialization failed');
    }
  }

  /**
   * รับ key pair ปัจจุบัน
   */
  public getCurrentKeyPair(): KeyPairInfo {
    if (!this.currentKeyPair) {
      throw new Error('Keys not initialized. Call initializeKeys() first.');
    }
    return this.currentKeyPair;
  }

  /**
   * รับเฉพาะ public key สำหรับการตรวจสอบจากภายนอก
   */
  public getPublicKey(): string {
    return this.getCurrentKeyPair().publicKey;
  }

  /**
   * รับ key ID ปัจจุบัน
   */
  public getCurrentKeyId(): string {
    return this.getCurrentKeyPair().keyId;
  }

  /**
   * สร้าง key pair ใหม่
   */
  private async generateNewKeyPair(): Promise<KeyPairInfo> {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.KEY_SIZE,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    const keyId = this.generateKeyId(keyPair.publicKey);
    const createdAt = new Date();

    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      keyId,
      createdAt,
      algorithm: this.ALGORITHM,
      keySize: this.KEY_SIZE
    };
  }

  /**
   * บันทึก keys ลงไฟล์
   */
  private async saveKeys(keyPair: KeyPairInfo): Promise<void> {
    try {
      // บันทึก private key (with restricted permissions)
      const privateKeyPath = path.join(this.KEYS_DIR, this.PRIVATE_KEY_FILE);
      fs.writeFileSync(privateKeyPath, keyPair.privateKey, { mode: 0o600 });

      // บันทึก public key
      const publicKeyPath = path.join(this.KEYS_DIR, this.PUBLIC_KEY_FILE);
      fs.writeFileSync(publicKeyPath, keyPair.publicKey, { mode: 0o644 });

      // บันทึก metadata
      const metadata: KeyMetadata = {
        keyId: keyPair.keyId,
        createdAt: keyPair.createdAt.toISOString(),
        algorithm: keyPair.algorithm,
        keySize: keyPair.keySize,
        status: 'active'
      };

      const metadataPath = path.join(this.KEYS_DIR, this.METADATA_FILE);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 });

      this.fastify.log.info(`Audit signing keys saved to ${this.KEYS_DIR}`);

    } catch (error) {
      this.fastify.log.error('Failed to save audit signing keys', error);
      throw new Error('Key saving failed');
    }
  }

  /**
   * โหลด keys ที่มีอยู่จากไฟล์
   */
  private async loadExistingKeys(): Promise<KeyPairInfo | null> {
    try {
      const privateKeyPath = path.join(this.KEYS_DIR, this.PRIVATE_KEY_FILE);
      const publicKeyPath = path.join(this.KEYS_DIR, this.PUBLIC_KEY_FILE);
      const metadataPath = path.join(this.KEYS_DIR, this.METADATA_FILE);

      // ตรวจสอบว่าไฟล์ทั้งหมดมีอยู่
      if (!fs.existsSync(privateKeyPath) ||
        !fs.existsSync(publicKeyPath) ||
        !fs.existsSync(metadataPath)) {
        return null;
      }

      // อ่านไฟล์
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      const metadata: KeyMetadata = JSON.parse(metadataContent);

      return {
        privateKey,
        publicKey,
        keyId: metadata.keyId,
        createdAt: new Date(metadata.createdAt),
        algorithm: metadata.algorithm,
        keySize: metadata.keySize
      };

    } catch (error) {
      this.fastify.log.warn('Failed to load existing audit signing keys', error);
      return null;
    }
  }

  /**
   * ตรวจสอบว่า key ยังใช้งานได้หรือไม่
   */
  private isKeyValid(keyPair: KeyPairInfo): boolean {
    try {
      // ตรวจสอบ format ของ key - รองรับทั้ง PKCS#8 และ PKCS#1 format
      const hasPrivateKey = keyPair.privateKey.includes('BEGIN PRIVATE KEY') ||
        keyPair.privateKey.includes('BEGIN RSA PRIVATE KEY');
      const hasPublicKey = keyPair.publicKey.includes('BEGIN PUBLIC KEY') ||
        keyPair.publicKey.includes('BEGIN RSA PUBLIC KEY');

      if (!hasPrivateKey || !hasPublicKey) {
        this.fastify.log.error('Key format validation failed', {
          hasPrivateKey,
          hasPublicKey,
          privateKeyStart: keyPair.privateKey.substring(0, 50),
          publicKeyStart: keyPair.publicKey.substring(0, 50)
        });
        return false;
      }

      // ตรวจสอบ algorithm และ key size
      if (keyPair.algorithm !== this.ALGORITHM || keyPair.keySize !== this.KEY_SIZE) {
        this.fastify.log.warn(`Key algorithm/size mismatch. Expected: ${this.ALGORITHM}/${this.KEY_SIZE}, Got: ${keyPair.algorithm}/${keyPair.keySize}`);
        return false;
      }

      // ทดสอบการเซ็นและตรวจสอบ
      const testData = 'test-signature-verification';
      const sign = crypto.createSign('RSA-SHA256'); // ใช้ algorithm ที่ชัดเจน
      sign.update(testData);
      const signature = sign.sign(keyPair.privateKey, 'base64');

      const verify = crypto.createVerify('RSA-SHA256'); // ใช้ algorithm ที่ชัดเจน
      verify.update(testData);
      const isValid = verify.verify(keyPair.publicKey, signature, 'base64');

      if (!isValid) {
        this.fastify.log.error('Key pair verification test failed');
        return false;
      }

      // ตรวจสอบอายุของ key (optional - สำหรับ key rotation)
      const keyAge = Date.now() - keyPair.createdAt.getTime();
      const maxKeyAge = 365 * 24 * 60 * 60 * 1000; // 1 ปี

      if (keyAge > maxKeyAge) {
        this.fastify.log.warn(`Audit signing key is over 1 year old, consider rotation: ${keyPair.keyId}`);
        // ยังใช้งานได้ แต่ควร rotate
      }

      this.fastify.log.info(`Key validation successful for key: ${keyPair.keyId}`);
      return true;

    } catch (error) {
      this.fastify.log.error('Key validation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        keyId: keyPair.keyId
      });
      return false;
    }
  }

  /**
   * สร้าง unique key ID จาก public key
   */
  private generateKeyId(publicKey: string): string {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return `audit_key_${hash.substring(0, 16)}`;
  }

  /**
   * สร้างโฟลเดอร์ keys ถ้ายังไม่มี
   */
  private ensureKeysDirectory(): void {
    if (!fs.existsSync(this.KEYS_DIR)) {
      fs.mkdirSync(this.KEYS_DIR, { mode: 0o700 }); // Owner only
      this.fastify.log.info(`Created keys directory: ${this.KEYS_DIR}`);
    }
  }

  /**
   * หมุนเวียน keys (key rotation)
   */
  public async rotateKeys(): Promise<KeyPairInfo> {
    this.fastify.log.info('Starting key rotation for audit signing');

    // backup keys เก่า
    await this.backupCurrentKeys();

    // สร้าง keys ใหม่
    const newKeys = await this.generateNewKeyPair();
    await this.saveKeys(newKeys);

    this.currentKeyPair = newKeys;
    this.fastify.log.info(`Key rotation completed. New key ID: ${newKeys.keyId}`);

    return newKeys;
  }

  /**
   * สำรองข้อมูล keys เก่า
   */
  private async backupCurrentKeys(): Promise<void> {
    if (!this.currentKeyPair) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.KEYS_DIR, 'backup', timestamp);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    }

    // Copy current keys to backup
    const currentPrivateKey = path.join(this.KEYS_DIR, this.PRIVATE_KEY_FILE);
    const currentPublicKey = path.join(this.KEYS_DIR, this.PUBLIC_KEY_FILE);
    const currentMetadata = path.join(this.KEYS_DIR, this.METADATA_FILE);

    if (fs.existsSync(currentPrivateKey)) {
      fs.copyFileSync(currentPrivateKey, path.join(backupDir, this.PRIVATE_KEY_FILE));
    }
    if (fs.existsSync(currentPublicKey)) {
      fs.copyFileSync(currentPublicKey, path.join(backupDir, this.PUBLIC_KEY_FILE));
    }
    if (fs.existsSync(currentMetadata)) {
      fs.copyFileSync(currentMetadata, path.join(backupDir, this.METADATA_FILE));
    }

    this.fastify.log.info(`Current keys backed up to: ${backupDir}`);
  }

  /**
   * รับข้อมูลสถิติของ key
   */
  public getKeyStats(): {
    keyId: string;
    algorithm: string;
    keySize: number;
    createdAt: Date;
    ageInDays: number;
    status: string;
  } {
    const keyPair = this.getCurrentKeyPair();
    const ageInMs = Date.now() - keyPair.createdAt.getTime();
    const ageInDays = Math.floor(ageInMs / (24 * 60 * 60 * 1000));

    return {
      keyId: keyPair.keyId,
      algorithm: keyPair.algorithm,
      keySize: keyPair.keySize,
      createdAt: keyPair.createdAt,
      ageInDays,
      status: ageInDays > 365 ? 'needs_rotation' : 'active'
    };
  }
}
