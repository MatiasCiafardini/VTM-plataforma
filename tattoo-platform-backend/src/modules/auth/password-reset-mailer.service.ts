import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class PasswordResetMailerService {
  private readonly logger = new Logger(PasswordResetMailerService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendResetCode(params: {
    email: string;
    firstName: string;
    code: string;
    expiresInMinutes: number;
  }) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from =
      this.configService.get<string>('SMTP_FROM') ??
      this.configService.get<string>('SMTP_USER') ??
      'no-reply@vmt.local';

    if (!host || !user || !pass) {
      this.logger.warn(
        `Password reset code for ${params.email}: ${params.code}`,
      );
      return;
    }

    const transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: params.email,
      subject: 'Codigo para recuperar tu contraseña',
      text: [
        `Hola ${params.firstName},`,
        '',
        `Tu codigo de recuperacion es: ${params.code}`,
        `Este codigo vence en ${params.expiresInMinutes} minutos.`,
        '',
        'Si no pediste este cambio, podes ignorar este correo.',
      ].join('\n'),
      html: `
        <p>Hola ${params.firstName},</p>
        <p>Tu codigo de recuperacion es:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px">${params.code}</p>
        <p>Este codigo vence en ${params.expiresInMinutes} minutos.</p>
        <p>Si no pediste este cambio, podes ignorar este correo.</p>
      `,
    });
  }
}
