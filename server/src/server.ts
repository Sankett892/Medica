import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './config/socket.js';
import { seedFacilities } from './seeds/facilities.js';

async function bootstrap() {
  try {
    // 1. Connect Database
    await connectDB();
    await seedFacilities();

    // 2. Create HTTP & Socket.IO server
    const server = http.createServer(app);
    initSocketIO(server);

    // 3. Listen
    server.listen(config.PORT, () => {
      console.log(`[Server] HackMatrix API running in ${config.NODE_ENV} mode on port ${config.PORT}`);
      console.log(`[Server] Base URL: http://localhost:${config.PORT}/api/v1`);
      console.log(`[Server] Health check: http://localhost:${config.PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
