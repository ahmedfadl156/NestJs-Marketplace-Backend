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

@Module({
    imports: [
        PrismaModule,
        UsersModule,
        JwtModule.register({
            secret: process.env.JWT_ACCESS_SECRET,
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService , PasswordHasher , VerificationTokenService , EmailNormalizer , TokenService],
})
export class AuthModule {}
