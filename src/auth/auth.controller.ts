import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Post('register')
    register(@Body() registerDto: RegisterDto, @Req() request: Request) {
        return this.authService.register(registerDto , {
            ipAddress: request.ip,
            userAgent: request.get('user-agent')
        })
    }

    @Post('verify-email')
    async verifyEmail(@Body() dto: VerifyEmailDto){
        return this.authService.verifyEmail(dto.token)
    }

    @Post('login')
    async login(@Body() dto: LoginDto , @Req()  request: Request){
        return this.authService.login(dto , {
            ipAddress: request.ip,
            userAgent: request.get('user-agent')
        });
    }

    @Post('refresh')
    async refresh(@Body()  dto: RefreshTokenDto , @Req()  request: Request) {
        return this.authService.refresh(dto , {
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
        })
    }

    @Post('logout')
    async logout(@Body()  dto: RefreshTokenDto){
        return this.authService.logout(dto.refreshToken);
    }
}
