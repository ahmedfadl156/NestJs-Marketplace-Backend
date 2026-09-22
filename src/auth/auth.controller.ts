import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import type { AuthenticatedUser } from './types/authenticated-user.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Public()
    @Post('register')
    register(@Body() registerDto: RegisterDto, @Req() request: Request) {
        return this.authService.register(registerDto , {
            ipAddress: request.ip,
            userAgent: request.get('user-agent')
        })
    }

    @Public()
    @Post('verify-email')
    async verifyEmail(@Body() dto: VerifyEmailDto){
        return this.authService.verifyEmail(dto.token)
    }

    @Public()
    @Get('verify-email')
    async verifyEmailFromLink(@Query() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto.token);
    }

    @Public()
    @Post('login')
    async login(@Body() dto: LoginDto , @Req()  request: Request){
        return this.authService.login(dto , {
            ipAddress: request.ip,
            userAgent: request.get('user-agent')
        });
    }

    @Public()
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

    @Get('me')
    getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.getCurrentUser(user.sub);
    }
}
