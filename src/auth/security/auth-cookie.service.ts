import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";

@Injectable()
export class AuthCookieService {
    constructor(private readonly configService: ConfigService){}

    getRefreshTokenName(): string {
        return this.configService.getOrThrow<string>('AUTH_REFRESH_COOKIE_NAME');
    }

    setRefreshToken(response: Response , refreshToken: string): void {
        response.cookie(
            this.configService.getOrThrow<string>('AUTH_REFRESH_COOKIE_NAME'),
            refreshToken,
            {
                httpOnly: true,
                secure: this.configService.getOrThrow<boolean>('AUTH_REFRESH_COOKIE_SECURE'),
                sameSite: this.configService.getOrThrow<'strict' | 'lax' | 'none'>('AUTH_REFRESH_COOKIE_SAME_SITE'),
                path: '/',
            },
        );
    }

    clearRefreshToken(response: Response){
        response.clearCookie(
        this.configService.getOrThrow<string>('AUTH_REFRESH_COOKIE_NAME'),
        {
            httpOnly: true,
            secure: this.configService.getOrThrow<boolean>('AUTH_REFRESH_COOKIE_SECURE'),
            sameSite: this.configService.getOrThrow<'strict' | 'lax' | 'none'>('AUTH_REFRESH_COOKIE_SAME_SITE'),
            path: '/',
        },
        )
    }
}