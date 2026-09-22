import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordHasher } from './security/password-hasser.service.js';
import { VerificationTokenService } from './security/verification-token.service.js';
import { EmailNormalizer } from './security/email-normalizer.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './security/token.service.js';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { EmailModule } from '../infrastructure/email/email.module.js';

@Module({
    imports: [
        PrismaModule,
        UsersModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
            }),
        }),
        EmailModule
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        PasswordHasher,
        VerificationTokenService,
        EmailNormalizer,
        TokenService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AuthModule {}
