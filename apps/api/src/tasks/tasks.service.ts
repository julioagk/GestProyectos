import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ActivityLogService } from '../common/activity-log.service';
import { TaskStatus } from '../common/types';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
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
        responsibleId: dto.responsibleId,
        parentId: dto.parentId,
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

    return task;
  }

  async getTasks(companyId: string, projectId: string) {
    return this.prisma.task.findMany({
      where: { projectId, companyId, parentId: null }, // Solo tareas de nivel superior
      include: {
        responsible: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        checklistItems: {
          orderBy: { createdAt: 'asc' },
        },
        subtasks: {
          include: {
            responsible: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        dependencies: {
          include: {
            dependsOnTask: true,
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
        responsible: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        checklistItems: {
          orderBy: { createdAt: 'asc' },
        },
        subtasks: {
          include: {
            responsible: {
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
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        startDate: finalStartDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimatedHours: dto.estimatedHours,
        workedHours: dto.workedHours,
        responsibleId: dto.responsibleId,
        kanbanOrder: dto.kanbanOrder,
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
    }

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
}
