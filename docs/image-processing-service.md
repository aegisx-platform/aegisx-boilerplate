# Image Processing Service Documentation

## Overview

The Image Processing Service provides comprehensive image manipulation capabilities using Sharp.js, fully integrated with the existing storage system. This service supports healthcare-grade HIPAA-compliant image processing with extensive operation logging and audit trails.

## Features

### Core Capabilities
- **Comprehensive Image Processing**: Resize, crop, rotate, flip/flop operations
- **Format Conversion**: JPEG, PNG, WebP, AVIF, TIFF, GIF support
- **Image Optimization**: Quality adjustment, progressive encoding, file size reduction
- **Filters & Effects**: Blur, sharpen, grayscale, color adjustments
- **Metadata Management**: EXIF extraction, metadata stripping for privacy
- **Watermarking**: Text watermarks with customizable positioning
- **Healthcare Compliance**: HIPAA-compliant metadata stripping and audit logging

### Advanced Operations
- **Color Adjustments**: Brightness, saturation, hue modulation
- **Advanced Filters**: CLAHE (Contrast Limited Adaptive Histogram Equalization), convolution
- **Smart Optimization**: Automatic format detection for best compression
- **Responsive Images**: Multiple size generation for web applications

## API Endpoints

All endpoints require authentication and appropriate file access permissions.

### 1. Process Image
```
POST /api/v1/storage/images/process/:fileId
```

Comprehensive image processing with multiple operations.

**Request Body:**
```json
{
  "operations": {
    "resize": {
      "width": 800,
      "height": 600,
      "fit": "cover",
      "withoutEnlargement": true
    },
    "crop": {
      "left": 100,
      "top": 100,
      "width": 600,
      "height": 400
    },
    "rotate": {
      "angle": 90,
      "background": "#ffffff"
    },
    "flip": true,
    "flop": false,
    "format": "webp",
    "quality": 85,
    "progressive": true,
    "blur": 2,
    "sharpen": true,
    "grayscale": false,
    "modulate": {
      "brightness": 1.1,
      "saturation": 0.9,
      "hue": 10
    },
    "watermark": {
      "text": "Confidential",
      "position": "bottom-right",
      "opacity": 0.7
    }
  },
  "saveAsNew": true,
  "filename": "processed_image.webp"
}
```

### 2. Convert Format
```
POST /api/v1/storage/images/convert/:fileId
```

Convert image to different format with quality options.

**Request Body:**
```json
{
  "format": "webp",
  "quality": 90,
  "lossless": false,
  "progressive": true,
  "saveAsNew": true,
  "filename": "converted_image.webp"
}
```

### 3. Optimize Image
```
POST /api/v1/storage/images/optimize/:fileId
```

Optimize image for reduced file size while maintaining quality.

**Request Body:**
```json
{
  "quality": 85,
  "progressive": true,
  "stripMetadata": true,
  "saveAsNew": true,
  "filename": "optimized_image.jpg"
}
```

### 4. Get Image Metadata
```
GET /api/v1/storage/images/metadata/:fileId
```

Extract comprehensive metadata from image file.

**Response:**
```json
{
  "success": true,
  "fileId": "uuid",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "jpeg",
    "size": 2048576,
    "colorspace": "srgb",
    "hasAlpha": false,
    "density": 72,
    "orientation": 1,
    "exif": {}
  }
}
```

### 5. Get Supported Formats
```
GET /api/v1/storage/images/formats
```

Get list of supported image formats and recommendations.

**Response:**
```json
{
  "success": true,
  "formats": {
    "input": ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff", "image/gif"],
    "output": ["jpeg", "png", "webp", "avif", "tiff", "gif"],
    "recommended": {
      "photos": "jpeg",
      "graphics": "png",
      "web": "webp",
      "nextGen": "avif"
    }
  }
}
```

## Processing Options

### Resize Operations
```typescript
resize: {
  width?: number           // Target width (1-4096)
  height?: number          // Target height (1-4096) 
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  withoutEnlargement?: boolean  // Prevent upscaling
}
```

### Crop Operations
```typescript
crop: {
  left: number    // X position (pixels from left)
  top: number     // Y position (pixels from top)
  width: number   // Crop width
  height: number  // Crop height
}
```

### Rotation & Flipping
```typescript
rotate: {
  angle: number      // Rotation angle (-360 to 360 degrees)
  background?: string // Background color for empty areas (#RRGGBB)
}
flip: boolean        // Vertical flip
flop: boolean        // Horizontal flip
```

### Format & Quality
```typescript
format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'gif'
quality?: number     // Quality level (1-100)
progressive?: boolean // Progressive encoding
lossless?: boolean   // Lossless compression (WebP/AVIF)
```

### Filters & Effects
```typescript
blur?: number | boolean    // Blur amount or default blur
sharpen?: boolean | {      // Sharpen settings
  sigma?: number
  flat?: number  
  jagged?: number
}
grayscale?: boolean        // Convert to grayscale
```

### Color Adjustments
```typescript
modulate: {
  brightness?: number  // Brightness multiplier (0-3)
  saturation?: number  // Saturation multiplier (0-3)
  hue?: number        // Hue shift (-360 to 360 degrees)
  lightness?: number  // Lightness multiplier (0-3) - automatically set to 1 when hue is provided
}
```

**Note**: When `hue` is specified, `lightness` is automatically set to 1 if not provided, as required by Sharp.js.

### Watermarking
```typescript
watermark: {
  text?: string     // Watermark text
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity?: number  // Opacity (0-1)
}
```

## Healthcare Compliance Features

### HIPAA Compliance
- **Metadata Stripping**: Automatically removes EXIF data and other metadata that might contain sensitive information
- **Audit Logging**: All image processing operations are logged with full audit trails
- **Access Control**: Integrates with existing file access control system
- **Secure Processing**: All operations respect file permissions and ownership

### Privacy Features
```typescript
// Strip all metadata for privacy
{
  stripMetadata: true,
  keepMetadata: false
}

// HIPAA-compliant optimization
{
  quality: 85,
  stripMetadata: true,
  progressive: true
}
```

## Usage Examples

### Basic Image Resize
```typescript
const response = await fetch('/api/v1/storage/images/process/uuid', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operations: {
      resize: {
        width: 800,
        height: 600,
        fit: 'cover'
      },
      quality: 85
    },
    saveAsNew: true
  })
})
```

### HIPAA-Compliant Processing
```typescript
// Process medical image with metadata stripping
const response = await fetch('/api/v1/storage/images/optimize/uuid', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    quality: 90,
    stripMetadata: true,  // Remove all EXIF/metadata
    progressive: true,
    saveAsNew: true,
    filename: 'patient_xray_processed.jpg'
  })
})
```

### Batch Format Conversion
```typescript
// Convert multiple images to WebP
const fileIds = ['uuid1', 'uuid2', 'uuid3']

for (const fileId of fileIds) {
  await fetch(`/api/v1/storage/images/convert/${fileId}`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      format: 'webp',
      quality: 90,
      saveAsNew: true
    })
  })
}
```

### Advanced Image Enhancement
```typescript
const response = await fetch('/api/v1/storage/images/process/uuid', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operations: {
      resize: {
        width: 1200,
        height: 800,
        fit: 'inside'
      },
      sharpen: {
        sigma: 1.5,
        flat: 2,
        jagged: 3
      },
      modulate: {
        brightness: 1.1,
        saturation: 1.2
      },
      format: 'webp',
      quality: 95,
      progressive: true
    },
    saveAsNew: true,
    filename: 'enhanced_image.webp'
  })
})
```

## Response Format

All processing endpoints return a standardized response:

```typescript
interface ImageProcessResponse {
  success: boolean
  originalFileId: string
  processedFileId?: string     // When saveAsNew: true
  operation: string
  parameters: Record<string, any>
  processingTime: number       // Processing time in milliseconds
  metadata: {
    originalSize: number       // Original file size in bytes
    processedSize: number      // Processed file size in bytes
    format: string            // Output format
    dimensions: {
      original: { width: number; height: number }
      processed: { width: number; height: number }
    }
    operations: string[]      // List of operations applied
  }
}
```

## Integration with Storage System

### File Access Control
- All image processing operations respect existing file permissions
- Uses the same authentication and authorization system
- Integrates with file access control middleware

### Audit Logging
- Every image processing operation is logged in the database
- Includes operation type, parameters, processing time, and user information
- Full audit trail for compliance requirements

### Storage Provider Support
- Works with both Local and MinIO storage providers
- Automatic provider detection and routing
- Consistent behavior across all providers

## Performance Considerations

### Processing Time
- Simple operations (resize, crop): 100-500ms
- Complex operations (multiple filters): 500-2000ms
- Large images (>10MB): May take 2-5 seconds

### Memory Usage
- Sharp processes images in streaming fashion when possible
- Peak memory usage typically 2-3x the source image size
- Automatic garbage collection after processing

### Optimization Tips
1. **Use WebP format** for web applications (smaller file sizes)
2. **Enable progressive encoding** for better perceived performance
3. **Strip metadata** for smaller file sizes and privacy
4. **Batch operations** when processing multiple images
5. **Use appropriate quality settings** (85-90 for most use cases)

## Error Handling

### Common Error Codes
- `FILE_NOT_FOUND`: Source file doesn't exist
- `UNSUPPORTED_FILE_TYPE`: File type not supported for processing
- `PROCESSING_FAILED`: Image processing operation failed
- `ACCESS_DENIED`: Insufficient permissions to process file
- `INVALID_PARAMETERS`: Invalid processing parameters

### Error Response Format
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Image processing failed",
    "details": "Detailed error information (development only)"
  }
}
```

## Environment Configuration

### Image Processing Settings
```bash
# Sharp Configuration (automatically detected)
SHARP_CACHE_SIZE=50        # Cache size in MB
SHARP_CONCURRENCY=4        # Number of concurrent operations

# Processing Limits
IMAGE_MAX_WIDTH=4096       # Maximum output width
IMAGE_MAX_HEIGHT=4096      # Maximum output height
IMAGE_MAX_OPERATIONS=10    # Maximum operations per request

# Healthcare Compliance
IMAGE_STRIP_METADATA_DEFAULT=true    # Default metadata stripping
IMAGE_AUDIT_ALL_OPERATIONS=true     # Log all operations
```

## Security Considerations

### Data Protection
- All image processing happens in memory or temporary files
- No persistent storage of intermediate processing steps
- Automatic cleanup of temporary resources

### Access Control
- Requires valid authentication token
- Respects file ownership and sharing permissions
- Integrates with existing RBAC system

### HIPAA Compliance
- Automatic metadata stripping for medical images
- Full audit logging of all operations
- Secure temporary file handling
- No data leakage between operations

## Best Practices

### For Healthcare Applications
1. **Always strip metadata** for patient images
2. **Use high quality settings** for diagnostic images
3. **Log all operations** for audit compliance
4. **Implement proper access controls** based on user roles
5. **Use HTTPS** for all API communications

### For Performance
1. **Process images asynchronously** for large files
2. **Use appropriate formats** (WebP for web, JPEG for photos)
3. **Cache processed images** when possible
4. **Monitor processing times** and optimize accordingly
5. **Implement rate limiting** for high-volume scenarios

### For Storage Efficiency
1. **Use progressive encoding** for faster loading
2. **Optimize quality settings** based on use case
3. **Consider format conversion** to modern formats
4. **Strip unnecessary metadata** to reduce file sizes
5. **Use appropriate compression levels** for your content type

## Troubleshooting

### Common Issues

**Image processing fails with large files:**
- Increase memory limits in Node.js
- Use streaming processing for very large images
- Consider breaking large operations into smaller steps

**Poor output quality:**
- Increase quality settings (90-95 for critical images)
- Use lossless compression for graphics
- Ensure source image is high quality

**Slow processing times:**
- Optimize Sharp configuration
- Use appropriate concurrency settings
- Consider processing images asynchronously

**Parameter validation errors:**
- Ensure blur values are numbers or booleans, not strings
- When using modulate with hue, lightness is automatically handled
- Check parameter types match the API documentation

**Metadata not stripped:**
- Ensure `stripMetadata: true` is set
- Verify healthcare compliance settings
- Check audit logs for confirmation

### Support

For technical support or feature requests, please refer to the main project documentation or submit an issue through the project's issue tracking system.