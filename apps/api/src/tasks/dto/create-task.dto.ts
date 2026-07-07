import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString, IsArray } from 'class-validator';
import { TaskStatus, Priority } from '../../common/types';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'El título de la tarea es requerido' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsEnum(Priority, { message: 'La prioridad de la tarea no es válida' })
  @IsOptional()
  priority?: Priority;

  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'La fecha límite no es válida' })
  @IsOptional()
  dueDate?: string;

  @IsNumber({}, { message: 'Las horas estimadas deben ser un número' })
  @IsOptional()
  estimatedHours?: number;

  @IsNumber({}, { message: 'Las horas trabajadas deben ser un número' })
  @IsOptional()
  workedHours?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibleIds?: string[];

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  kanbanOrder?: string;
}
