import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del equipo es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  newMembers?: any[];
}
