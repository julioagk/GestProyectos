import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  // Simular la generación de una Presigned URL (o URL de carga local para desarrollo)
  async getPresignedUploadUrl(companyId: string, fileName: string, mimeType: string, sizeBytes: number, projectId?: string, taskId?: string) {
    const fileId = Math.random().toString(36).substring(7);
    const key = `uploads/${companyId}/${fileId}_${fileName}`;
    
    // URL de carga de desarrollo local o producción S3
    const uploadUrl = `http://localhost:3001/files/upload-local?key=${key}`;
    const publicUrl = `http://localhost:3001/files/download-local?key=${key}`;

    // Registrar metadatos del archivo en la base de datos
    const file = await this.prisma.file.create({
      data: {
        name: fileName,
        key,
        url: publicUrl,
        mimeType,
        sizeBytes,
        projectId,
        taskId,
      },
    });

    return {
      fileId: file.id,
      uploadUrl,
      publicUrl,
    };
  }

  async getProjectFiles(companyId: string, projectId: string) {
    return this.prisma.file.findMany({
      where: {
        projectId,
        project: {
          companyId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteFile(companyId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { project: true },
    });

    if (!file || (file.project && file.project.companyId !== companyId)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    await this.prisma.file.delete({
      where: { id: fileId },
    });

    return { success: true };
  }
}
