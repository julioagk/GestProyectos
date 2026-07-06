import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus
} from '@nestjs/common';
import { FilesService } from './files.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import * as express from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @UseGuards(AuthGuard, TenantGuard)
  @Post('presigned')
  requestPresignedUrl(
    @Req() req: any,
    @Body('fileName') fileName: string,
    @Body('mimeType') mimeType: string,
    @Body('sizeBytes') sizeBytes: number,
    @Body('projectId') projectId?: string,
    @Body('taskId') taskId?: string,
  ) {
    return this.filesService.getPresignedUploadUrl(
      req.user.companyId,
      fileName,
      mimeType,
      sizeBytes,
      projectId,
      taskId,
    );
  }

  @UseGuards(AuthGuard, TenantGuard)
  @Get('project/:projectId')
  getProjectFiles(@Req() req: any, @Param('projectId') projectId: string) {
    return this.filesService.getProjectFiles(req.user.companyId, projectId);
  }

  @UseGuards(AuthGuard, TenantGuard)
  @Delete(':id')
  deleteFile(@Req() req: any, @Param('id') id: string) {
    return this.filesService.deleteFile(req.user.companyId, id);
  }

  // --------------------------------------------------
  // CONTROLADORES PARA DESARROLLO LOCAL (SIMULACIÓN S3)
  // --------------------------------------------------

  @Post('upload-local')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  uploadLocalFile(@UploadedFile() file: any, @Query('key') key: string) {
    console.log(`Guardando archivo localmente con clave: ${key}`);
    return {
      success: true,
      filename: file.filename,
      size: file.size,
    };
  }

  @Get('download-local')
  async downloadLocalFile(@Query('key') key: string, @Res() res: express.Response) {
    // Buscar archivo en la carpeta ./uploads
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      return res.status(HttpStatus.NOT_FOUND).send('Archivo no encontrado');
    }
    
    const files = fs.readdirSync(uploadDir);
    if (files.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).send('Archivo no encontrado');
    }

    // Retornamos el primer archivo como simulación de descarga
    const filePath = join(process.cwd(), uploadDir, files[0]);
    return res.sendFile(filePath);
  }
}
