import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private isTestAccount = false;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private async initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT') || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.logger.log(`SMTP Configurado: Iniciando servidor de correo real en ${host}:${port}`);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP no configurado en variables de entorno. Creando cuenta de pruebas en Ethereal.email...');
      this.isTestAccount = true;
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.logger.log('Cuenta SMTP de pruebas inicializada correctamente.');
      } catch (err) {
        this.logger.error('Error al inicializar la cuenta SMTP de pruebas:', err);
      }
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.error('Transporter de correo no disponible');
      return;
    }

    const from = this.configService.get<string>('SMTP_FROM') || '"GestProyectos" <noreply@gestproyectos.com>';

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      this.logger.log(`Correo enviado exitosamente a: ${to} | Asunto: ${subject}`);
      
      if (this.isTestAccount) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        this.logger.log(`🔗 Ver vista previa de correo en: ${previewUrl}`);
      }
    } catch (err) {
      this.logger.error(`Error enviando correo a ${to}:`, err);
    }
  }

  // Helper para generar plantillas HTML con estética premium
  getEmailTemplate(title: string, bodyContent: string, actionUrl?: string, actionText?: string): string {
    const primaryColor = '#10b981'; // Verde Esmeralda
    const bgDark = '#0f172a';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background-color: ${bgDark};
            background-image: linear-gradient(135deg, ${bgDark} 0%, #1e293b 100%);
            padding: 32px;
            text-align: center;
            border-bottom: 3px solid ${primaryColor};
          }
          .logo {
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.025em;
            text-decoration: none;
            display: inline-block;
          }
          .logo-span {
            color: ${primaryColor};
          }
          .content {
            padding: 40px 32px;
          }
          h1 {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            font-size: 14px;
            line-height: 24px;
            color: #475569;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .button-container {
            text-align: center;
            margin: 28px 0 12px 0;
          }
          .button {
            display: inline-block;
            background-color: ${primaryColor};
            color: #ffffff !important;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 10px;
            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
          }
          .footer {
            background-color: #f8fafc;
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            font-size: 12px;
            color: #94a3b8;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              Gest<span class="logo-span">Proyectos</span>
            </div>
          </div>
          <div class="content">
            <h1>${title}</h1>
            ${bodyContent}
            ${actionUrl && actionText ? `
              <div class="button-container">
                <a href="${actionUrl}" class="button" target="_blank">${actionText}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Este es un correo automático de GestProyectos.</p>
            <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} GestProyectos. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
