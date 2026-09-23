import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import type { AuthenticatedUser } from './types/authenticated-user.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { AuthCookieService } from './security/auth-cookie.service.js';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly authCookieService: AuthCookieService
    ) {}
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
    async login(@Body() dto: LoginDto , @Req()  request: Request , @Res({passthrough: true}) response: Response){
        const result = await this.authService.login(dto , {
            ipAddress: request.ip,
            userAgent: request.get('user-agent')
        })
        
        this.authCookieService.setRefreshToken(response , result.refreshToken);

        return {
            accessToken: result.accessToken
        }
    }

    @Public()
    @Post('refresh')
    async refresh(@Req()  request: Request , @Res({ passthrough: true }) response:Response) {
        const refreshToken = request.cookies?.[this.authCookieService.getRefreshTokenName()];
        const result = await this.authService.refresh(
            { refreshToken },
            {
                ipAddress: request.ip,
                userAgent: request.get('user-agent'),
            },
        );

        this.authCookieService.setRefreshToken(
            response,
            result.refreshToken,
        );

        return {
            accessToken: result.accessToken
        }
    }

    @Post('logout')
    async logout(@Req()  request: Request , @Res({passthrough: true})  response: Response){
        const refreshToken = request.cookies?.[this.authCookieService.getRefreshTokenName()];

        await this.authService.logout(refreshToken);

        this.authCookieService.clearRefreshToken(response);

        return {
            message: 'Logged out successfully.',
        }
    }

    @Get('me')
    getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.getCurrentUser(user.sub);
    }

    @Post('forgot-password')
    @Public()
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        await this.authService.forgotPassword(dto);
        return {
            message: 'If the email address is registered, a password reset email will be sent.'
        }
    }
    @Post('reset-password')
    @Public()
    async resetPassword(@Body() dto: ResetPasswordDto) {
        await this.authService.resetPassword(dto);
        return {
            message: 'Password reset successfully. Please login with your new password.'
        }
    }
}
