import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join_project')
  handleJoinProject(@MessageBody('projectId') projectId: string, @ConnectedSocket() client: Socket) {
    client.join(`project_${projectId}`);
    console.log(`Cliente ${client.id} se unió a la sala del proyecto: ${projectId}`);
    return { event: 'joined_project', data: projectId };
  }

  @SubscribeMessage('leave_project')
  handleLeaveProject(@MessageBody('projectId') projectId: string, @ConnectedSocket() client: Socket) {
    client.leave(`project_${projectId}`);
    console.log(`Cliente ${client.id} salió de la sala del proyecto: ${projectId}`);
    return { event: 'left_project', data: projectId };
  }

  // Enviar comentarios en tiempo real a los integrantes de la sala
  sendNewComment(projectId: string, comment: any) {
    this.server.to(`project_${projectId}`).emit('new_comment', comment);
  }

  // Enviar notificaciones globales a la empresa del usuario
  sendNotification(companyId: string, notification: any) {
    this.server.to(`company_${companyId}`).emit('new_notification', notification);
  }
}
