import { Request } from 'express';

export function getClientIp(request: Request): string {
    return request.ip ?? '';
}