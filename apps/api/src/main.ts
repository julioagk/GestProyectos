import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir peticiones desde el frontend (localhost:3001 / localhost:3000)
  app.enableCors({
    origin: '*', // En producción se debe restringir al frontendURL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Habilitar la validación global de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`API corriendo exitosamente en el puerto: ${port}`);
}
bootstrap();
