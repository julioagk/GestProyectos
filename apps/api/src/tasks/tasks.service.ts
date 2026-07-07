import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ActivityLogService } from '../common/activity-log.service';
import { TaskStatus } from '../common/types';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../common/email.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
    private notifications: NotificationsService,
    private emailService: EmailService,
  ) {}

  // Generador de LexoRank simplificado para ordenamiento de Kanban
  private getMiddleRank(prev: string | null, next: string | null): string {
    const minChar = 32; // Espacio
    const maxChar = 126; // Tilde ~

    if (!prev && !next) return 'h';
    if (!prev) {
      const nextChar = next!.charCodeAt(0);
      return String.fromCharCode(Math.max(minChar + 1, Math.floor(nextChar / 2)));
    }
    if (!next) {
      const prevChar = prev.charCodeAt(0);
      return String.fromCharCode(Math.min(maxChar - 1, prevChar + 2));
    }

    // Buscar primer caracter diferente
    let i = 0;
    while (i < prev.length && i < next.length && prev[i] === next[i]) {
      i++;
    }

    const prevChar = i < prev.length ? prev.charCodeAt(i) : minChar;
    const nextChar = i < next.length ? next.charCodeAt(i) : maxChar;

    if (nextChar - prevChar > 1) {
      const midChar = Math.floor((prevChar + nextChar) / 2);
      return prev.slice(0, i) + String.fromCharCode(midChar);
    }

    // Si no hay espacio entre caracteres, extendemos la cadena
    return prev + 'h';
  }

  // Sincroniza el estado del proyecto con base en el estado de todas sus tareas de primer nivel
  private async syncProjectStatus(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, parentId: null },
    });

    if (tasks.length === 0) return;

    const allInReview = tasks.every(t => t.status === 'IN_REVIEW');
    const allCompleted = tasks.every(t => t.status === 'COMPLETED');

    let targetStatus = 'IN_PROGRESS';
    if (allCompleted) {
      targetStatus = 'COMPLETED';
    } else if (allInReview) {
      targetStatus = 'IN_REVIEW';
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (project && project.status !== targetStatus) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: targetStatus },
      });
    }
  }

  private async notifyTaskAssignment(taskTitle: string, description: string, projectId: string, responsibleIds: string[]) {
    try {
      if (!responsibleIds || responsibleIds.length === 0) return;

      const users = await this.prisma.user.findMany({
        where: { id: { in: responsibleIds } },
        select: { email: true, firstName: true, lastName: true },
      });

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      });

      const projectName = project?.name || 'Proyecto';
      const webUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const projectUrl = `${webUrl}/dashboard/projects/${projectId}`;

      for (const u of users) {
        if (!u.email) continue;

        const mailTitle = `Nueva tarea asignada: ${taskTitle}`;
        const mailBody = `
          <p>Hola <strong>${u.firstName} ${u.lastName}</strong>,</p>
          <p>Se te ha asignado una nueva tarea en el proyecto <strong>${projectName}</strong>.</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #0f172a;">${taskTitle}</p>
            ${description ? `<p style="margin: 6px 0 0 0; color: #475569; font-size: 13px;">${description}</p>` : ''}
          </div>
          <p>Por favor, ingresa a la plataforma para revisar los detalles y comenzar a trabajar en ella.</p>
        `;

        const html = this.emailService.getEmailTemplate(
          'Nueva Tarea Asignada',
          mailBody,
          projectUrl,
          'Ver Tarea en el Tablero'
        );

        this.emailService.sendEmail(u.email, mailTitle, html).catch((err) => {
          this.logger.error(`Error al enviar correo de asignación de tarea a ${u.email}:`, err);
        });
      }
    } catch (err) {
      this.logger.error('Error al procesar la notificación de asignación de tarea:', err);
    }
  }

  // --------------------------------------------------
  // TAREAS (TASKS)
  // --------------------------------------------------

  async createTask(companyId: string, projectId: string, userId: string, dto: CreateTaskDto) {
    // Validar existencia del proyecto
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
    });
    if (!project) {
      throw new NotFoundException('El proyecto especificado no existe');
    }

    // Buscar la última tarea en la columna para asignar orden
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId, status: dto.status || TaskStatus.PENDING },
      orderBy: { kanbanOrder: 'desc' },
    });

    const kanbanOrder = this.getMiddleRank(lastTask?.kanbanOrder || null, null);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status || TaskStatus.PENDING,
        priority: dto.priority || 'MEDIUM',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours || 0,
        workedHours: dto.workedHours || 0,
        kanbanOrder,
        companyId,
        projectId,
        responsibles: dto.responsibleIds ? {
          connect: dto.responsibleIds.map(id => ({ id }))
        } : undefined,
        parentId: dto.parentId || undefined,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.activityLog.log({
      companyId,
      userId,
      projectId,
      taskId: task.id,
      action: 'CREATE_TASK',
      description: `${user?.firstName} ${user?.lastName} creó la tarea "${task.title}"`,
    });

    if (dto.responsibleIds && dto.responsibleIds.length > 0) {
      this.notifyTaskAssignment(task.title, dto.description || '', projectId, dto.responsibleIds);
    }

    await this.syncProjectStatus(projectId);
    return task;
  }

  async getTasks(companyId: string, projectId: string, userId?: string, userRole?: string) {
    const isEmployee = userRole === 'EMPLOYEE';
    let whereClause: any = { projectId, companyId, parentId: null };

    if (isEmployee && userId) {
      whereClause = {
        projectId,
        companyId,
        parentId: null,
        responsibles: {
          some: { id: userId },
        },
      };
    }

    return this.prisma.task.findMany({
      where: whereClause, // Solo tareas de nivel superior
      include: {
        responsibles: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        checklistItems: {
          orderBy: { createdAt: 'asc' },
        },
        subtasks: {
          include: {
            responsibles: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        dependencies: {
          include: {
            dependsOnTask: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
            reactions: true,
          },
        },
      },
      orderBy: { kanbanOrder: 'asc' },
    });
  }

  async getTaskById(companyId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, companyId },
      include: {
        project: true,
        responsibles: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        checklistItems: {
          orderBy: { createdAt: 'asc' },
        },
        subtasks: {
          include: {
            responsibles: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        dependencies: {
          include: {
            dependsOnTask: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
            reactions: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('La tarea no existe');
    }
    return task;
  }

  async updateTask(companyId: string, userId: string, taskId: string, dto: CreateTaskDto) {
    const existingTask = await this.getTaskById(companyId, taskId);

    const isWorking = dto.status && dto.status !== 'PENDING';
    const finalStartDate = dto.startDate 
      ? new Date(dto.startDate) 
      : (isWorking && !existingTask.startDate ? new Date() : existingTask.startDate);

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title !== undefined ? dto.title : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        priority: dto.priority !== undefined ? dto.priority : undefined,
        startDate: finalStartDate,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
        estimatedHours: dto.estimatedHours !== undefined ? dto.estimatedHours : undefined,
        workedHours: dto.workedHours !== undefined ? dto.workedHours : undefined,
        responsibles: dto.responsibleIds !== undefined ? {
          set: dto.responsibleIds.map(id => ({ id }))
        } : undefined,
        kanbanOrder: dto.kanbanOrder !== undefined ? dto.kanbanOrder : undefined,
      },
    });

    // Auditoría de cambios
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const changes: string[] = [];

    if (dto.title && dto.title !== existingTask.title) {
      changes.push(`renombró la tarea a "${dto.title}"`);
    }
    if (dto.status && dto.status !== existingTask.status) {
      changes.push(`cambió el estado de la tarea de "${existingTask.status}" a "${dto.status}"`);
      if (dto.status === 'COMPLETED' || dto.status === 'IN_REVIEW') {
        await this.sendTaskStatusNotification(companyId, userId, existingTask, dto.status);
      }
    }
    if (dto.priority && dto.priority !== existingTask.priority) {
      changes.push(`cambió la prioridad de la tarea de "${existingTask.priority}" a "${dto.priority}"`);
    }
    if (dto.workedHours && dto.workedHours !== existingTask.workedHours) {
      changes.push(`registró horas de trabajo (${dto.workedHours}h)`);
    }

    if (changes.length > 0) {
      await this.activityLog.log({
        companyId,
        userId,
        projectId: existingTask.projectId,
        taskId,
        action: 'UPDATE_TASK',
        description: `${user?.firstName} ${user?.lastName} ${changes.join(', ')}`,
        metadata: { before: existingTask, after: updatedTask },
      });
    }

    if (dto.responsibleIds) {
      const oldResponsibleIds = existingTask.responsibles?.map((r: any) => r.id) || [];
      const newIds = dto.responsibleIds.filter(id => !oldResponsibleIds.includes(id));
      if (newIds.length > 0) {
        this.notifyTaskAssignment(updatedTask.title, updatedTask.description || '', existingTask.projectId, newIds);
      }
    }

    await this.syncProjectStatus(existingTask.projectId);
    return updatedTask;
  }

  async deleteTask(companyId: string, userId: string, taskId: string) {
    const task = await this.getTaskById(companyId, taskId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.activityLog.log({
      companyId,
      userId,
      projectId: task.projectId,
      action: 'DELETE_TASK',
      description: `${user?.firstName} ${user?.lastName} eliminó la tarea "${task.title}"`,
    });

    await this.syncProjectStatus(task.projectId);
    return { success: true };
  }

  async reorderTask(
    companyId: string,
    userId: string,
    taskId: string,
    status: string,
    prevOrder: string | null,
    nextOrder: string | null,
  ) {
    const existingTask = await this.getTaskById(companyId, taskId);
    const newOrder = this.getMiddleRank(prevOrder, nextOrder);

    const isWorking = status !== 'PENDING';
    const updateData: any = {
      status,
      kanbanOrder: newOrder,
    };
    if (isWorking && !existingTask.startDate) {
      updateData.startDate = new Date();
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Si cambió el estado, registrar log de actividades
    if (existingTask.status !== status) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.activityLog.log({
        companyId,
        userId,
        projectId: existingTask.projectId,
        taskId,
        action: 'MOVE_TASK',
        description: `${user?.firstName} ${user?.lastName} movió la tarea "${existingTask.title}" a "${status}"`,
        metadata: { status },
      });
      if (status === 'COMPLETED' || status === 'IN_REVIEW') {
        await this.sendTaskStatusNotification(companyId, userId, existingTask, status);
      }
    }

    await this.syncProjectStatus(existingTask.projectId);
    return updatedTask;
  }

  // --------------------------------------------------
  // CHECKLIST ITEMS
  // --------------------------------------------------

  async addChecklistItem(companyId: string, taskId: string, title: string) {
    // Validar pertenencia a empresa
    await this.getTaskById(companyId, taskId);

    return this.prisma.checklistItem.create({
      data: {
        title,
        taskId,
      },
    });
  }

  async toggleChecklistItem(companyId: string, itemId: string, isCompleted: boolean) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { task: true },
    });

    if (!item || item.task.companyId !== companyId) {
      throw new NotFoundException('Elemento de checklist no encontrado');
    }

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: { isCompleted },
    });
  }

  async deleteChecklistItem(companyId: string, itemId: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { task: true },
    });

    if (!item || item.task.companyId !== companyId) {
      throw new NotFoundException('Elemento de checklist no encontrado');
    }

    await this.prisma.checklistItem.delete({
      where: { id: itemId },
    });
    return { success: true };
  }

  async updateChecklistItemProofs(companyId: string, itemId: string, proofs: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { task: true },
    });

    if (!item || item.task.companyId !== companyId) {
      throw new NotFoundException('Elemento de checklist no encontrado');
    }

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: { proofs },
    });
  }

  // --------------------------------------------------
  // DEPENDENCIAS DE TAREAS
  // --------------------------------------------------

  async addDependency(companyId: string, taskId: string, dependsOnTaskId: string) {
    if (taskId === dependsOnTaskId) {
      throw new BadRequestException('Una tarea no puede depender de sí misma');
    }

    // Validar pertenencia de ambas tareas
    await this.getTaskById(companyId, taskId);
    await this.getTaskById(companyId, dependsOnTaskId);

    return this.prisma.taskDependency.create({
      data: {
        taskId,
        dependsOnTaskId,
      },
    });
  }

  async removeDependency(companyId: string, taskId: string, dependsOnTaskId: string) {
    await this.getTaskById(companyId, taskId);
    await this.getTaskById(companyId, dependsOnTaskId);

    await this.prisma.taskDependency.delete({
      where: {
        taskId_dependsOnTaskId: { taskId, dependsOnTaskId },
      },
    });

    return { success: true };
  }

  async addComment(companyId: string, userId: string, taskId: string, content: string) {
    // Validar pertenencia de la tarea
    await this.getTaskById(companyId, taskId);

    const comment = await this.prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        reactions: true,
      },
    });

    const user = comment.user;
    const taskObj = await this.prisma.task.findUnique({ where: { id: taskId } });
    await this.activityLog.log({
      companyId,
      userId,
      projectId: taskObj?.projectId || undefined,
      taskId,
      action: 'ADD_COMMENT',
      description: `${user?.firstName} ${user?.lastName} comentó: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
    });

    return comment;
  }

  private async sendTaskStatusNotification(companyId: string, userId: string, task: any, newStatus: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Buscar a los administradores y gestores de la empresa
    const managers = await this.prisma.user.findMany({
      where: {
        companyId,
        role: { in: ['MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'] },
        id: { not: userId } // Evitar enviarse a sí mismo
      },
      select: { id: true }
    });

    const managerIds = managers.map(m => m.id);
    if (managerIds.length === 0) return;

    let statusText = newStatus;
    if (newStatus === 'COMPLETED') statusText = 'COMPLETADA';
    if (newStatus === 'IN_REVIEW') statusText = 'EN REVISIÓN';

    await this.notifications.createNotification(
      companyId,
      `Tarea ${statusText}`,
      `${user.firstName} ${user.lastName} marcó la tarea "${task.title}" como ${statusText}`,
      'TASK_STATUS',
      managerIds,
      `/dashboard/projects/${task.projectId}`
    );
  }
}
