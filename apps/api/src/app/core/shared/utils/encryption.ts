/**
 * Encryption Utilities for Secrets Manager
 * 
 * Provides cryptographic functions for secure secret storage
 */

import * as crypto from 'crypto'
import {
  EncryptionAlgorithm,
  KeyDerivationConfig,
  EncryptionResult,
  EncryptionError
} from '../types/secrets-manager.types'

export class EncryptionService {
  private masterKey: Buffer | null = null
  private algorithm: EncryptionAlgorithm
  private keyDerivation: KeyDerivationConfig

  constructor(
    masterPassword: string,
    algorithm: EncryptionAlgorithm = 'aes-256-gcm',
    keyDerivation: KeyDerivationConfig = {
      algorithm: 'pbkdf2',
      iterations: 100000,
      saltLength: 32,
      keyLength: 32
    }
  ) {
    this.algorithm = algorithm
    this.keyDerivation = keyDerivation
    this.deriveMasterKey(masterPassword)
  }

  /**
   * Derive master key from password using configured KDF
   */
  private deriveMasterKey(password: string): void {
    try {
      const salt = crypto.randomBytes(this.keyDerivation.saltLength)
      
      switch (this.keyDerivation.algorithm) {
        case 'pbkdf2':
          this.masterKey = crypto.pbkdf2Sync(
            password,
            salt,
            this.keyDerivation.iterations || 100000,
            this.keyDerivation.keyLength,
            'sha256'
          )
          break
          
        case 'scrypt':
          this.masterKey = crypto.scryptSync(
            password,
            salt,
            this.keyDerivation.keyLength,
            {
              N: this.keyDerivation.iterations || 16384,
              r: 8,
              p: 1
            }
          )
          break
          
        case 'argon2':
          // Note: Node.js doesn't have built-in Argon2, fallback to scrypt
          // In production, use argon2 package
          this.masterKey = crypto.scryptSync(
            password,
            salt,
            this.keyDerivation.keyLength,
            {
              N: this.keyDerivation.iterations || 16384,
              r: 8,
              p: 1
            }
          )
          break
          
        default:
          throw new EncryptionError('key-derivation', `Unsupported KDF algorithm: ${this.keyDerivation.algorithm}`)
      }
    } catch (error) {
      throw new EncryptionError('key-derivation', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Encrypt plaintext data
   */
  public encrypt(plaintext: string): EncryptionResult {
    if (!this.masterKey) {
      throw new EncryptionError('encrypt', 'Master key not initialized')
    }

    try {
      const salt = crypto.randomBytes(this.keyDerivation.saltLength)
      const iv = crypto.randomBytes(16)
      
      // Derive encryption key from master key and salt
      const encryptionKey = this.deriveEncryptionKey(salt)
      
      let cipher: crypto.Cipher
      let encryptedData: Buffer
      let tag: string | undefined

      switch (this.algorithm) {
        case 'aes-256-gcm':
          const cipherGCM = crypto.createCipher('aes-256-gcm', encryptionKey) as any
          encryptedData = Buffer.concat([
            cipherGCM.update(plaintext, 'utf8'),
            cipherGCM.final()
          ])
          tag = cipherGCM.getAuthTag().toString('hex')
          break

        case 'aes-256-cbc':
          cipher = crypto.createCipher('aes-256-cbc', encryptionKey)
          encryptedData = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final()
          ])
          break

        case 'chacha20-poly1305':
          const cipherChaCha = crypto.createCipher('chacha20-poly1305', encryptionKey) as any
          encryptedData = Buffer.concat([
            cipherChaCha.update(plaintext, 'utf8'),
            cipherChaCha.final()
          ])
          tag = cipherChaCha.getAuthTag().toString('hex')
          break

        default:
          throw new EncryptionError('encrypt', `Unsupported encryption algorithm: ${this.algorithm}`)
      }

      return {
        encryptedData: encryptedData.toString('hex'),
        iv: iv.toString('hex'),
        tag,
        salt: salt.toString('hex'),
        algorithm: this.algorithm
      }
    } catch (error) {
      throw new EncryptionError('encrypt', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Decrypt encrypted data
   */
  public decrypt(encryptionResult: EncryptionResult): string {
    if (!this.masterKey) {
      throw new EncryptionError('decrypt', 'Master key not initialized')
    }

    try {
      const salt = Buffer.from(encryptionResult.salt, 'hex')
      const encryptedData = Buffer.from(encryptionResult.encryptedData, 'hex')
      
      // Derive the same encryption key
      const encryptionKey = this.deriveEncryptionKey(salt)
      
      let decipher: crypto.Decipher
      let decryptedData: Buffer

      switch (encryptionResult.algorithm) {
        case 'aes-256-gcm':
          if (!encryptionResult.tag) {
            throw new EncryptionError('decrypt', 'Authentication tag missing for AES-GCM')
          }
          const decipherGCM = crypto.createDecipher('aes-256-gcm', encryptionKey) as any
          decipherGCM.setAuthTag(Buffer.from(encryptionResult.tag, 'hex'))
          decryptedData = Buffer.concat([
            decipherGCM.update(encryptedData),
            decipherGCM.final()
          ])
          break

        case 'aes-256-cbc':
          decipher = crypto.createDecipher('aes-256-cbc', encryptionKey)
          decryptedData = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
          ])
          break

        case 'chacha20-poly1305':
          if (!encryptionResult.tag) {
            throw new EncryptionError('decrypt', 'Authentication tag missing for ChaCha20-Poly1305')
          }
          const decipherChaCha = crypto.createDecipher('chacha20-poly1305', encryptionKey) as any
          decipherChaCha.setAuthTag(Buffer.from(encryptionResult.tag, 'hex'))
          decryptedData = Buffer.concat([
            decipherChaCha.update(encryptedData),
            decipherChaCha.final()
          ])
          break

        default:
          throw new EncryptionError('decrypt', `Unsupported encryption algorithm: ${encryptionResult.algorithm}`)
      }

      return decryptedData.toString('utf8')
    } catch (error) {
      throw new EncryptionError('decrypt', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveEncryptionKey(salt: Buffer): Buffer {
    if (!this.masterKey) {
      throw new EncryptionError('key-derivation', 'Master key not initialized')
    }

    // Use HKDF to derive encryption key
    return Buffer.from(crypto.hkdfSync('sha256', this.masterKey, salt, Buffer.alloc(0), 32))
  }

  /**
   * Generate secure random password
   */
  public static generateSecurePassword(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(crypto.randomInt(0, chars.length))
    }
    
    return result
  }

  /**
   * Generate cryptographically secure random key
   */
  public static generateRandomKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Hash data using secure algorithm
   */
  public static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data, 'utf8').digest('hex')
  }

  /**
   * Verify hash
   */
  public static verifyHash(data: string, hash: string, algorithm: string = 'sha256'): boolean {
    const computedHash = this.hash(data, algorithm)
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))
  }

  /**
   * Create HMAC signature
   */
  public static createHMAC(data: string, key: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, key).update(data, 'utf8').digest('hex')
  }

  /**
   * Verify HMAC signature
   */
  public static verifyHMAC(data: string, signature: string, key: string, algorithm: string = 'sha256'): boolean {
    const computedSignature = this.createHMAC(data, key, algorithm)
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computedSignature, 'hex'))
  }

  /**
   * Mask sensitive data for logging
   */
  public static maskSecret(secret: string, visibleChars: number = 4): string {
    if (secret.length <= visibleChars * 2) {
      return '*'.repeat(secret.length)
    }
    
    const start = secret.substring(0, visibleChars)
    const end = secret.substring(secret.length - visibleChars)
    const masked = '*'.repeat(secret.length - visibleChars * 2)
    
    return `${start}${masked}${end}`
  }

  /**
   * Validate encryption result integrity
   */
  public static validateEncryptionResult(result: EncryptionResult): boolean {
    try {
      // Check required fields
      if (!result.encryptedData || !result.iv || !result.salt || !result.algorithm) {
        return false
      }
      
      // Validate hex encoding
      Buffer.from(result.encryptedData, 'hex')
      Buffer.from(result.iv, 'hex')
      Buffer.from(result.salt, 'hex')
      
      if (result.tag) {
        Buffer.from(result.tag, 'hex')
      }
      
      // Validate algorithm
      const supportedAlgorithms: EncryptionAlgorithm[] = ['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305']
      if (!supportedAlgorithms.includes(result.algorithm)) {
        return false
      }
      
      // Check if authenticated encryption has tag
      if (['aes-256-gcm', 'chacha20-poly1305'].includes(result.algorithm) && !result.tag) {
        return false
      }
      
      return true
    } catch {
      return false
    }
  }

  /**
   * Cleanup sensitive data from memory
   */
  public cleanup(): void {
    if (this.masterKey) {
      this.masterKey.fill(0)
      this.masterKey = null
    }
  }
}

/**
 * Utility functions for encryption operations
 */
export class EncryptionUtils {
  /**
   * Check if algorithm supports authenticated encryption
   */
  public static isAuthenticatedEncryption(algorithm: EncryptionAlgorithm): boolean {
    return ['aes-256-gcm', 'chacha20-poly1305'].includes(algorithm)
  }

  /**
   * Get recommended key derivation settings based on security level
   */
  public static getKeyDerivationConfig(securityLevel: 'low' | 'medium' | 'high' = 'medium'): KeyDerivationConfig {
    switch (securityLevel) {
      case 'low':
        return {
          algorithm: 'pbkdf2',
          iterations: 50000,
          saltLength: 16,
          keyLength: 32
        }
      
      case 'medium':
        return {
          algorithm: 'pbkdf2',
          iterations: 100000,
          saltLength: 32,
          keyLength: 32
        }
      
      case 'high':
        return {
          algorithm: 'argon2',
          iterations: 3,
          saltLength: 32,
          keyLength: 32
        }
      
      default:
        throw new Error(`Unsupported security level: ${securityLevel}`)
    }
  }

  /**
   * Estimate encryption/decryption performance
   */
  public static async benchmarkEncryption(
    algorithm: EncryptionAlgorithm,
    iterations: number = 1000
  ): Promise<{ encryptionTime: number; decryptionTime: number }> {
    const service = new EncryptionService('test-password', algorithm)
    const testData = 'This is a test secret for benchmarking encryption performance'
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      const encrypted = service.encrypt(testData)
      service.decrypt(encrypted)
    }
    
    // Benchmark encryption
    const encryptStart = process.hrtime.bigint()
    for (let i = 0; i < iterations; i++) {
      service.encrypt(testData)
    }
    const encryptEnd = process.hrtime.bigint()
    const encryptionTime = Number(encryptEnd - encryptStart) / 1000000 / iterations // ms per operation
    
    // Benchmark decryption
    const encrypted = service.encrypt(testData)
    const decryptStart = process.hrtime.bigint()
    for (let i = 0; i < iterations; i++) {
      service.decrypt(encrypted)
    }
    const decryptEnd = process.hrtime.bigint()
    const decryptionTime = Number(decryptEnd - decryptStart) / 1000000 / iterations // ms per operation
    
    service.cleanup()
    
    return {
      encryptionTime,
      decryptionTime
    }
  }
}