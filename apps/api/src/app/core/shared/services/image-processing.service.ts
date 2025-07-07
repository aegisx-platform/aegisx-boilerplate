/**
 * Image Processing Service
 * 
 * Comprehensive image processing service using Sharp for thumbnails, 
 * format conversion, optimization, and advanced image operations
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

// Extended interfaces for comprehensive image processing
export interface ImageProcessingOptions {
  // Basic transformations
  resize?: {
    width?: number
    height?: number
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
    withoutEnlargement?: boolean
  }
  crop?: {
    left: number
    top: number
    width: number
    height: number
  }
  rotate?: {
    angle: number
    background?: string
  }
  flip?: boolean
  flop?: boolean

  // Format and quality
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'gif'
  quality?: number
  progressive?: boolean
  lossless?: boolean

  // Filters and effects
  blur?: number | boolean
  sharpen?: boolean | { sigma?: number, flat?: number, jagged?: number }
  median?: number
  normalize?: boolean
  gamma?: number

  // Color adjustments  
  modulate?: {
    brightness?: number
    saturation?: number
    hue?: number
    lightness?: number
  }
  negate?: boolean
  grayscale?: boolean
  threshold?: number

  // Advanced operations
  clahe?: {
    width?: number
    height?: number
    maxSlope?: number
  }
  convolve?: {
    width: number
    height: number
    kernel: number[]
    scale?: number
    offset?: number
  }

  // Metadata options
  keepMetadata?: boolean
  stripExif?: boolean
  
  // Watermark
  watermark?: {
    text?: string
    image?: Buffer
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity?: number
  }
}

export interface ImageProcessingResult {
  buffer: Buffer
  width: number
  height: number
  format: string
  size: number
  metadata?: {
    originalWidth?: number
    originalHeight?: number
    originalFormat?: string
    originalSize?: number
    processingTime?: number
    operations?: string[]
  }
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  colorspace?: string
  hasAlpha?: boolean
  density?: number
  exif?: Record<string, any>
  icc?: Buffer
  orientation?: number
}

export class ImageProcessingService {
  // Default thumbnail sizes
  private static readonly DEFAULT_SIZES: ThumbnailSize[] = [
    { width: 150, height: 150, fit: 'cover', quality: 80, format: 'jpeg' },
    { width: 300, height: 300, fit: 'cover', quality: 85, format: 'jpeg' },
    { width: 800, height: 600, fit: 'inside', quality: 90, format: 'jpeg' }
  ]

  // Supported image formats for processing
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/tiff',
    'image/svg+xml',
    'image/gif',
    'image/avif',
    'image/heif'
  ]

  /**
   * Check if file type supports image processing
   */
  static canProcessImage(mimeType: string): boolean {
    return ImageProcessingService.SUPPORTED_FORMATS.includes(mimeType.toLowerCase())
  }

  /**
   * Check if file type supports thumbnail generation (legacy method)
   */
  static canGenerateThumbnail(mimeType: string): boolean {
    return ImageProcessingService.canProcessImage(mimeType)
  }

  /**
   * Comprehensive image processing method
   */
  async processImage(
    imageBuffer: Buffer,
    mimeType: string,
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult> {
    // Check if image processing is supported
    if (!ImageProcessingService.canProcessImage(mimeType)) {
      throw new Error(`Image processing not supported for ${mimeType}`)
    }

    const startTime = Date.now()
    const operations: string[] = []

    try {
      // Get original metadata
      const originalMetadata = await sharp(imageBuffer).metadata()
      let sharpInstance = sharp(imageBuffer)

      // Apply transformations in the correct order
      sharpInstance = await this.applyTransformations(sharpInstance, options, operations)
      sharpInstance = await this.applyFilters(sharpInstance, options, operations)
      sharpInstance = await this.applyColorAdjustments(sharpInstance, options, operations)
      sharpInstance = await this.applyAdvancedOperations(sharpInstance, options, operations)
      sharpInstance = await this.applyFormatOptions(sharpInstance, options, operations)
      sharpInstance = await this.applyMetadataOptions(sharpInstance, options, operations)

      // Generate final result
      const result = await sharpInstance.toBuffer({ resolveWithObject: true })
      const processingTime = Date.now() - startTime

      return {
        buffer: result.data,
        width: result.info.width,
        height: result.info.height,
        format: result.info.format,
        size: result.data.length,
        metadata: {
          originalWidth: originalMetadata.width,
          originalHeight: originalMetadata.height,
          originalFormat: originalMetadata.format,
          originalSize: imageBuffer.length,
          processingTime,
          operations
        }
      }
    } catch (error) {
      throw new Error(`Image processing failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate thumbnails for an image (legacy method)
   */
  async generateThumbnails(
    imageBuffer: Buffer,
    mimeType: string,
    options: ThumbnailGenerationOptions = {}
  ): Promise<ThumbnailResult[]> {
    // Check if thumbnail generation is supported
    if (!ImageProcessingService.canGenerateThumbnail(mimeType)) {
      throw new Error(`Thumbnail generation not supported for ${mimeType}`)
    }

    // Determine sizes to generate
    let sizes = options.sizes || []
    if (options.defaultSizes !== false && sizes.length === 0) {
      sizes = ImageProcessingService.DEFAULT_SIZES
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
    return [...ImageProcessingService.DEFAULT_SIZES]
  }

  /**
   * Get supported image formats
   */
  static getSupportedFormats(): string[] {
    return [...ImageProcessingService.SUPPORTED_FORMATS]
  }

  /**
   * Convert format conversion
   */
  async convertFormat(
    imageBuffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff',
    options: {
      quality?: number
      lossless?: boolean
      progressive?: boolean
    } = {}
  ): Promise<ImageProcessingResult> {
    return this.processImage(imageBuffer, 'image/jpeg', {
      format: targetFormat,
      quality: options.quality,
      lossless: options.lossless,
      progressive: options.progressive
    })
  }

  /**
   * Optimize image (reduce file size while maintaining quality)
   */
  async optimizeImage(
    imageBuffer: Buffer,
    mimeType: string,
    options: {
      quality?: number
      progressive?: boolean
      stripMetadata?: boolean
    } = {}
  ): Promise<ImageProcessingResult> {
    const processingOptions: ImageProcessingOptions = {
      quality: options.quality || 85,
      progressive: options.progressive !== false,
      stripExif: options.stripMetadata !== false,
      normalize: true
    }

    // Auto-detect best format for optimization
    if (mimeType.includes('png') && options.quality && options.quality < 95) {
      processingOptions.format = 'webp'
    }

    return this.processImage(imageBuffer, mimeType, processingOptions)
  }

  /**
   * Create image variations for responsive design
   */
  async createResponsiveImages(
    imageBuffer: Buffer,
    mimeType: string,
    sizes: Array<{ width: number; suffix: string }> = [
      { width: 320, suffix: 'xs' },
      { width: 768, suffix: 'sm' },
      { width: 1024, suffix: 'md' },
      { width: 1920, suffix: 'lg' }
    ]
  ): Promise<Array<ImageProcessingResult & { suffix: string }>> {
    const results = []

    for (const size of sizes) {
      try {
        const result = await this.processImage(imageBuffer, mimeType, {
          resize: {
            width: size.width,
            withoutEnlargement: true,
            fit: 'inside'
          },
          format: 'webp',
          quality: 85
        })

        results.push({
          ...result,
          suffix: size.suffix
        })
      } catch (error) {
        console.warn(`Failed to create responsive image for ${size.suffix}:`, error)
      }
    }

    return results
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
   * Extract comprehensive image metadata
   */
  async getImageMetadata(imageBuffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(imageBuffer).metadata()
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: imageBuffer.length,
      colorspace: metadata.space,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density,
      exif: metadata.exif,
      icc: metadata.icc,
      orientation: metadata.orientation
    }
  }

  /**
   * Apply transformation operations
   */
  private async applyTransformations(
    sharpInstance: sharp.Sharp,
    options: ImageProcessingOptions,
    operations: string[]
  ): Promise<sharp.Sharp> {
    // Resize
    if (options.resize) {
      const { width, height, fit = 'cover', withoutEnlargement = false } = options.resize
      sharpInstance = sharpInstance.resize({
        width,
        height,
        fit: this.mapFitStrategy(fit),
        withoutEnlargement
      })
      operations.push(`resize(${width || 'auto'}x${height || 'auto'})`)
    }

    // Crop
    if (options.crop) {
      const { left, top, width, height } = options.crop
      
      // Get current image metadata for validation (after any resize operations)
      const currentImageBuffer = await sharpInstance.toBuffer()
      const currentMetadata = await sharp(currentImageBuffer).metadata()
      const imgWidth = currentMetadata.width || 0
      const imgHeight = currentMetadata.height || 0
      
      // Rebuild sharp instance from current buffer
      sharpInstance = sharp(currentImageBuffer)
      
      // Validate crop dimensions and bounds
      if (width < 10 || height < 10) {
        console.warn(`Crop dimensions too small (${width}x${height}), minimum is 10x10 pixels`)
        operations.push(`crop-skipped(too-small: ${width}x${height})`)
      } else if (left + width > imgWidth || top + height > imgHeight || left < 0 || top < 0) {
        console.warn(`Crop area out of bounds: crop(${left},${top},${width},${height}) vs image(${imgWidth}x${imgHeight})`)
        operations.push(`crop-skipped(out-of-bounds: ${left},${top},${width},${height})`)
      } else {
        sharpInstance = sharpInstance.extract({ left, top, width, height })
        operations.push(`crop(${left},${top},${width},${height})`)
      }
    }

    // Rotate
    if (options.rotate) {
      const { angle, background = '#000000' } = options.rotate
      sharpInstance = sharpInstance.rotate(angle, { background })
      operations.push(`rotate(${angle})`)
    }

    // Flip
    if (options.flip) {
      sharpInstance = sharpInstance.flip()
      operations.push('flip')
    }

    // Flop
    if (options.flop) {
      sharpInstance = sharpInstance.flop()
      operations.push('flop')
    }

    return sharpInstance
  }

  /**
   * Apply filter operations
   */
  private async applyFilters(
    sharpInstance: sharp.Sharp,
    options: ImageProcessingOptions,
    operations: string[]
  ): Promise<sharp.Sharp> {
    // Blur
    if (options.blur !== undefined) {
      if (typeof options.blur === 'boolean' && options.blur) {
        sharpInstance = sharpInstance.blur()
        operations.push('blur(default)')
      } else if (typeof options.blur === 'number' && options.blur > 0) {
        sharpInstance = sharpInstance.blur(options.blur)
        operations.push(`blur(${options.blur})`)
      } else if (typeof options.blur === 'string') {
        // Handle invalid string values by skipping blur
        console.warn('Invalid blur value:', options.blur, 'Expected number or boolean')
      }
    }

    // Sharpen
    if (options.sharpen !== undefined) {
      if (typeof options.sharpen === 'boolean' && options.sharpen) {
        sharpInstance = sharpInstance.sharpen()
        operations.push('sharpen(default)')
      } else if (typeof options.sharpen === 'object' && options.sharpen !== null) {
        const { sigma, flat, jagged } = options.sharpen
        const sharpenOptions: any = {}
        if (sigma !== undefined) sharpenOptions.sigma = sigma
        if (flat !== undefined) sharpenOptions.flat = flat
        if (jagged !== undefined) sharpenOptions.jagged = jagged
        
        if (Object.keys(sharpenOptions).length > 0) {
          sharpInstance = sharpInstance.sharpen(sharpenOptions)
          operations.push(`sharpen(${sigma || 'auto'})`)
        }
      } else if (typeof options.sharpen === 'string') {
        // Handle invalid string values by skipping sharpen
        console.warn('Invalid sharpen value:', options.sharpen, 'Expected boolean or object')
      }
    }

    // Median filter
    if (options.median) {
      sharpInstance = sharpInstance.median(options.median)
      operations.push(`median(${options.median})`)
    }

    // Normalize
    if (options.normalize) {
      sharpInstance = sharpInstance.normalize()
      operations.push('normalize')
    }

    // Gamma correction
    if (options.gamma) {
      sharpInstance = sharpInstance.gamma(options.gamma)
      operations.push(`gamma(${options.gamma})`)
    }

    return sharpInstance
  }

  /**
   * Apply color adjustment operations
   */
  private async applyColorAdjustments(
    sharpInstance: sharp.Sharp,
    options: ImageProcessingOptions,
    operations: string[]
  ): Promise<sharp.Sharp> {
    // Modulate (brightness, saturation, hue, lightness)
    if (options.modulate) {
      const { brightness, saturation, hue, lightness } = options.modulate
      const modulateOptions: any = {}
      
      if (brightness !== undefined) modulateOptions.brightness = brightness
      if (saturation !== undefined) modulateOptions.saturation = saturation
      if (hue !== undefined) {
        modulateOptions.hue = hue
        // Sharp requires lightness when hue is provided
        modulateOptions.lightness = lightness !== undefined ? lightness : 1
      } else if (lightness !== undefined) {
        modulateOptions.lightness = lightness
      }
      
      if (Object.keys(modulateOptions).length > 0) {
        sharpInstance = sharpInstance.modulate(modulateOptions)
        operations.push(`modulate(b:${modulateOptions.brightness || 1},s:${modulateOptions.saturation || 1},h:${modulateOptions.hue || 0},l:${modulateOptions.lightness || 1})`)
      }
    }

    // Negate
    if (options.negate) {
      sharpInstance = sharpInstance.negate()
      operations.push('negate')
    }

    // Grayscale
    if (options.grayscale) {
      sharpInstance = sharpInstance.grayscale()
      operations.push('grayscale')
    }

    // Threshold
    if (options.threshold !== undefined) {
      sharpInstance = sharpInstance.threshold(options.threshold)
      operations.push(`threshold(${options.threshold})`)
    }

    return sharpInstance
  }

  /**
   * Apply advanced operations
   */
  private async applyAdvancedOperations(
    sharpInstance: sharp.Sharp,
    options: ImageProcessingOptions,
    operations: string[]
  ): Promise<sharp.Sharp> {
    // CLAHE (Contrast Limited Adaptive Histogram Equalization)
    if (options.clahe) {
      const { width = 8, height = 8, maxSlope = 3 } = options.clahe
      sharpInstance = sharpInstance.clahe({ width, height, maxSlope })
      operations.push(`clahe(${width}x${height})`)
    }

    // Convolution
    if (options.convolve) {
      const { width, height, kernel, scale, offset } = options.convolve
      sharpInstance = sharpInstance.convolve({ width, height, kernel, scale, offset })
      operations.push(`convolve(${width}x${height})`)
    }

    // Watermark (text or image)
    if (options.watermark) {
      sharpInstance = await this.applyWatermark(sharpInstance, options.watermark)
      operations.push('watermark')
    }

    return sharpInstance
  }

  /**
   * Apply format-specific options
   */
  private async applyFormatOptions(
    sharpInstance: sharp.Sharp,
    options: ImageProcessingOptions,
    operations: string[]
  ): Promise<sharp.Sharp> {
    const format = options.format
    const quality = options.quality || 85
    const progressive = options.progressive || false
    const lossless = options.lossless || false

    if (format) {
      operations.push(`format(${format})`)
      
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ 
            quality, 
            progressive,
            mozjpeg: true
          })
          break
        case 'png':
          sharpInstance = sharpInstance.png({ 
            quality,
            progressive,
            compressionLevel: 9
          })
          break
        case 'webp':
          sharpInstance = sharpInstance.webp({ 
            quality,
            lossless,
            effort: 6
          })
          break
        case 'avif':
          sharpInstance = sharpInstance.avif({ 
            quality,
            lossless,
            effort: 6
          })
          break
        case 'tiff':
          sharpInstance = sharpInstance.tiff({ 
            quality,
            compression: 'lzw'
          })
          break
        case 'gif':
          sharpInstance = sharpInstance.gif()
          break
      }
    }

    return sharpInstance
  }

  /**
   * Apply metadata options
   */
  private async applyMetadataOptions(
    sharpInstance: sharp.Sharp,
    options: ImageProcessingOptions,
    operations: string[]
  ): Promise<sharp.Sharp> {
    if (options.keepMetadata === false || options.stripExif) {
      // Strip all metadata for privacy (HIPAA compliance)
      sharpInstance = sharpInstance.withMetadata({})
      operations.push('strip-metadata')
    } else if (options.keepMetadata === true) {
      // Keep metadata with sRGB profile
      sharpInstance = sharpInstance.withMetadata({ 
        exif: options.stripExif ? {} : undefined
      })
      operations.push('keep-metadata')
    }

    return sharpInstance
  }

  /**
   * Apply watermark to image
   */
  private async applyWatermark(
    sharpInstance: sharp.Sharp,
    watermark: NonNullable<ImageProcessingOptions['watermark']>
  ): Promise<sharp.Sharp> {
    // For now, implement text watermark as SVG overlay
    if (watermark.text) {
      const { text, position = 'bottom-right', opacity = 0.5 } = watermark
      
      // Get current image metadata to size watermark appropriately
      const metadata = await sharpInstance.metadata()
      const imageWidth = metadata.width || 200
      const imageHeight = metadata.height || 50
      
      // Skip watermark if image is too small
      if (imageWidth < 50 || imageHeight < 20) {
        console.warn('Image too small for watermark, skipping watermark application')
        return sharpInstance
      }
      
      // Calculate watermark dimensions based on image size
      const watermarkWidth = Math.min(Math.floor(imageWidth * 0.8), 400)
      const watermarkHeight = Math.min(Math.floor(imageHeight * 0.15), 50)
      const fontSize = Math.min(Math.floor(watermarkHeight * 0.6), 24)
      
      // Create SVG text watermark with dynamic sizing
      const textSvg = `
        <svg width="${watermarkWidth}" height="${watermarkHeight}">
          <text x="10" y="${Math.floor(watermarkHeight * 0.7)}" font-family="Arial" font-size="${fontSize}" fill="white" opacity="${opacity}">
            ${text}
          </text>
        </svg>
      `
      
      const watermarkBuffer = Buffer.from(textSvg)
      const gravity = this.getGravityFromPosition(position)
      
      sharpInstance = sharpInstance.composite([
        { input: watermarkBuffer, gravity }
      ])
    }

    return sharpInstance
  }

  /**
   * Convert position to Sharp gravity
   */
  private getGravityFromPosition(position: string): keyof sharp.GravityEnum {
    const gravityMap: Record<string, keyof sharp.GravityEnum> = {
      'top-left': 'northwest',
      'top-right': 'northeast',
      'bottom-left': 'southwest',
      'bottom-right': 'southeast',
      'center': 'center'
    }
    
    return gravityMap[position] || 'southeast'
  }
}