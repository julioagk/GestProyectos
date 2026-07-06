import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { TaskStatus } from '../common/types';

@UseGuards(AuthGuard, TenantGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post('project/:projectId')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(req.user.companyId, projectId, req.user.sub, dto);
  }

  @Get('project/:projectId')
  findAll(@Req() req: any, @Param('projectId') projectId: string) {
    return this.tasksService.getTasks(req.user.companyId, projectId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.getTaskById(req.user.companyId, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.updateTask(req.user.companyId, req.user.sub, id, dto);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.deleteTask(req.user.companyId, req.user.sub, id);
  }

  @Post(':id/reorder')
  reorder(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('prevOrder') prevOrder: string | null,
    @Body('nextOrder') nextOrder: string | null,
  ) {
    return this.tasksService.reorderTask(req.user.companyId, req.user.sub, id, status, prevOrder, nextOrder);
  }

  // --------------------------------------------------
  // CHECKLIST ITEMS
  // --------------------------------------------------

  @Post(':id/checklist')
  addChecklistItem(@Req() req: any, @Param('id') id: string, @Body('title') title: string) {
    return this.tasksService.addChecklistItem(req.user.companyId, id, title);
  }

  @Put('checklist/:itemId')
  toggleChecklistItem(@Req() req: any, @Param('itemId') itemId: string, @Body('isCompleted') isCompleted: boolean) {
    return this.tasksService.toggleChecklistItem(req.user.companyId, itemId, isCompleted);
  }

  @Put('checklist/:itemId/proofs')
  updateChecklistItemProofs(@Req() req: any, @Param('itemId') itemId: string, @Body('proofs') proofs: string) {
    return this.tasksService.updateChecklistItemProofs(req.user.companyId, itemId, proofs);
  }

  @Delete('checklist/:itemId')
  deleteChecklistItem(@Req() req: any, @Param('itemId') itemId: string) {
    return this.tasksService.deleteChecklistItem(req.user.companyId, itemId);
  }

  @Post(':id/comments')
  addComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.tasksService.addComment(req.user.companyId, req.user.sub, id, content);
  }

  // --------------------------------------------------
  // DEPENDENCIAS DE TAREAS
  // --------------------------------------------------

  @Post(':id/dependency')
  addDependency(@Req() req: any, @Param('id') id: string, @Body('dependsOnTaskId') dependsOnTaskId: string) {
    return this.tasksService.addDependency(req.user.companyId, id, dependsOnTaskId);
  }

  @Delete(':id/dependency/:dependsOnTaskId')
  removeDependency(
    @Req() req: any,
    @Param('id') id: string,
    @Param('dependsOnTaskId') dependsOnTaskId: string,
  ) {
    return this.tasksService.removeDependency(req.user.companyId, id, dependsOnTaskId);
  }
}
