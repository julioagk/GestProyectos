import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async createNotification(companyId: string, title: string, message: string, type: string, recipientIds: string[], link?: string) {
    const notification = await this.prisma.notification.create({
      data: {
        title,
        message,
        type,
        link,
        companyId,
        recipients: {
          create: recipientIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        recipients: true,
      },
    });

    // Emitir por WebSocket en tiempo real
    this.gateway.sendNotification(companyId, notification);

    return notification;
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notificationRecipient.findMany({
      where: { userId },
      include: {
        notification: true,
      },
      orderBy: {
        notification: {
          createdAt: 'desc',
        },
      },
    });
  }

  async markAsRead(recipientId: string, userId: string) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: { id: recipientId, userId },
    });

    if (!recipient) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notificationRecipient.update({
      where: { id: recipientId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
