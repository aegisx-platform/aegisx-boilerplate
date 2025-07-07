# Thumbnail Generation Service

## Overview

AegisX Storage Service รองรับการสร้าง thumbnail สำหรับไฟล์รูปภาพอัตโนมัติ โดยใช้ Sharp library ที่มีประสิทธิภาพสูง ช่วยให้สามารถแสดงรูปภาพขนาดเล็กได้รวดเร็ว และประหยัดแบนด์วิธ

## Features

- ✅ **Optional Thumbnail Generation** - เลือกได้ว่าจะสร้าง thumbnail หรือไม่
- ✅ **Multiple Size Support** - สร้าง thumbnail หลายขนาดในครั้งเดียว
- ✅ **Custom Size Configuration** - กำหนดขนาดและคุณภาพได้เอง
- ✅ **High Performance** - ใช้ Sharp library ที่เร็วและมีประสิทธิภาพ
- ✅ **Format Support** - รองรับ JPEG, PNG, WebP
- ✅ **Fit Options** - วิธีการปรับขนาดที่หลากหลาย (cover, contain, inside, etc.)
- ✅ **Quality Control** - ควบคุมคุณภาพของภาพได้
- ✅ **Non-blocking** - การสร้าง thumbnail ล้มเหลวไม่ทำให้ upload fail
- ✅ **API Integration** - เชื่อมต่อกับ Storage API อย่างสมบูรณ์

## Installation

Thumbnail generation ใช้ Sharp library ที่ติดตั้งไว้อยู่แล้ว:

```bash
# Sharp มีอยู่แล้วใน dependencies
npm list sharp
# @aegisx-boilerplate/api@0.0.1 -> ./apps/api
#   └── sharp@0.34.2
```

## Configuration

### Environment Variables

```bash
# Storage Provider (รองรับทั้ง local และ minio)
STORAGE_PROVIDER=local|minio
STORAGE_ENABLED=true

# Local Storage Configuration
STORAGE_LOCAL_BASE_PATH=./storage
STORAGE_LOCAL_PERMISSIONS=0755
STORAGE_LOCAL_MAX_FILE_SIZE=104857600  # 100MB
STORAGE_LOCAL_MAX_FILES=10000

# MinIO Configuration (สำหรับ thumbnail ใน MinIO)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=aegisx-storage
MINIO_REGION=us-east-1
```

### Default Thumbnail Sizes

ถ้าไม่ระบุ `thumbnailSizes` ระบบจะใช้ขนาดเริ่มต้น:

```typescript
const DEFAULT_SIZES = [
  { width: 150, height: 150, fit: 'cover', quality: 80, format: 'jpeg' },
  { width: 300, height: 300, fit: 'cover', quality: 85, format: 'jpeg' },
  { width: 800, height: 600, fit: 'inside', quality: 90, format: 'jpeg' }
]
```

## API Usage

### Upload with Thumbnail Generation

#### Basic Usage (Default Sizes)

```bash
curl -X POST http://localhost:3000/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg" \
  -F "generateThumbnail=true"
```

#### Custom Thumbnail Sizes

```bash
curl -X POST http://localhost:3000/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg" \
  -F "generateThumbnail=true" \
  -F 'thumbnailSizes=[
    {"width":100,"height":100,"fit":"cover","quality":90},
    {"width":500,"height":500,"fit":"inside","quality":85,"format":"webp"}
  ]'
```

#### Without Thumbnails (Default)

```bash
curl -X POST http://localhost:3000/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@image.jpg" \
  -F "generateThumbnail=false"
```

### API Response

เมื่อ upload สำเร็จ จะได้ response ที่รวม thumbnail URLs:

```json
{
  "success": true,
  "fileId": "12345678-1234-1234-1234-123456789abc",
  "filename": "image.jpg",
  "size": 2048576,
  "mimeType": "image/jpeg",
  "checksum": "sha256hash...",
  "thumbnails": [
    {
      "url": "/storage/thumbnails/12345678-1234-1234-1234-123456789abc/150x150.jpeg",
      "width": 150,
      "height": 150,
      "size": 8192,
      "format": "jpeg"
    },
    {
      "url": "/storage/thumbnails/12345678-1234-1234-1234-123456789abc/300x300.jpeg",
      "width": 300,
      "height": 300,
      "size": 15360,
      "format": "jpeg"
    },
    {
      "url": "/storage/thumbnails/12345678-1234-1234-1234-123456789abc/800x600.jpeg",
      "width": 800,
      "height": 600,
      "size": 32768,
      "format": "jpeg"
    }
  ],
  "metadata": {
    // ... file metadata
  }
}
```

### Download Thumbnails

```bash
# ดาวน์โหลด thumbnail
GET /storage/thumbnails/:fileId/:filename

# ตัวอย่าง
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/storage/thumbnails/12345678-1234-1234-1234-123456789abc/150x150.jpeg
```

## Frontend Integration

### Angular Example

```typescript
export class FileUploadService {
  
  async uploadWithThumbnails(file: File, generateThumbnails = true): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('generateThumbnail', generateThumbnails.toString())
    
    // Custom thumbnail sizes (optional)
    if (generateThumbnails) {
      const customSizes = [
        { width: 200, height: 200, fit: 'cover', quality: 90 },
        { width: 400, height: 300, fit: 'inside', quality: 85 }
      ]
      formData.append('thumbnailSizes', JSON.stringify(customSizes))
    }
    
    return this.http.post<UploadResponse>('/storage/upload', formData).toPromise()
  }
  
  getThumbnailUrl(fileId: string, filename: string): string {
    return `/storage/thumbnails/${fileId}/${filename}`
  }
}
```

### React Example

```typescript
import { useState } from 'react'

interface ThumbnailSize {
  width: number
  height: number
  fit?: 'cover' | 'contain' | 'inside' | 'outside'
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [thumbnails, setThumbnails] = useState<ThumbnailInfo[]>([])
  
  const uploadFile = async () => {
    if (!file) return
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('generateThumbnail', 'true')
    
    // Custom sizes for different use cases
    const thumbnailSizes: ThumbnailSize[] = [
      { width: 100, height: 100, fit: 'cover' },      // Profile picture
      { width: 300, height: 200, fit: 'cover' },      // Card thumbnail
      { width: 800, height: 600, fit: 'inside' }      // Preview image
    ]
    formData.append('thumbnailSizes', JSON.stringify(thumbnailSizes))
    
    try {
      const response = await fetch('/storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      const result = await response.json()
      setThumbnails(result.thumbnails || [])
      
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }
  
  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={uploadFile}>Upload with Thumbnails</button>
      
      {thumbnails.map((thumb, index) => (
        <img 
          key={index} 
          src={thumb.url} 
          alt={`Thumbnail ${thumb.width}x${thumb.height}`}
          width={thumb.width}
          height={thumb.height}
        />
      ))}
    </div>
  )
}
```

## Configuration Options

### ThumbnailSize Interface

```typescript
interface ThumbnailSize {
  width: number        // ความกว้าง (pixels)
  height: number       // ความสูง (pixels)
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  quality?: number     // คุณภาพ 1-100 (default: 80)
  format?: 'jpeg' | 'png' | 'webp'  // รูปแบบไฟล์ (default: 'jpeg')
}
```

### Fit Options

- **`cover`** - ครอบคลุมพื้นที่ทั้งหมด อาจจะตัดส่วนเกิน (default)
- **`contain`** - ใส่ภาพทั้งหมด อาจจะมีพื้นที่ว่าง
- **`fill`** - เต็มพื้นที่ อาจจะบิดเบี้ยว
- **`inside`** - ภาพทั้งหมดอยู่ในกรอบ ไม่เกินขนาดที่กำหนด
- **`outside`** - ภาพเล็กสุดที่ครอบคลุมกรอบ

### Quality Settings

```typescript
// ตัวอย่างการใช้ quality ที่แตกต่างกัน
const thumbnailSizes = [
  { width: 100, height: 100, quality: 60 },   // ขนาดเล็ก ประหยัดพื้นที่
  { width: 300, height: 300, quality: 80 },   // ขนาดกลาง สมดุล
  { width: 800, height: 600, quality: 95 }    // ขนาดใหญ่ คุณภาพสูง
]
```

## Storage Structure

### Local Storage

```
storage/
├── files/                    # ไฟล์ต้นฉบับ
│   └── ab/cd/abcd1234.jpg
├── metadata/                 # ข้อมูล metadata
│   └── abcd1234.json
└── thumbnails/              # thumbnails
    └── abcd1234/            # แยกตาม fileId
        ├── 150x150.jpeg
        ├── 300x300.jpeg
        └── 800x600.jpeg
```

### MinIO Storage

```
minio-bucket/
├── files/                    # ไฟล์ต้นฉบับ
│   └── ab/cd/abcd1234.jpg
├── metadata/                 # ข้อมูล metadata
│   └── abcd1234.json
└── thumbnails/              # thumbnails (อัพโหลดใน MinIO)
    └── abcd1234/            # แยกตาม fileId
        ├── 150x150.jpeg
        ├── 300x300.jpeg
        └── 800x600.jpeg
```

## Supported Image Formats

### Input Formats (สามารถสร้าง thumbnail ได้)

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)
- **TIFF** (.tiff, .tif)
- **GIF** (.gif) - เฉพาะ frame แรก
- **SVG** (.svg)
- **AVIF** (.avif)

### Output Formats

- **JPEG** - เหมาะสำหรับภาพถ่าย (default)
- **PNG** - เหมาะสำหรับภาพที่ต้องการความโปร่งใส
- **WebP** - ขนาดเล็ก คุณภาพดี (รองรับ browser ใหม่)

## Performance Considerations

### Memory Usage

```typescript
// สำหรับไฟล์ขนาดใหญ่ ควรจำกัดจำนวน thumbnail
const efficientSizes = [
  { width: 150, height: 150 },   // Small
  { width: 400, height: 300 }    // Medium only
]

// หลีกเลี่ยงการสร้าง thumbnail ขนาดใหญ่เกินไป
const avoidThis = [
  { width: 2048, height: 1536 }, // ❌ ใหญ่เกินไป
  { width: 4096, height: 3072 }  // ❌ ใช้ memory มาก
]
```

### Async Processing

Thumbnail generation ทำงานแบบ asynchronous และไม่ block upload process:

```typescript
// ถ้า thumbnail generation ล้มเหลว
// การ upload ยังคงสำเร็จ แต่จะไม่มี thumbnails ใน response
{
  "success": true,
  "fileId": "12345",
  // ... other fields
  "thumbnails": [] // ว่างเปล่าถ้า generation ล้มเหลว
}
```

## Error Handling

### Common Issues

1. **ไฟล์ไม่ใช่รูปภาพ**
   ```json
   {
     "success": true,  // Upload สำเร็จ
     "thumbnails": []  // แต่ไม่มี thumbnails
   }
   ```

2. **Sharp processing error**
   ```bash
   # จะมี warning ใน logs แต่ไม่ fail upload
   console.warn(`Failed to generate thumbnails for ${fileId}:`, error)
   ```

3. **Invalid thumbnail sizes**
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Each thumbnail size must have width and height as numbers"
     }
   }
   ```

### Best Practices

```typescript
// ✅ ตรวจสอบก่อน upload
const validateThumbnailSizes = (sizes: ThumbnailSize[]): boolean => {
  return sizes.every(size => 
    size.width > 0 && 
    size.height > 0 && 
    size.width <= 2048 && 
    size.height <= 2048
  )
}

// ✅ Handle thumbnail generation failure
const handleUploadResponse = (response: UploadResponse) => {
  if (response.success) {
    if (response.thumbnails && response.thumbnails.length > 0) {
      console.log('Upload and thumbnails successful')
    } else {
      console.warn('Upload successful but no thumbnails generated')
    }
  }
}
```

## Healthcare Compliance

### Data Classification

Thumbnails สืบทอด data classification จากไฟล์ต้นฉบับ:

```typescript
// ถ้าไฟล์ต้นฉบับเป็น 'confidential'
// Thumbnails จะเป็น 'confidential' เช่นกัน
const uploadRequest = {
  file: medicalImage,
  dataClassification: 'confidential',
  generateThumbnail: true
}
```

### Access Control

Thumbnails ใช้ access control เดียวกันกับไฟล์ต้นฉบับ:

```typescript
// ต้องมีสิทธิ์ 'read' ในไฟล์ต้นฉบับ
// ถึงจะดาวน์โหลด thumbnail ได้
GET /storage/thumbnails/:fileId/:filename
// ผ่าน middleware: checkFileAccess('read')
```

## Troubleshooting

### Thumbnail ไม่ได้สร้าง

1. **ตรวจสอบไฟล์เป็นภาพหรือไม่**
   ```bash
   # ดู MIME type ใน response
   "mimeType": "image/jpeg"  # ✅ 
   "mimeType": "application/pdf"  # ❌ ไม่สร้าง thumbnail
   ```

2. **ตรวจสอบ Sharp installation**
   ```bash
   npm list sharp
   # ต้องมี sharp@^0.34.2
   ```

3. **ตรวจสอบ Storage provider**
   ```bash
   # Thumbnail รองรับทั้ง local และ minio
   STORAGE_PROVIDER=local  # ✅ รองรับ
   STORAGE_PROVIDER=minio  # ✅ รองรับแล้ว (เพิ่มใหม่!)
   ```

### Performance Issues

1. **Thumbnail ใหญ่เกินไป**
   ```typescript
   // ❌ หลีกเลี่ยง
   { width: 2048, height: 1536 }
   
   // ✅ แนะนำ
   { width: 800, height: 600 }
   ```

2. **จำนวน thumbnail มากเกินไป**
   ```typescript
   // ❌ หลีกเลี่ยง
   const sizes = Array.from({length: 20}, (_, i) => ({
     width: 100 + i * 50, 
     height: 100 + i * 50
   }))
   
   // ✅ แนะนำ 3-5 ขนาด
   const sizes = [
     { width: 150, height: 150 },
     { width: 300, height: 300 },
     { width: 600, height: 400 }
   ]
   ```

## Future Enhancements

### Planned Features

- [x] **MinIO Provider Support** - รองรับ thumbnail ใน MinIO ✅ **เสร็จแล้ว!**
- [ ] **Lazy Loading** - สร้าง thumbnail เมื่อมีการเรียกใช้ครั้งแรก
- [ ] **Progressive JPEG** - สร้าง progressive JPEG สำหรับ loading ที่นุ่มนวล
- [ ] **Batch Processing** - สร้าง thumbnail หลายไฟล์พร้อมกัน
- [ ] **Crop Modes** - เพิ่มตัวเลือกการ crop ที่หลากหลาย
- [ ] **Watermark Support** - เพิ่ม watermark ลงใน thumbnail

### Integration Ideas

- **CDN Integration** - ใช้ CDN สำหรับ serve thumbnails
- **Image Optimization** - เพิ่ม optimization algorithms
- **Responsive Images** - สร้าง srcset สำหรับ responsive design

---

## Related Documentation

- [Storage Service](./storage-service.md) - ระบบ storage หลัก
- [Storage Database](./storage-database.md) - การจัดเก็บข้อมูลใน database
- [File Access Control](./file-access-control-plugin.md) - ระบบควบคุมการเข้าถึงไฟล์

---

**🎯 Thumbnail Generation Service พร้อมใช้งานแล้ว! สร้างประสบการณ์การใช้งานที่รวดเร็วและมีประสิทธิภาพสำหรับระบบ Healthcare ของคุณ**