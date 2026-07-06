import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async log({
    companyId,
    userId,
    projectId,
    taskId,
    action,
    description,
    metadata,
  }: {
    companyId: string;
    userId?: string;
    projectId?: string;
    taskId?: string;
    action: string;
    description: string;
    metadata?: any;
  }) {
    return this.prisma.activityLog.create({
      data: {
        companyId,
        userId,
        projectId,
        taskId,
        action,
        description,
        metadata: metadata ?? undefined,
      },
    });
  }

  async getLogs(companyId: string, projectId?: string, taskId?: string) {
    return this.prisma.activityLog.findMany({
      where: {
        companyId,
        ...(projectId && { projectId }),
        ...(taskId && { taskId }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
