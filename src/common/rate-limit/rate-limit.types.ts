export interface RateLimitPolicy {
    key: string;
    limit: number;
    windowSeconds: number;
}


export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
}
