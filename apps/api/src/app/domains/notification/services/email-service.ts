import { FastifyInstance } from 'fastify';
import * as nodemailer from 'nodemailer';
import { Notification } from '../../../core/shared/types/notification.types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
  templates: {
    enabled: boolean;
    directory: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private fastify: FastifyInstance;
  private transporter!: nodemailer.Transporter;

  constructor(fastify: FastifyInstance, private config: EmailConfig) {
    this.fastify = fastify;
    this.setupTransporter();
  }

  private setupTransporter(): void {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: this.config.smtp.auth,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Add method to verify SMTP connection
  async verifyConnection(): Promise<boolean> {
    try {
      const verified = await this.transporter.verify();
      this.fastify.log.info('SMTP connection verified successfully', {
        smtpHost: this.config.smtp.host,
        smtpPort: this.config.smtp.port,
        verified
      });
      return verified;
    } catch (error) {
      this.fastify.log.error('SMTP connection verification failed', {
        smtpHost: this.config.smtp.host,
        smtpPort: this.config.smtp.port,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }

  async sendEmail(notification: Notification): Promise<void> {
    try {
      // Log SMTP configuration status
      this.fastify.log.info('Email service configuration check', {
        hasSMTPUser: !!this.config.smtp.auth?.user,
        hasSMTPPass: !!this.config.smtp.auth?.pass,
        smtpHost: this.config.smtp.host,
        smtpPort: this.config.smtp.port,
        smtpSecure: this.config.smtp.secure,
        fromEmail: this.config.from.email,
      });

      // Use production email sending if SMTP is configured
      if (this.config.smtp.auth?.user && this.config.smtp.auth?.pass) {
        this.fastify.log.info('Using production email service (nodemailer)', {
          notificationId: notification.id,
          to: notification.recipient.email,
        });
        
        // Skip connection verification for now and try to send directly
        // to get more specific error information
        this.fastify.log.info('Attempting to send email directly to get detailed error information');
        
        await this.sendEmailWithNodemailer(notification);
      } else {
        // Fall back to mock for development
        this.fastify.log.info('Using mock email service (no SMTP configured)', {
          notificationId: notification.id,
          to: notification.recipient.email,
        });
        await this.mockSendEmail(notification);
      }
      
      this.fastify.log.info('Email sent successfully', {
        notificationId: notification.id,
        recipient: notification.recipient.email,
        subject: notification.subject,
        type: notification.type,
      });
    } catch (error) {
      this.fastify.log.error('Failed to send email', {
        notificationId: notification.id,
        recipient: notification.recipient.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async mockSendEmail(notification: Notification): Promise<void> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error('SMTP connection failed');
    }

    // Log the mock email
    this.fastify.log.info('📧 Mock Email Sent:', {
      to: notification.recipient.email,
      subject: notification.subject,
      content: notification.content.text,
      html: notification.content.html,
      type: notification.type,
      priority: notification.priority,
    });
  }

  // Production email sending with nodemailer
  async sendEmailWithNodemailer(notification: Notification): Promise<void> {
    const mailOptions = {
      from: `${this.config.from.name} <${this.config.from.email}>`,
      to: notification.recipient.email,
      subject: notification.subject,
      text: notification.content.text,
      html: notification.content.html || `<p>${notification.content.text}</p>`,
    };

    this.fastify.log.info('Sending production email', {
      notificationId: notification.id,
      to: notification.recipient.email,
      subject: notification.subject,
      smtpHost: this.config.smtp.host,
      from: mailOptions.from,
    });

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.fastify.log.info('Email sent successfully via SMTP', {
        notificationId: notification.id,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
      });
    } catch (error) {
      this.fastify.log.error('SMTP error details', {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any).code,
        command: (error as any).command,
        responseCode: (error as any).responseCode,
        response: (error as any).response,
      });
      throw error;
    }
  }

  async renderTemplate(templateName: string, data: any): Promise<EmailTemplate> {
    // Mock template rendering
    return {
      subject: `${templateName} - ${data.name || 'User'}`,
      html: `<h1>Hello ${data.name || 'User'}!</h1><p>This is a ${templateName} notification.</p>`,
      text: `Hello ${data.name || 'User'}! This is a ${templateName} notification.`,
    };
  }
}

// Default configuration
export const defaultEmailConfig: EmailConfig = {
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'AegisX System',
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@aegisx.com',
  },
  templates: {
    enabled: true,
    directory: './templates/email',
  },
};

// Debug: Log email config on startup
console.log('Email Config Environment:', {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER ? '***' : undefined,
  SMTP_PASS: process.env.SMTP_PASS ? '***' : undefined,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
});