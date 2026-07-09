import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ActivityLogService } from '../common/activity-log.service';
import { EmailService } from '../common/email.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
    private emailService: EmailService,
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

    if (project.teamId || project.responsibleId) {
      this.notifyProjectAssignment(project.id, project.teamId || undefined, project.responsibleId || undefined);
    }

    return project;
  }

  async getProjects(companyId: string, userId?: string, userRole?: string) {
    const isEmployee = userRole === 'EMPLOYEE';
    let whereClause: any = { companyId };

    if (isEmployee && userId) {
      const memberTeams = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = memberTeams.map(t => t.teamId);
      whereClause = {
        companyId,
        teamId: { in: teamIds },
      };
    }

    const projects = await this.prisma.project.findMany({
      where: whereClause,
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

  async getProjectById(companyId: string, projectId: string, userId?: string, userRole?: string) {
    const isEmployee = userRole === 'EMPLOYEE';
    let whereClause: any = { id: projectId, companyId };

    if (isEmployee && userId) {
      // Only show project if employee belongs to the team assigned to this project
      const memberTeams = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = memberTeams.map(t => t.teamId);
      whereClause = {
        id: projectId,
        companyId,
        teamId: { in: teamIds },
      };
    }


    const project = await this.prisma.project.findFirst({
      where: whereClause,
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

    if (
      (updatedProject.teamId && updatedProject.teamId !== (existingProject as any).teamId) ||
      (updatedProject.responsibleId && updatedProject.responsibleId !== (existingProject as any).responsibleId)
    ) {
      this.notifyProjectAssignment(updatedProject.id, updatedProject.teamId || undefined, updatedProject.responsibleId || undefined);
    }

    return updatedProject;
  }

  async deleteProject(companyId: string, userId: string, projectId: string) {
    const project = await this.getProjectById(companyId, projectId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.activityLog.log({
      companyId,
      userId,
      projectId,
      action: 'DELETE_PROJECT',
      description: `${user?.firstName} ${user?.lastName} eliminó el proyecto "${project.name}"`,
    });

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { success: true };
  }

  async getDashboardStats(companyId: string, userId?: string, userRole?: string) {
    const isEmployee = userRole === 'EMPLOYEE';
    
    let projectWhere: any = { companyId };
    let taskWhere: any = { companyId };
    let activityWhere: any = { companyId };

    if (isEmployee && userId) {
      // 1. Obtener equipos del empleado
      const memberTeams = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = memberTeams.map(t => t.teamId);
      projectWhere = {
        companyId,
        teamId: { in: teamIds },
      };

      // 2. Obtener proyectos del empleado para filtrar actividades
      const projects = await this.prisma.project.findMany({
        where: { companyId, teamId: { in: teamIds } },
        select: { id: true },
      });
      const projectIds = projects.map(p => p.id);
      activityWhere = {
        companyId,
        projectId: { in: projectIds },
      };

      // 3. Filtrar tareas donde el empleado es uno de los responsables
      taskWhere = {
        companyId,
        responsibles: {
          some: { id: userId },
        },
      };
    }

    const totalProjects = await this.prisma.project.count({ where: projectWhere });
    const activeProjects = await this.prisma.project.count({
      where: { ...projectWhere, status: { in: ['PENDING', 'IN_PROGRESS', 'IN_REVIEW'] } },
    });
    const completedProjects = await this.prisma.project.count({
      where: { ...projectWhere, status: 'COMPLETED' },
    });

    const pendingTasks = await this.prisma.task.count({
      where: { ...taskWhere, status: { not: 'COMPLETED' } },
    });

    const overdueTasks = await this.prisma.task.count({
      where: {
        ...taskWhere,
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() },
      },
    });

    const hoursSum = await this.prisma.task.aggregate({
      where: taskWhere,
      _sum: { workedHours: true },
    });
    const totalHours = hoursSum._sum.workedHours || 0;

    const totalTasksCount = await this.prisma.task.count({ where: taskWhere });
    const completedTasksCount = await this.prisma.task.count({
      where: { ...taskWhere, status: 'COMPLETED' },
    });
    const productivity = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const activities = await this.prisma.activityLog.findMany({
      where: activityWhere,
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

  private async notifyProjectAssignment(projectId: string, teamId?: string, responsibleId?: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, description: true },
      });
      if (!project) return;

      const webUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const projectUrl = `${webUrl}/dashboard/projects/${projectId}`;
      const mailTitle = `Nuevo proyecto asignado: ${project.name}`;

      const recipients = new Map<string, { email: string; name: string }>();

      if (responsibleId) {
        const respUser = await this.prisma.user.findUnique({
          where: { id: responsibleId },
          select: { email: true, firstName: true, lastName: true },
        });
        if (respUser && respUser.email) {
          recipients.set(respUser.email, {
            email: respUser.email,
            name: `${respUser.firstName} ${respUser.lastName}`.trim(),
          });
        }
      }

      if (teamId) {
        const teamMembers = await this.prisma.teamMember.findMany({
          where: { teamId },
          include: {
            user: {
              select: { email: true, firstName: true, lastName: true },
            },
          },
        });

        teamMembers.forEach((member) => {
          if (member.user && member.user.email) {
            recipients.set(member.user.email, {
              email: member.user.email,
              name: `${member.user.firstName} ${member.user.lastName}`.trim(),
            });
          }
        });
      }

      for (const [email, user] of recipients.entries()) {
        const mailBody = `
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Se ha asignado el proyecto <strong>${project.name}</strong> a tu equipo de trabajo.</p>
          ${project.description ? `<p style="color: #475569; font-size: 13px;"><em>Descripción: ${project.description}</em></p>` : ''}
          <p>Ya puedes ingresar a la plataforma para ver el tablero Kanban del proyecto y colaborar con tus compañeros.</p>
        `;

        const html = this.emailService.getEmailTemplate(
          'Nuevo Proyecto Asignado',
          mailBody,
          projectUrl,
          'Ver Proyecto'
        );

        this.emailService.sendEmail(email, mailTitle, html).catch(() => {});
      }
    } catch (err) {
      // Silencioso
    }
  }

  async addProjectFile(projectId: string, dto: { name: string; dataUrl: string; mimeType: string; sizeBytes: number }) {
    return this.prisma.file.create({
      data: {
        name: dto.name,
        url: dto.dataUrl,
        key: `${projectId}-${Date.now()}-${dto.name}`,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        projectId,
      },
    });
  }

  async deleteProjectFile(projectId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, projectId },
    });
    if (!file) {
      throw new NotFoundException('El archivo no existe o no pertenece a este proyecto');
    }
    return this.prisma.file.delete({
      where: { id: fileId },
    });
  }
}
