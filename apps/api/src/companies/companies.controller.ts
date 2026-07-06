import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

@UseGuards(AuthGuard, TenantGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  // --------------------------------------------------
  // CONFIGURACIÓN DE EMPRESA
  // --------------------------------------------------

  @Get('settings')
  getSettings(@Req() req: any) {
    return this.companiesService.getCompanySettings(req.user.companyId);
  }

  @Put('settings')
  updateSettings(@Req() req: any, @Body() body: { name?: string; logoUrl?: string }) {
    return this.companiesService.updateCompanySettings(req.user.companyId, body);
  }

  // --------------------------------------------------
  // EQUIPOS (TEAMS)
  // --------------------------------------------------

  @Post('teams')
  createTeam(@Req() req: any, @Body() dto: CreateTeamDto) {
    return this.companiesService.createTeam(req.user.companyId, dto);
  }

  @Get('teams')
  getTeams(@Req() req: any) {
    return this.companiesService.getTeams(req.user.companyId);
  }

  @Get('teams/:id')
  getTeamById(@Req() req: any, @Param('id') id: string) {
    return this.companiesService.getTeamById(req.user.companyId, id);
  }

  @Put('teams/:id')
  updateTeam(@Req() req: any, @Param('id') id: string, @Body() dto: CreateTeamDto) {
    return this.companiesService.updateTeam(req.user.companyId, id, dto);
  }

  @Delete('teams/:id')
  deleteTeam(@Req() req: any, @Param('id') id: string) {
    return this.companiesService.deleteTeam(req.user.companyId, id);
  }

  @Post('teams/:id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.companiesService.addTeamMember(req.user.companyId, id, dto);
  }

  @Delete('teams/:id/members/:userId')
  removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.companiesService.removeTeamMember(req.user.companyId, id, userId);
  }
}
