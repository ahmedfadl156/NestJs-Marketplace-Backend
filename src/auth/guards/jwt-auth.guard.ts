import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { AuthErrorCode } from "../constants/auth-error-code.js";
import { AuthException } from "../errors/auth-exception.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService , 
        private readonly reflector: Reflector
    ){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [
                context.getHandler(),
                context.getClass()
            ]
        );

        if(isPublic){
            return true;
        }
        const request = context.switchToHttp().getRequest<Request>();

        const token = this.extractTokenFromHeader(request);

        if(!token){
            throw new AuthException(AuthErrorCode.INVALID_ACCESS_TOKEN, 'Unauthorized');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token , {
                issuer: process.env.JWT_ISSUER,
                audience: process.env.JWT_AUDIENCE
            });

            (request as Request & { user: unknown }).user = payload;

            return true;
        } catch (error) {
            throw new AuthException(AuthErrorCode.INVALID_ACCESS_TOKEN, 'Unauthorized');
        }
    }

    private extractTokenFromHeader(
        request: Request,
    ): string | undefined {
        const authorization = request.headers.authorization;

        if(!authorization){
            return undefined;
        }

        const [type , token] = authorization.split(' ');

        if(type !== 'Bearer' || !token){
            return undefined;
        }

        return token;
    }
}