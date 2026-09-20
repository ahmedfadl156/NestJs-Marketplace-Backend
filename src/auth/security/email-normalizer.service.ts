import { Injectable } from "@nestjs/common";

@Injectable()

export class EmailNormalizer {
    normalize(email: string): string {
        return email.trim().toLowerCase();
    }
}