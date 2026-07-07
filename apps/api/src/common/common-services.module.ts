import { Global, Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ActivityLogService, EmailService],
  exports: [ActivityLogService, EmailService],
})
export class CommonServicesModule {}
