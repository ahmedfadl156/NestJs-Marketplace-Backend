import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";

@Injectable()
export class TokenService {
    constructor(private readonly jwtService: JwtService) {}

    generateRefreshToken(): string {
        return randomBytes(32).toString('base64url');
    }

    hashRefreshToken(token: string): string {
        return createHash('sha256').update(token , 'utf-8').digest('hex');
    }

    async generateAccessToken(userId: string , sessionId: string): Promise<string> {
        return this.jwtService.signAsync(
            {
                sub: userId,
                sid: sessionId
            },
            {
                jwtid: randomBytes(16).toString('hex'),
                expiresIn: '15m'
            },
        );
    }
}