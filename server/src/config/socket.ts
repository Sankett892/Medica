import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './env.js';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOriginsList,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Client can join an org room or patient-specific room if authorized
    socket.on('join:org', (orgId: string) => {
      if (orgId) {
        socket.join(`org:${orgId}`);
      }
    });

    socket.on('join:patient', (patientId: string) => {
      if (patientId) {
        socket.join(`patient:${patientId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitConsentEvent(patientId: string, event: string, data: any) {
  if (io) {
    io.to(`patient:${patientId}`).emit(event, data);
  }
}

export function emitOrgEvent(orgId: string, event: string, data: any) {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
}
