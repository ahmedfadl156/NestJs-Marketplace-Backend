import { Injectable } from "@nestjs/common";
import { EmailService } from "./email.service.js";
import nodemailer, { Transporter } from "nodemailer";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SmtpEmailService implements EmailService {
    private readonly transporter: Transporter;

    constructor(private readonly configService: ConfigService){
        this.transporter = nodemailer.createTransport({
            host: this.configService.getOrThrow<string>('MAIL_HOST'),
            port: this.configService.getOrThrow<number>('MAIL_PORT'),
            secure: this.configService.getOrThrow<boolean>('MAIL_SECURE'),
        });
    }
    async sendPasswordResetEmail(input: { to: string; firstName: string; token: string; }): Promise<void> {
        const baseUrl = this.configService.getOrThrow<string>('APP_BASE_URL');
        const from = this.configService.getOrThrow<string>('MAIL_FROM');
        const resetUrl = `${baseUrl}/api/v1/auth/reset-password?token=${encodeURIComponent(input.token)}`;

        await this.transporter.sendMail({
            from,
            to: input.to,
            subject: 'Reset Your Password',
            text: [
                `Hello ${input.firstName},`,
                '',
                'You requested to reset your password. Use the link below:',
                resetUrl,
                '',
                'This link will expire soon.',
            ].join('\n'),
            html: `
                <p>Hello ${input.firstName},</p>
                <p>You requested to reset your password. Use the link below:</p>
                <p>
                    <a href="${resetUrl}">Reset your password</a>
                </p>
                <p>This link will expire soon.</p>
            `,
        });
    }

    async sendPasswordResetCompletedEmail(input: {
        to: string;
        firstName: string;
        }): Promise<void> {
        await this.transporter.sendMail({
            from: this.configService.getOrThrow<string>('MAIL_FROM'),
            to: input.to,
            subject: 'Your password was reset',
            text: [
            `Hello ${input.firstName},`,
            '',
            'Your password was successfully reset.',
            '',
            'If you did not perform this action, contact support immediately.',
            ].join('\n'),
        });
        }

    async sendVerificationEmail(input: { 
        to: string; 
        firstName: string; 
        token: string; }): Promise<void> {
            // هنا بجهز الرابط علشان ابعت الايمل الرابط الاساسى
            // وشوية الملعومات الرئيسية زىى هنبعت منين وشكل ال URL اللى هيتعت
        const baseUrl = this.configService.getOrThrow<string>('APP_BASE_URL');
        const from = this.configService.getOrThrow<string>('MAIL_FROM');

        const verificationUrl = `${baseUrl}/api/v1/auth/verify-email?token=${encodeURIComponent(input.token)}`;

        // هنا بنستدعى الفانكشن المسئولة عن انها تبعت الايميل وبنحدد شكل الايميل وهيتعبت لمين 
        await this.transporter.sendMail({
            from,
            to: input.to,
            subject: 'Verify Your Email',
            text: [
                `Hello ${input.firstName},`,
                '',
                'Please verify your email address:',
                verificationUrl,
                '',
                'This link will expire soon.',
            ].join('\n'),
            html: `
                <p>Hello ${input.firstName},</p>
                <p>Please verify your email address:</p>
                <p>
                <a href="${verificationUrl}">
                    Verify your email
                </a>
                </p>
                <p>This link will expire soon.</p>
            `,
        })
    }
}