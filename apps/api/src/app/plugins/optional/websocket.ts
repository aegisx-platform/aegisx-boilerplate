import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';

/**
 * This plugin adds WebSocket support for real-time communication
 *
 * @see https://github.com/fastify/fastify-websocket
 */
export default fp(async function (fastify: FastifyInstance) {
    await fastify.register(websocket, {
        // WebSocket server options
        options: {
            maxPayload: 1048576, // 1MB max payload
            verifyClient: (info: any, callback: (result: boolean) => void) => {
                // Optional: Add authentication/authorization logic here
                // For example, verify JWT token from query parameters or headers
                const token = info.req.url?.includes('token=');

                if (token) {
                    // Verify the token here
                    callback(true); // Accept connection
                } else {
                    // For development, accept all connections
                    // In production, you might want to reject unauthorized connections
                    callback(true);
                }
            }
        },
        // Error handling
        errorHandler: (error, connection, request) => {
            // Log WebSocket errors
            request.log.error(error, 'WebSocket error occurred');

            // Handle different types of errors
            const errorCode = (error as any).code;
            if (errorCode === 'WS_ERR_UNSUPPORTED_DATA_PAYLOAD_TYPE') {
                connection.socket.close(1003, 'Unsupported data type');
            } else {
                connection.socket.close(1011, 'Internal server error');
            }
        }
    });

    // Example WebSocket route for real-time chat
    fastify.register(async function (fastify) {
        fastify.get('/ws/chat', { websocket: true }, (connection, request) => {
            // Store client information
            const clientId = Math.random().toString(36).substring(7);

            request.log.info(`WebSocket client connected: ${clientId}`);

            // Send welcome message
            connection.socket.send(JSON.stringify({
                type: 'welcome',
                data: { clientId, message: 'Connected to chat server' }
            }));

            // Handle incoming messages
            connection.socket.on('message', (message: any) => {
                try {
                    const data = JSON.parse(message.toString());

                    // Echo message back to client (in real app, you'd broadcast to all clients)
                    connection.socket.send(JSON.stringify({
                        type: 'message',
                        data: {
                            from: clientId,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        }
                    }));

                    request.log.info(`WebSocket message from ${clientId}: ${data.message}`);
                } catch (error) {
                    request.log.error(error, 'Error parsing WebSocket message');
                    connection.socket.send(JSON.stringify({
                        type: 'error',
                        data: { message: 'Invalid message format' }
                    }));
                }
            });

            // Handle connection close
            connection.socket.on('close', (code: any, reason: any) => {
                request.log.info(`WebSocket client disconnected: ${clientId}, code: ${code}, reason: ${reason}`);
            });

            // Handle errors
            connection.socket.on('error', (error: any) => {
                request.log.error(error, `WebSocket error for client ${clientId}`);
            });
        });
    });

    // Example WebSocket route for real-time notifications
    fastify.register(async function (fastify) {
        fastify.get('/ws/notifications', { websocket: true }, (connection, request) => {
            const clientId = Math.random().toString(36).substring(7);

            request.log.info(`Notification client connected: ${clientId}`);

            // Send periodic notifications (example)
            const notificationInterval = setInterval(() => {
                if (connection.socket.readyState === connection.socket.OPEN) {
                    connection.socket.send(JSON.stringify({
                        type: 'notification',
                        data: {
                            id: Math.random().toString(36).substring(7),
                            title: 'Server Update',
                            message: `Notification at ${new Date().toISOString()}`,
                            timestamp: new Date().toISOString()
                        }
                    }));
                }
            }, 30000); // Every 30 seconds

            connection.socket.on('close', () => {
                clearInterval(notificationInterval);
                request.log.info(`Notification client disconnected: ${clientId}`);
            });

            connection.socket.on('error', (error: any) => {
                clearInterval(notificationInterval);
                request.log.error(error, `Notification WebSocket error for client ${clientId}`);
            });
        });
    });
});
