import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

@Injectable()
export class VerificationTokenService {
    generate(): string {
        return randomBytes(32).toString('base64url');
    }

    hash(token: string): string {
        return createHash('sha256')
        .update(token , 'utf-8')
        .digest('hex')
    }
}