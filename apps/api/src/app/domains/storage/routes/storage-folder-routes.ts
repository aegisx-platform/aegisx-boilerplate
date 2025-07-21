/**
 * Storage Folder Routes
 * 
 * API routes for folder management operations
 */

import { FastifyInstance } from 'fastify'
import { StorageFolderController } from '../controllers/storage-folder-controller'
import {
  CreateFolderRequestSchema,
  FolderResponseSchema,
  ListFoldersRequestSchema,
  ListFoldersResponseSchema,
  UpdateFolderRequestSchema,
  DeleteFolderResponseSchema,
  FolderTreeResponseSchema,
  FolderIdParamsSchema,
  ErrorResponseSchema
} from '../schemas/storage.schemas'

export async function storageFolderRoutes(fastify: FastifyInstance) {
  const folderController = (fastify as any).storageFolder as StorageFolderController

  // Create folder
  fastify.post('/folders', {
    schema: {
      summary: 'Create a new folder',
      description: 'Create a new folder in the storage system with optional metadata and organization',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      body: CreateFolderRequestSchema,
      response: {
        201: {
          description: 'Folder created successfully',
          ...FolderResponseSchema
        },
        400: {
          description: 'Bad request - Invalid folder data',
          ...ErrorResponseSchema
        },
        404: {
          description: 'Parent folder not found',
          ...ErrorResponseSchema
        },
        409: {
          description: 'Folder already exists at this path',
          ...ErrorResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return folderController.createFolder(request as any, reply)
    }
  })

  // Get folder by ID
  fastify.get('/folders/:folderId', {
    schema: {
      summary: 'Get folder by ID',
      description: 'Retrieve detailed information about a specific folder',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      params: FolderIdParamsSchema,
      response: {
        200: {
          description: 'Folder information retrieved successfully',
          ...FolderResponseSchema
        },
        404: {
          description: 'Folder not found',
          ...ErrorResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return folderController.getFolderById(request as any, reply)
    }
  })

  // List folders
  fastify.get('/folders', {
    schema: {
      summary: 'List folders',
      description: 'Get a list of folders with filtering, sorting, and pagination options',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      querystring: ListFoldersRequestSchema,
      response: {
        200: {
          description: 'Folders retrieved successfully',
          ...ListFoldersResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return folderController.listFolders(request as any, reply)
    }
  })

  // Update folder
  fastify.patch('/folders/:folderId', {
    schema: {
      summary: 'Update folder',
      description: 'Update folder metadata, settings, and organization properties',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      params: FolderIdParamsSchema,
      body: UpdateFolderRequestSchema,
      response: {
        200: {
          description: 'Folder updated successfully',
          ...FolderResponseSchema
        },
        400: {
          description: 'Bad request - Invalid update data',
          ...ErrorResponseSchema
        },
        404: {
          description: 'Folder not found',
          ...ErrorResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return folderController.updateFolder(request as any, reply)
    }
  })

  // Delete folder
  fastify.delete('/folders/:folderId', {
    schema: {
      summary: 'Delete folder',
      description: 'Permanently delete a folder and all its contents (files and subfolders)',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      params: FolderIdParamsSchema,
      response: {
        200: {
          description: 'Folder deleted successfully',
          ...DeleteFolderResponseSchema
        },
        404: {
          description: 'Folder not found',
          ...ErrorResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return folderController.deleteFolder(request as any, reply)
    }
  })

  // Get folder tree
  fastify.get('/folders/tree', {
    schema: {
      summary: 'Get folder tree structure',
      description: 'Retrieve the hierarchical folder structure starting from root or a specific folder',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          rootFolderId: {
            type: 'string',
            description: 'Root folder ID to start from (omit for full tree)'
          },
          includeFiles: {
            type: 'boolean',
            default: false,
            description: 'Include files in the tree structure'
          }
        }
      },
      response: {
        200: {
          description: 'Folder tree retrieved successfully',
          ...FolderTreeResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return folderController.getFolderTree(request as any, reply)
    }
  })

  // Move folder
  fastify.post('/folders/:folderId/move', {
    schema: {
      summary: 'Move folder to new parent',
      description: 'Move a folder to a different parent folder or to root level',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      params: FolderIdParamsSchema,
      body: {
        type: 'object',
        properties: {
          newParentId: {
            oneOf: [
              { type: 'string' },
              { type: 'null' }
            ],
            description: 'New parent folder ID (null for root level)'
          }
        }
      },
      response: {
        200: {
          description: 'Folder moved successfully',
          ...FolderResponseSchema
        },
        400: {
          description: 'Bad request - Invalid move operation',
          ...ErrorResponseSchema
        },
        404: {
          description: 'Folder or target parent not found',
          ...ErrorResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return folderController.moveFolder(request as any, reply)
    }
  })

  // Get folder statistics
  fastify.get('/folders/:folderId/stats', {
    schema: {
      summary: 'Get folder statistics',
      description: 'Get detailed statistics about folder contents and usage',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      params: FolderIdParamsSchema,
      response: {
        200: {
          description: 'Folder statistics retrieved successfully',
          type: 'object',
          properties: {
            folderId: { type: 'string' },
            name: { type: 'string' },
            path: { type: 'string' },
            fileCount: { type: 'number' },
            subfolderCount: { type: 'number' },
            totalSize: { type: 'number' },
            filesByType: {
              type: 'object',
              additionalProperties: { type: 'number' }
            },
            filesByClassification: {
              type: 'object',
              additionalProperties: { type: 'number' }
            },
            recentActivity: {
              type: 'object',
              properties: {
                uploads: { type: 'number' },
                downloads: { type: 'number' },
                lastActivity: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        404: {
          description: 'Folder not found',
          ...ErrorResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      // TODO: Implement folder statistics endpoint
      reply.code(501)
      throw request.server.httpErrors.notImplemented('Folder statistics endpoint not yet implemented')
    }
  })

  // Batch folder operations
  fastify.post('/folders/batch', {
    schema: {
      summary: 'Batch folder operations',
      description: 'Perform batch operations on multiple folders (move, delete, update)',
      tags: ['Storage Folders'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['move', 'delete', 'update'],
            description: 'Batch operation to perform'
          },
          folderIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of folder IDs to operate on'
          },
          data: {
            type: 'object',
            description: 'Operation-specific data (e.g., newParentId for move, updates for update)'
          }
        },
        required: ['operation', 'folderIds']
      },
      response: {
        200: {
          description: 'Batch operation completed successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            processed: { type: 'number' },
            failed: { type: 'number' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  folderId: { type: 'string' },
                  success: { type: 'boolean' },
                  error: { type: 'string' }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid batch operation',
          ...ErrorResponseSchema
        },
        500: {
          description: 'Internal server error',
          ...ErrorResponseSchema
        }
      }
    },
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      // TODO: Implement batch operations endpoint
      reply.code(501)
      throw request.server.httpErrors.notImplemented('Batch folder operations endpoint not yet implemented')
    }
  })
}