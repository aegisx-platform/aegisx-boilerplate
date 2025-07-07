import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

/**
 * Report WebSocket Routes
 * 
 * Provides real-time communication for report generation:
 * - Report generation progress updates
 * - Live data streaming for real-time reports
 * - Report status notifications
 * - Background job updates
 */

export default async function reportWebSocketRoutes(fastify: FastifyInstance) {
  // Report generation progress WebSocket
  fastify.get('/reports/progress/:reportId', { 
    websocket: true,
    schema: {
      params: Type.Object({
        reportId: Type.String({ format: 'uuid' })
      })
    }
  }, async (connection, request) => {
    const { reportId } = request.params as { reportId: string };
    const userId = (request as any).user?.id;
    
    fastify.log.info('Report progress WebSocket connection established', {
      reportId,
      userId,
      connectionId: connection.socket.id
    });

    // Subscribe to report-specific progress channel
    const progressChannel = `report:progress:${reportId}`;
    const userChannel = userId ? `user:${userId}` : null;
    
    // Subscribe to channels through websocket manager
    if (fastify.websocketManager) {
      fastify.websocketManager.subscribeToChannel(connection.socket.id, progressChannel);
      if (userChannel) {
        fastify.websocketManager.subscribeToChannel(connection.socket.id, userChannel);
      }
    }

    // Send initial status
    try {
      // Get current report status (stub implementation)
      const reportStatus = {
        reportId,
        status: 'pending',
        progress: 0,
        message: 'Report generation started'
      };
      
      connection.socket.send(JSON.stringify({
        type: 'report_status',
        data: reportStatus,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      fastify.log.error('Error fetching initial report status', { reportId, error });
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch report status',
        timestamp: new Date().toISOString()
      }));
    }

    // Handle incoming messages
    connection.socket.on('message', async (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'subscribe_template':
            // Subscribe to template-specific updates
            if (data.templateId) {
              const templateChannel = `template:${data.templateId}`;
              if (fastify.websocketManager) {
                fastify.websocketManager.subscribeToChannel(connection.socket.id, templateChannel);
              }
              connection.socket.send(JSON.stringify({
                type: 'subscribed',
                channel: templateChannel,
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'cancel_report':
            // Cancel report generation (stub implementation)
            try {
              fastify.log.info('Report generation cancelled', { reportId });
              connection.socket.send(JSON.stringify({
                type: 'report_cancelled',
                reportId,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              connection.socket.send(JSON.stringify({
                type: 'error',
                message: 'Failed to cancel report generation',
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'request_update':
            // Request manual status update (stub implementation)
            try {
              const currentStatus = {
                reportId,
                status: 'running',
                progress: 50,
                message: 'Report generation in progress'
              };
              connection.socket.send(JSON.stringify({
                type: 'report_status',
                data: currentStatus,
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              connection.socket.send(JSON.stringify({
                type: 'error',
                message: 'Failed to get report status',
                timestamp: new Date().toISOString()
              }));
            }
            break;

          default:
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
              timestamp: new Date().toISOString()
            }));
        }
      } catch (error) {
        fastify.log.error('Error processing WebSocket message', { reportId, error });
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle connection close
    connection.socket.on('close', () => {
      fastify.log.info('Report progress WebSocket connection closed', {
        reportId,
        userId,
        connectionId: connection.socket.id
      });
    });

    // Handle errors
    connection.socket.on('error', (error: any) => {
      fastify.log.error('Report progress WebSocket error', {
        reportId,
        userId,
        connectionId: connection.socket.id,
        error
      });
    });
  });

  // Live data streaming WebSocket for real-time reports
  fastify.get('/reports/stream/:templateId', { 
    websocket: true,
    schema: {
      params: Type.Object({
        templateId: Type.String({ format: 'uuid' })
      })
    }
  }, async (connection, request) => {
    const { templateId } = request.params as { templateId: string };
    const userId = (request as any).user?.id;
    
    fastify.log.info('Live data streaming WebSocket connection established', {
      templateId,
      userId,
      connectionId: connection.socket.id
    });

    // Subscribe to template data updates
    const dataChannel = `template:data:${templateId}`;
    if (fastify.websocketManager) {
      fastify.websocketManager.subscribeToChannel(connection.socket.id, dataChannel);
    }

    // Send initial data (stub implementation)
    try {
      const initialData = [
        { timestamp: new Date().toISOString(), value: Math.random() * 100 },
        { timestamp: new Date(Date.now() - 60000).toISOString(), value: Math.random() * 100 }
      ];
      connection.socket.send(JSON.stringify({
        type: 'initial_data',
        data: initialData,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      fastify.log.error('Error fetching initial data for live stream', { templateId, error });
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch initial data',
        timestamp: new Date().toISOString()
      }));
    }

    // Handle incoming messages
    connection.socket.on('message', async (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'update_interval':
            // Update data refresh interval
            if (data.interval && typeof data.interval === 'number') {
              connection.socket.send(JSON.stringify({
                type: 'interval_updated',
                interval: data.interval,
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'apply_filter':
            // Apply real-time filter to data stream
            if (data.filter) {
              connection.socket.send(JSON.stringify({
                type: 'filter_applied',
                filter: data.filter,
                timestamp: new Date().toISOString()
              }));
            }
            break;

          default:
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
              timestamp: new Date().toISOString()
            }));
        }
      } catch (error) {
        fastify.log.error('Error processing live stream message', { templateId, error });
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle connection close
    connection.socket.on('close', () => {
      fastify.log.info('Live data streaming WebSocket connection closed', {
        templateId,
        userId,
        connectionId: connection.socket.id
      });
    });

    // Handle errors
    connection.socket.on('error', (error: any) => {
      fastify.log.error('Live data streaming WebSocket error', {
        templateId,
        userId,
        connectionId: connection.socket.id,
        error
      });
    });
  });

  // System notifications WebSocket for reports
  fastify.get('/reports/notifications', { 
    websocket: true 
  }, async (connection, request) => {
    const userId = (request as any).user?.id;
    
    fastify.log.info('Report notifications WebSocket connection established', {
      userId,
      connectionId: connection.socket.id
    });

    // Subscribe to general report notifications
    const notificationChannels = [
      'reports:system',
      'reports:maintenance',
      'reports:alerts'
    ];

    if (userId) {
      notificationChannels.push(`user:${userId}:reports`);
    }

    if (fastify.websocketManager) {
      notificationChannels.forEach(channel => {
        fastify.websocketManager.subscribeToChannel(connection.socket.id, channel);
      });
    }

    // Send welcome message
    connection.socket.send(JSON.stringify({
      type: 'welcome',
      data: {
        subscribedChannels: notificationChannels,
        userId
      },
      timestamp: new Date().toISOString()
    }));

    // Handle connection close
    connection.socket.on('close', () => {
      fastify.log.info('Report notifications WebSocket connection closed', {
        userId,
        connectionId: connection.socket.id
      });
    });

    // Handle errors
    connection.socket.on('error', (error: any) => {
      fastify.log.error('Report notifications WebSocket error', {
        userId,
        connectionId: connection.socket.id,
        error
      });
    });
  });

  fastify.log.info('✅ Report WebSocket routes loaded');
}