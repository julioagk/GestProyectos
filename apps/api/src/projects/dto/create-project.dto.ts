import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ProjectStatus, Priority } from '../../common/types';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus, { message: 'El estado del proyecto no es válido' })
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(Priority, { message: 'La prioridad del proyecto no es válida' })
  @IsOptional()
  priority?: Priority;

  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'La fecha límite no es válida' })
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  responsibleId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}
