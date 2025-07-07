import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';

/**
 * WebSocket Plugin
 * 
 * Enables WebSocket support for real-time communication including:
 * - Report generation progress updates
 * - Live data streaming
 * - System notifications
 * - Collaborative features
 */

// WebSocket connection registry
interface WebSocketConnection {
  id: string;
  userId?: string;
  channels: Set<string>;
  lastActivity: Date;
  metadata: Record<string, any>;
}

const connections = new Map<string, WebSocketConnection>();

declare module 'fastify' {
  interface FastifyInstance {
    websocketManager: {
      broadcast: (channel: string, message: any, excludeConnection?: string) => void;
      sendToUser: (userId: string, message: any) => void;
      sendToConnection: (connectionId: string, message: any) => void;
      subscribeToChannel: (connectionId: string, channel: string) => void;
      unsubscribeFromChannel: (connectionId: string, channel: string) => void;
      getConnectionsByChannel: (channel: string) => WebSocketConnection[];
      getConnectionsByUser: (userId: string) => WebSocketConnection[];
      getActiveConnections: () => number;
      cleanupInactiveConnections: () => void;
    };
  }
}

async function websocketPlugin(fastify: FastifyInstance): Promise<void> {
  // Register @fastify/websocket plugin
  await fastify.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB
      verifyClient: (info: any) => {
        // Add custom verification logic if needed
        return true;
      }
    }
  });

  // WebSocket Manager Implementation
  const websocketManager = {
    broadcast: (channel: string, message: any, excludeConnection?: string) => {
      const messageData = JSON.stringify({
        type: 'broadcast',
        channel,
        data: message,
        timestamp: new Date().toISOString()
      });

      for (const [connectionId, connection] of connections.entries()) {
        if (connectionId === excludeConnection) continue;
        if (!connection.channels.has(channel)) continue;

        try {
          const wsConnection = fastify.websocketServer.clients.get(connectionId);
          if (wsConnection && wsConnection.readyState === 1) { // OPEN
            wsConnection.send(messageData);
          }
        } catch (error) {
          fastify.log.error('Failed to send message to connection', { connectionId, error });
        }
      }
    },

    sendToUser: (userId: string, message: any) => {
      const messageData = JSON.stringify({
        type: 'user_message',
        data: message,
        timestamp: new Date().toISOString()
      });

      for (const [connectionId, connection] of connections.entries()) {
        if (connection.userId !== userId) continue;

        try {
          const wsConnection = fastify.websocketServer.clients.get(connectionId);
          if (wsConnection && wsConnection.readyState === 1) {
            wsConnection.send(messageData);
          }
        } catch (error) {
          fastify.log.error('Failed to send message to user', { userId, connectionId, error });
        }
      }
    },

    sendToConnection: (connectionId: string, message: any) => {
      const connection = connections.get(connectionId);
      if (!connection) return;

      const messageData = JSON.stringify({
        type: 'direct_message',
        data: message,
        timestamp: new Date().toISOString()
      });

      try {
        const wsConnection = fastify.websocketServer.clients.get(connectionId);
        if (wsConnection && wsConnection.readyState === 1) {
          wsConnection.send(messageData);
        }
      } catch (error) {
        fastify.log.error('Failed to send message to connection', { connectionId, error });
      }
    },

    subscribeToChannel: (connectionId: string, channel: string) => {
      const connection = connections.get(connectionId);
      if (connection) {
        connection.channels.add(channel);
        fastify.log.debug('Connection subscribed to channel', { connectionId, channel });
      }
    },

    unsubscribeFromChannel: (connectionId: string, channel: string) => {
      const connection = connections.get(connectionId);
      if (connection) {
        connection.channels.delete(channel);
        fastify.log.debug('Connection unsubscribed from channel', { connectionId, channel });
      }
    },

    getConnectionsByChannel: (channel: string) => {
      return Array.from(connections.values()).filter(conn => conn.channels.has(channel));
    },

    getConnectionsByUser: (userId: string) => {
      return Array.from(connections.values()).filter(conn => conn.userId === userId);
    },

    getActiveConnections: () => {
      return connections.size;
    },

    cleanupInactiveConnections: () => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [connectionId, connection] of connections.entries()) {
        if (now.getTime() - connection.lastActivity.getTime() > timeout) {
          connections.delete(connectionId);
          fastify.log.debug('Cleaned up inactive connection', { connectionId });
        }
      }
    }
  };

  // Decorate fastify instance with websocket manager
  fastify.decorate('websocketManager', websocketManager);

  // Health check endpoint for WebSocket
  fastify.get('/ws/health', { websocket: true }, (connection, request) => {
    connection.socket.send(JSON.stringify({
      type: 'health',
      status: 'ok',
      timestamp: new Date().toISOString()
    }));
    connection.socket.close();
  });

  // Main WebSocket endpoint
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const connectionId = generateConnectionId();
    const userId = (request as any).user?.id;
    
    // Register connection
    const wsConnection: WebSocketConnection = {
      id: connectionId,
      userId,
      channels: new Set(),
      lastActivity: new Date(),
      metadata: {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        connectedAt: new Date().toISOString()
      }
    };

    connections.set(connectionId, wsConnection);
    
    // Store WebSocket instance for manager access
    (fastify as any).websocketServer = (fastify as any).websocketServer || new Map();
    (fastify as any).websocketServer.clients = (fastify as any).websocketServer.clients || new Map();
    (fastify as any).websocketServer.clients.set(connectionId, connection.socket);

    fastify.log.info('WebSocket connection established', { 
      connectionId, 
      userId,
      totalConnections: connections.size 
    });

    // Send welcome message
    connection.socket.send(JSON.stringify({
      type: 'welcome',
      data: {
        connectionId,
        userId,
        serverTime: new Date().toISOString(),
        availableChannels: [
          'reports:progress',
          'reports:data-updates', 
          'system:notifications',
          'user:alerts'
        ]
      }
    }));

    // Handle incoming messages
    connection.socket.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        wsConnection.lastActivity = new Date();

        switch (data.type) {
          case 'subscribe':
            if (data.channel && typeof data.channel === 'string') {
              websocketManager.subscribeToChannel(connectionId, data.channel);
              connection.socket.send(JSON.stringify({
                type: 'subscribed',
                channel: data.channel,
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'unsubscribe':
            if (data.channel && typeof data.channel === 'string') {
              websocketManager.unsubscribeFromChannel(connectionId, data.channel);
              connection.socket.send(JSON.stringify({
                type: 'unsubscribed',
                channel: data.channel,
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'ping':
            connection.socket.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;

          case 'get_status':
            connection.socket.send(JSON.stringify({
              type: 'status',
              data: {
                connectionId,
                userId: wsConnection.userId,
                channels: Array.from(wsConnection.channels),
                connectedAt: wsConnection.metadata.connectedAt,
                lastActivity: wsConnection.lastActivity.toISOString()
              }
            }));
            break;

          default:
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
              timestamp: new Date().toISOString()
            }));
        }
      } catch (error) {
        fastify.log.error('Error processing WebSocket message', { connectionId, error });
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle connection close
    connection.socket.on('close', () => {
      connections.delete(connectionId);
      (fastify as any).websocketServer?.clients?.delete(connectionId);
      
      fastify.log.info('WebSocket connection closed', { 
        connectionId, 
        userId,
        totalConnections: connections.size 
      });
    });

    // Handle connection error
    connection.socket.on('error', (error: any) => {
      fastify.log.error('WebSocket connection error', { connectionId, userId, error });
      connections.delete(connectionId);
      (fastify as any).websocketServer?.clients?.delete(connectionId);
    });
  });

  // Cleanup inactive connections every 5 minutes
  setInterval(() => {
    websocketManager.cleanupInactiveConnections();
  }, 5 * 60 * 1000);

  fastify.log.info('✅ WebSocket plugin registered successfully');
}

function generateConnectionId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default fp(websocketPlugin, {
  name: 'websocket-plugin',
  dependencies: ['env-plugin']
});