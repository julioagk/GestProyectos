import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // El Super Administrador puede ver cualquier empresa
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Verificar si el recurso solicitado tiene companyId y si coincide con el del usuario
    const requestedCompanyId = request.headers['x-company-id'] || 
                              request.query?.companyId || 
                              request.body?.companyId ||
                              request.params?.companyId;

    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      throw new ForbiddenException('Acceso denegado: No tienes acceso a la información de esta empresa');
    }

    return true;
  }
}
