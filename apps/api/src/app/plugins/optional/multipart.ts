import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

const pump = promisify(pipeline);

/**
 * This plugin adds multipart form data support for file uploads
 *
 * @see https://github.com/fastify/fastify-multipart
 */
export default fp(async function (fastify: FastifyInstance) {
    await fastify.register(multipart, {
        // Multipart options
        limits: {
            fieldNameSize: 100, // Max field name size in bytes
            fieldSize: 100, // Max field value size in bytes
            fields: 10, // Max number of non-file fields
            fileSize: 10 * 1024 * 1024, // Max file size in bytes (10MB)
            files: 5, // Max number of file fields
            headerPairs: 2000 // Max number of header key=>value pairs
        },

        // Attachment options
        attachFieldsToBody: 'keyValues', // or true or false

        // Custom error handling
        onFile: async (part) => {
            // Optional: Custom file processing
            // This can be used for validation, virus scanning, etc.
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];

            if (!allowedTypes.includes(part.mimetype)) {
                throw new Error(`File type ${part.mimetype} not allowed`);
            }

            // Optional: You can process the file here
            // For now, we'll let the default behavior handle it
        }
    });

    // File upload route example
    fastify.post('/upload/single', {
        schema: {
            consumes: ['multipart/form-data'],
            body: {
                type: 'object',
                properties: {
                    file: {
                        type: 'object',
                        description: 'The file to upload'
                    },
                    description: {
                        type: 'string',
                        description: 'Optional file description'
                    }
                },
                required: ['file']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        filename: { type: 'string' },
                        size: { type: 'number' },
                        mimetype: { type: 'string' },
                        path: { type: 'string' },
                        uploadedAt: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Generate unique filename
            const timestamp = Date.now();
            const extension = path.extname(data.filename);
            const baseName = path.basename(data.filename, extension);
            const filename = `${baseName}_${timestamp}${extension}`;
            const filepath = path.join(uploadsDir, filename);

            // Save file to disk
            await pump(data.file, fs.createWriteStream(filepath));

            return {
                success: true,
                filename: filename,
                originalName: data.filename,
                size: fs.statSync(filepath).size,
                mimetype: data.mimetype,
                path: `/uploads/${filename}`,
                uploadedAt: new Date().toISOString()
            };
        } catch (error) {
            request.log.error(error, 'File upload error');
            return reply.code(500).send({ error: 'File upload failed' });
        }
    });

    // Multiple files upload route
    fastify.post('/upload/multiple', {
        schema: {
            consumes: ['multipart/form-data'],
            body: {
                type: 'object',
                properties: {
                    files: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Array of files to upload'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        files: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    filename: { type: 'string' },
                                    originalName: { type: 'string' },
                                    size: { type: 'number' },
                                    mimetype: { type: 'string' },
                                    path: { type: 'string' }
                                }
                            }
                        },
                        uploadedAt: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const parts = request.files();
            const uploadedFiles = [];

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            for await (const part of parts) {
                if (part.type === 'file') {
                    // Generate unique filename
                    const timestamp = Date.now();
                    const randomId = Math.random().toString(36).substring(7);
                    const extension = path.extname(part.filename);
                    const baseName = path.basename(part.filename, extension);
                    const filename = `${baseName}_${timestamp}_${randomId}${extension}`;
                    const filepath = path.join(uploadsDir, filename);

                    // Save file to disk
                    await pump(part.file, fs.createWriteStream(filepath));

                    uploadedFiles.push({
                        filename: filename,
                        originalName: part.filename,
                        size: fs.statSync(filepath).size,
                        mimetype: part.mimetype,
                        path: `/uploads/${filename}`
                    });
                }
            }

            return {
                success: true,
                files: uploadedFiles,
                uploadedAt: new Date().toISOString()
            };
        } catch (error) {
            request.log.error(error, 'Multiple files upload error');
            return reply.code(500).send({ error: 'Files upload failed' });
        }
    });

    // Form data with mixed content (files + fields)
    fastify.post('/upload/form', {
        schema: {
            consumes: ['multipart/form-data'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        fields: { type: 'object' },
                        files: { type: 'array' },
                        processedAt: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const parts = request.parts();
            const fields: Record<string, unknown> = {};
            const files = [];

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            for await (const part of parts) {
                if (part.type === 'field') {
                    // Handle form fields
                    fields[part.fieldname] = part.value;
                } else if (part.type === 'file') {
                    // Handle file uploads
                    const timestamp = Date.now();
                    const randomId = Math.random().toString(36).substring(7);
                    const extension = path.extname(part.filename);
                    const baseName = path.basename(part.filename, extension);
                    const filename = `${baseName}_${timestamp}_${randomId}${extension}`;
                    const filepath = path.join(uploadsDir, filename);

                    await pump(part.file, fs.createWriteStream(filepath));

                    files.push({
                        fieldname: part.fieldname,
                        filename: filename,
                        originalName: part.filename,
                        mimetype: part.mimetype,
                        size: fs.statSync(filepath).size,
                        path: `/uploads/${filename}`
                    });
                }
            }

            return {
                success: true,
                fields,
                files,
                processedAt: new Date().toISOString()
            };
        } catch (error) {
            request.log.error(error, 'Form upload error');
            return reply.code(500).send({ error: 'Form processing failed' });
        }
    });
});
