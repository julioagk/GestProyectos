import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Validar si el slug de la empresa ya está tomado
    const existingCompany = await this.prisma.company.findUnique({
      where: { slug: dto.companySlug.toLowerCase() },
    });
    if (existingCompany) {
      throw new ConflictException('El slug de la empresa ya está en uso');
    }

    // 2. Validar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // 3. Buscar o crear el plan por defecto 'Free'
    let plan = await this.prisma.plan.findUnique({
      where: { name: 'Free' },
    });
    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
          name: 'Free',
          price: 0.0,
          maxUsers: 5,
          maxProjects: 3,
          storageLimitGB: 2,
        },
      });
    }

    // 4. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // 5. Crear empresa y usuario gestor en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: dto.companyName,
          slug: dto.companySlug.toLowerCase(),
          planId: plan.id,
        },
      });

      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.MANAGER,
          companyId: newCompany.id,
        },
      });

      return { company: newCompany, user: newUser };
    });

    // 6. Generar Tokens
    const tokens = await this.generateTokens(result.user.id, result.user.email, result.user.role, result.company.id);
    await this.updateRefreshToken(result.user.id, tokens.refreshToken);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        companyId: result.company.id,
        companySlug: result.company.slug,
        companyName: result.company.name,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { company: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.companyId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        companySlug: user.company.slug,
        companyName: user.company.name,
      },
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { success: true };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Acceso denegado');
      }

      // Comparar el hash del token o comparar el token directamente
      if (user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Token de actualización inválido');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role, user.companyId);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Token de actualización expirado o inválido');
    }
  }

  // Métodos auxiliares
  private async generateTokens(userId: string, email: string, role: string, companyId: string) {
    const payload = {
      sub: userId,
      email,
      role,
      companyId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '30d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '90d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }
}
