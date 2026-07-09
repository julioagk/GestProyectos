import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

@UseGuards(AuthGuard, TenantGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(req.user.companyId, req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.projectsService.getProjects(req.user.companyId, req.user.sub, req.user.role);
  }

  @Get('dashboard/stats')
  getDashboardStats(@Req() req: any) {
    return this.projectsService.getDashboardStats(req.user.companyId, req.user.sub, req.user.role);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getProjectById(req.user.companyId, id, req.user.sub, req.user.role);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.updateProject(req.user.companyId, req.user.sub, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.deleteProject(req.user.companyId, req.user.sub, id);
  }

  @Get(':id/activity')
  findActivity(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getProjectActivity(req.user.companyId, id);
  }

  @Post(':id/files')
  addFile(
    @Param('id') projectId: string,
    @Body() dto: { name: string; dataUrl: string; mimeType: string; sizeBytes: number }
  ) {
    return this.projectsService.addProjectFile(projectId, dto);
  }

  @Delete(':id/files/:fileId')
  deleteFile(@Param('id') projectId: string, @Param('fileId') fileId: string) {
    return this.projectsService.deleteProjectFile(projectId, fileId);
  }
}
