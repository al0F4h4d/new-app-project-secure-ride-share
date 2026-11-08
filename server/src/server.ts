import http from 'http';
import process from 'node:process';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app';
import { env } from './config/env.config';
import { logger } from './config/logger.config';
import { connectDatabase, disconnectDatabase } from './config/database.config';
import { connectRedis, disconnectRedis } from './config/redis.config';

const server = http.createServer(app);

// Initialize Socket.io instance
export const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

const bootstrap = async (): Promise<void> => {
  try {
    logger.info('========================================================');
    logger.info('🚀 Launching SecureRide Backend Microservice Monolith...');
    logger.info(`🌐 Node.js Runtime: ${process.version} | Environment: ${env.NODE_ENV}`);
    logger.info('========================================================');

    // 1. Connect Persistence Tier
    await connectDatabase();
    await connectRedis();

    // 2. Start HTTP & WebSocket Server
    server.listen(env.PORT, () => {
      logger.info(`✅ SecureRide API server running on port: ${env.PORT}`);
      logger.info(`🔗 Health probe endpoint ready at: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Fatal error during server startup:', { error });
    process.exit(1);
  }
};

// Graceful Termination Handler
const handleGracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`🛑 Received ${signal}. Commencing graceful shutdown protocol...`);

  // Close HTTP server to stop accepting new requests
  server.close(async () => {
    logger.info('HTTP server closed. Disconnecting persistent stores...');

    try {
      io.close();
      await disconnectDatabase();
      await disconnectRedis();
      logger.info('✅ All connections closed cleanly. Exiting process.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown cleanup:', { err });
      process.exit(1);
    }
  });

  // Force termination if cleanup hangs past 10 seconds
  setTimeout(() => {
    logger.error('Shutdown cleanup exceeded 10s deadline. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export { server };

