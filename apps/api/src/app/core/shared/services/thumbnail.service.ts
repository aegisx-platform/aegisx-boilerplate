/**
 * Thumbnail Service
 * 
 * Service for generating thumbnails from images using Sharp
 */

import sharp from 'sharp'
import { ThumbnailSize } from '../types/storage.types'

export interface ThumbnailResult {
  buffer: Buffer
  width: number
  height: number
  format: string
  size: number
  filename: string
}

export interface ThumbnailGenerationOptions {
  sizes?: ThumbnailSize[]
  defaultSizes?: boolean
  quality?: number
  progressive?: boolean
  outputPath?: string
}

export class ThumbnailService {
  // Default thumbnail sizes
  private static readonly DEFAULT_SIZES: ThumbnailSize[] = [
    { width: 150, height: 150, fit: 'cover', quality: 80, format: 'jpeg' },
    { width: 300, height: 300, fit: 'cover', quality: 85, format: 'jpeg' },
    { width: 800, height: 600, fit: 'inside', quality: 90, format: 'jpeg' }
  ]

  // Supported image formats for thumbnail generation
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/tiff',
    'image/svg+xml',
    'image/gif'
  ]

  /**
   * Check if file type supports thumbnail generation
   */
  static canGenerateThumbnail(mimeType: string): boolean {
    return ThumbnailService.SUPPORTED_FORMATS.includes(mimeType.toLowerCase())
  }

  /**
   * Generate thumbnails for an image
   */
  async generateThumbnails(
    imageBuffer: Buffer,
    mimeType: string,
    options: ThumbnailGenerationOptions = {}
  ): Promise<ThumbnailResult[]> {
    // Check if thumbnail generation is supported
    if (!ThumbnailService.canGenerateThumbnail(mimeType)) {
      throw new Error(`Thumbnail generation not supported for ${mimeType}`)
    }

    // Determine sizes to generate
    let sizes = options.sizes || []
    if (options.defaultSizes !== false && sizes.length === 0) {
      sizes = ThumbnailService.DEFAULT_SIZES
    }

    if (sizes.length === 0) {
      throw new Error('No thumbnail sizes specified')
    }

    // Get image metadata first
    const metadata = await sharp(imageBuffer).metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions')
    }

    // Generate thumbnails for each size
    const results: ThumbnailResult[] = []

    for (const size of sizes) {
      try {
        const result = await this.generateSingleThumbnail(
          imageBuffer,
          size,
          metadata
        )
        results.push(result)
      } catch (error) {
        console.warn(`Failed to generate thumbnail ${size.width}x${size.height}:`, error)
        // Continue with other sizes
      }
    }

    if (results.length === 0) {
      throw new Error('Failed to generate any thumbnails')
    }

    return results
  }

  /**
   * Generate a single thumbnail
   */
  private async generateSingleThumbnail(
    imageBuffer: Buffer,
    size: ThumbnailSize,
    originalMetadata: sharp.Metadata
  ): Promise<ThumbnailResult> {
    // Skip if original is smaller than requested thumbnail
    if (originalMetadata.width! <= size.width && originalMetadata.height! <= size.height) {
      // Return optimized version of original
      const result = await sharp(imageBuffer)
        .jpeg({ quality: size.quality || 85, progressive: true })
        .toBuffer({ resolveWithObject: true })

      return {
        buffer: result.data,
        width: result.info.width,
        height: result.info.height,
        format: result.info.format,
        size: result.data.length,
        filename: `${size.width}x${size.height}.${size.format || 'jpeg'}`
      }
    }

    // Create Sharp instance
    let sharpInstance = sharp(imageBuffer)

    // Resize based on fit strategy
    sharpInstance = sharpInstance.resize({
      width: size.width,
      height: size.height,
      fit: this.mapFitStrategy(size.fit || 'cover'),
      withoutEnlargement: true
    })

    // Apply format and quality settings
    const format = size.format || 'jpeg'
    const quality = size.quality || 85

    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ 
          quality, 
          progressive: true,
          mozjpeg: true
        })
        break
      case 'png':
        sharpInstance = sharpInstance.png({ 
          quality,
          progressive: true,
          compressionLevel: 9
        })
        break
      case 'webp':
        sharpInstance = sharpInstance.webp({ 
          quality,
          effort: 6
        })
        break
    }

    // Generate thumbnail
    const result = await sharpInstance.toBuffer({ resolveWithObject: true })

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      format: result.info.format,
      size: result.data.length,
      filename: `${size.width}x${size.height}.${size.format || 'jpeg'}`
    }
  }

  /**
   * Map fit strategy to Sharp resize fit options
   */
  private mapFitStrategy(fit: string): keyof sharp.FitEnum {
    const fitMap: Record<string, keyof sharp.FitEnum> = {
      'cover': 'cover',
      'contain': 'contain', 
      'fill': 'fill',
      'inside': 'inside',
      'outside': 'outside'
    }
    
    return fitMap[fit] || 'cover'
  }

  /**
   * Get default thumbnail sizes
   */
  static getDefaultSizes(): ThumbnailSize[] {
    return [...ThumbnailService.DEFAULT_SIZES]
  }

  /**
   * Generate file names for thumbnails
   */
  static generateThumbnailFilename(
    originalFilename: string,
    size: ThumbnailSize,
    fileId: string
  ): string {
    const ext = size.format || 'jpeg'
    const baseName = originalFilename.replace(/\.[^/.]+$/, '')
    return `${baseName}_${size.width}x${size.height}_${fileId}.${ext}`
  }

  /**
   * Generate thumbnail path
   */
  static generateThumbnailPath(originalPath: string, thumbnailFilename: string): string {
    const pathParts = originalPath.split('/')
    pathParts.pop() // Remove filename
    const directory = pathParts.join('/')
    
    return directory ? `${directory}/thumbnails/${thumbnailFilename}` : `thumbnails/${thumbnailFilename}`
  }

  /**
   * Extract image metadata for database storage
   */
  async getImageMetadata(imageBuffer: Buffer): Promise<{
    width: number
    height: number
    format: string
    colorspace?: string
    hasAlpha?: boolean
    density?: number
  }> {
    const metadata = await sharp(imageBuffer).metadata()
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      colorspace: metadata.space,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density
    }
  }
}