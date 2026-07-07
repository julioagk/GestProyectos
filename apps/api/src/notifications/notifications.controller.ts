import { Controller, Get, Patch, Param, UseGuards, Req, HttpStatus, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(@Req() req: any) {
    return this.notificationsService.getMyNotifications(req.user.sub);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Req() req: any, @Param('id') recipientId: string) {
    return this.notificationsService.markAsRead(recipientId, req.user.sub);
  }
}
