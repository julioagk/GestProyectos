import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------
  // EQUIPOS (TEAMS)
  // --------------------------------------------------

  async createTeam(companyId: string, dto: CreateTeamDto) {
    const companyExists = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!companyExists) {
      throw new UnauthorizedException('Tu sesión no es válida (la empresa del administrador fue eliminada o reseteada). Por favor, cierra sesión y vuelve a registrarte.');
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        companyId,
      },
    });

    if (dto.newMembers && Array.isArray(dto.newMembers)) {
      for (const member of dto.newMembers) {
        const { firstName, lastName, email, password, role } = member;
        if (!firstName || !lastName || !email || !password) continue;

        // Verificar si el usuario ya existe
        const existingUser = await this.prisma.user.findUnique({
          where: { email },
        });

        let userId = existingUser?.id;

        if (!existingUser) {
          const passwordHash = await bcrypt.hash(password, 10);
          const newUser = await this.prisma.user.create({
            data: {
              firstName,
              lastName,
              email,
              passwordHash,
              role: role || 'EMPLOYEE',
              companyId,
            },
          });
          userId = newUser.id;
        }

        // Asociar al equipo
        if (userId) {
          const existingMember = await this.prisma.teamMember.findUnique({
            where: {
              teamId_userId: { teamId: team.id, userId },
            },
          });

          if (!existingMember) {
            await this.prisma.teamMember.create({
              data: {
                teamId: team.id,
                userId,
              },
            });
          }
        }
      }
    }

    return team;
  }

  async getTeams(companyId: string) {
    return this.prisma.team.findMany({
      where: { companyId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async getTeamById(companyId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, companyId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('El equipo solicitado no existe');
    }
    return team;
  }

  async updateTeam(companyId: string, teamId: string, dto: CreateTeamDto) {
    await this.getTeamById(companyId, teamId); // Valida existencia e inquilino
    return this.prisma.team.update({
      where: { id: teamId },
      data: dto,
    });
  }

  async deleteTeam(companyId: string, teamId: string) {
    await this.getTeamById(companyId, teamId); // Valida existencia e inquilino
    await this.prisma.team.delete({
      where: { id: teamId },
    });
    return { success: true };
  }

  async addTeamMember(companyId: string, teamId: string, dto: any) {
    await this.getTeamById(companyId, teamId); // Valida existencia del equipo
    
    let userId = dto.userId;

    if (!userId && dto.email) {
      // Buscar si el usuario ya existe por email
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        // Validar que pertenezca a la misma empresa
        if (existingUser.companyId !== companyId) {
          throw new ConflictException('El usuario ya está registrado en otra empresa');
        }
        userId = existingUser.id;
      } else {
        // Crear usuario nuevo en la misma empresa
        const { firstName, lastName, email, password, role } = dto;
        if (!firstName || !lastName || !email || !password) {
          throw new NotFoundException('Faltan datos requeridos (nombre, apellido, correo, contraseña) para crear el usuario');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await this.prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            passwordHash,
            role: role || 'EMPLOYEE',
            companyId,
          },
        });
        userId = newUser.id;
      }
    }

    if (!userId) {
      throw new NotFoundException('No se especificó un usuario válido');
    }

    // Evitar duplicados
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
    if (existingMember) {
      throw new ConflictException('El usuario ya es miembro de este equipo');
    }

    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async removeTeamMember(companyId: string, teamId: string, userId: string) {
    await this.getTeamById(companyId, teamId); // Valida existencia

    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
    if (!existingMember) {
      throw new NotFoundException('El usuario no es miembro de este equipo');
    }

    await this.prisma.teamMember.delete({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
    return { success: true };
  }

  // --------------------------------------------------
  // CONFIGURACIÓN DE EMPRESA
  // --------------------------------------------------

  async getCompanySettings(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { plan: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return company;
  }

  async updateCompanySettings(companyId: string, data: { name?: string; logoUrl?: string }) {
    return this.prisma.company.update({
      where: { id: companyId },
      data,
    });
  }
}
