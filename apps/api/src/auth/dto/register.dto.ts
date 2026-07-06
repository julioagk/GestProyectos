import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es requerido' })
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'El slug de la empresa es requerido' })
  companySlug: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}
