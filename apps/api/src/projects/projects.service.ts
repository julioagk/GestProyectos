import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ActivityLogService } from '../common/activity-log.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async createProject(companyId: string, userId: string, dto: CreateProjectDto) {
    const companyExists = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!companyExists) {
      throw new UnauthorizedException('Tu sesión no es válida (la empresa del administrador fue eliminada o reseteada). Por favor, cierra sesión y vuelve a registrarte.');
    }

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        responsibleId: dto.responsibleId,
        teamId: dto.teamId,
        companyId,
      },
      include: {
        responsible: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Registrar actividad
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.activityLog.log({
      companyId,
      userId,
      projectId: project.id,
      action: 'CREATE_PROJECT',
      description: `${user?.firstName} ${user?.lastName} creó el proyecto "${project.name}"`,
    });

    return project;
  }

  async getProjects(companyId: string) {
    const projects = await this.prisma.project.findMany({
      where: { companyId },
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          select: { status: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => {
      const total = project.tasks.length;
      const completed = project.tasks.filter(t => t.status === 'COMPLETED').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...project,
        progress,
        tasks: undefined,
      };
    });
  }

  async getProjectById(companyId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId },
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            members: {
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
            },
          },
        },
        tags: true,
        files: true,
        tasks: {
          select: { status: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
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
        },
      },
    });

    if (!project) {
      throw new NotFoundException('El proyecto solicitado no existe');
    }

    const total = project.tasks.length;
    const completed = project.tasks.filter(t => t.status === 'COMPLETED').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...project,
      progress,
      tasks: undefined,
    };
  }

  async updateProject(companyId: string, userId: string, projectId: string, dto: CreateProjectDto) {
    const existingProject = await this.getProjectById(companyId, projectId); // Valida existencia

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        responsibleId: dto.responsibleId,
        teamId: dto.teamId,
      },
    });

    // Detectar cambios para el historial de actividad
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const changes: string[] = [];

    if (dto.name && dto.name !== existingProject.name) {
      changes.push(`cambió el nombre a "${dto.name}"`);
    }
    if (dto.status && dto.status !== existingProject.status) {
      changes.push(`cambió el estado de "${existingProject.status}" a "${dto.status}"`);
    }
    if (dto.priority && dto.priority !== existingProject.priority) {
      changes.push(`cambió la prioridad de "${existingProject.priority}" a "${dto.priority}"`);
    }

    if (changes.length > 0) {
      await this.activityLog.log({
        companyId,
        userId,
        projectId,
        action: 'UPDATE_PROJECT',
        description: `${user?.firstName} ${user?.lastName} ${changes.join(', ')}`,
        metadata: { before: existingProject, after: updatedProject },
      });
    }

    return updatedProject;
  }

  async deleteProject(companyId: string, userId: string, projectId: string) {
    const project = await this.getProjectById(companyId, projectId); // Valida existencia

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.activityLog.log({
      companyId,
      userId,
      projectId,
      action: 'DELETE_PROJECT',
      description: `${user?.firstName} ${user?.lastName} eliminó el proyecto "${project.name}"`,
    });

    return { success: true };
  }

  async getDashboardStats(companyId: string) {
    const totalProjects = await this.prisma.project.count({ where: { companyId } });
    const activeProjects = await this.prisma.project.count({
      where: { companyId, status: { in: ['PENDING', 'IN_PROGRESS', 'IN_REVIEW'] } },
    });
    const completedProjects = await this.prisma.project.count({
      where: { companyId, status: 'COMPLETED' },
    });

    const pendingTasks = await this.prisma.task.count({
      where: { companyId, status: { not: 'COMPLETED' } },
    });

    const overdueTasks = await this.prisma.task.count({
      where: {
        companyId,
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() },
      },
    });

    const hoursSum = await this.prisma.task.aggregate({
      where: { companyId },
      _sum: { workedHours: true },
    });
    const totalHours = hoursSum._sum.workedHours || 0;

    const totalTasksCount = await this.prisma.task.count({ where: { companyId } });
    const completedTasksCount = await this.prisma.task.count({
      where: { companyId, status: 'COMPLETED' },
    });
    const productivity = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const activities = await this.prisma.activityLog.findMany({
      where: { companyId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      pendingTasks,
      overdueTasks,
      totalHours,
      productivity,
      activities,
    };
  }

  async getProjectActivity(companyId: string, projectId: string) {
    return this.activityLog.getLogs(companyId, projectId);
  }
}
