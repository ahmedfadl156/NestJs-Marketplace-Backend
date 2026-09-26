import { hashIdentifier } from "../common/rate-limit/hash-identifier.js";

export function loginIpRateLimitKey(ipAddress: string): string {
    return `rl:auth:login:ip:${ipAddress}`;
}

export function loginAccountFailureKey(normalizedEmail: string): string {
    const emailHash = hashIdentifier(normalizedEmail);
    return `rl:auth:login:account:${emailHash}`;
}

export function forgotPasswordAccountIpLimitKey(ipAddress: string): string {
    return `rl:auth:forgot-password:ip:${ipAddress}`
};

export function forgotPasswordAccountRateLimitKey(normalizedEmail: string): string {
    const emailHash = hashIdentifier(normalizedEmail);
    return `rl:auth:forgot-password:account:${emailHash}`;
}

export function verifyEmailIpRateLimitKey(ipAddress: string): string {
    return `rl:auth:verify-email:ip:${ipAddress}`;
}