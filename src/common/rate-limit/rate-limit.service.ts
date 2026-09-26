import { Injectable } from "@nestjs/common";
import { RedisRateLimitStore } from "./redis-rate-limit.store.js";
import { RateLimitPolicy, RateLimitResult } from "./rate-limit.types.js";
import { RateLimitUnavailableException } from "./rate-limit-unavailable.exception.js";

@Injectable()
export class RateLimitService {
    constructor(private readonly store: RedisRateLimitStore){}

    async consume(policy: RateLimitPolicy) {
        try {            
            const current = await this.store.increment(policy);
            const allowed = current <= policy.limit;
    
            const remaining = Math.max(
                policy.limit - current,
                0
            );
    
            if(allowed){
                return {
                    allowed: true,
                    limit: policy.limit,
                    remaining,
                    retryAfterSeconds: 0
                }
            };
    
            const ttl = await this.store.getTtl(policy.key);
    
            return {
                allowed: false,
                limit: policy.limit,
                remaining: 0,
                retryAfterSeconds: Math.max(ttl , 0),
            };
        } catch (error) {
            throw new RateLimitUnavailableException();
        }
    }

    async check(policy: RateLimitPolicy): Promise<RateLimitResult> {
        try {            
            const current = await this.store.getCount(policy.key);
            const allowed = current < policy.limit;
    
            const remaining = Math.max(
                policy.limit - current,
                0
            );
    
            if(allowed){
                return {
                    allowed: true,
                    limit: policy.limit,
                    remaining,
                    retryAfterSeconds: 0
                }
            }
    
            const ttl = await this.store.getTtl(policy.key);
    
            return {
                allowed: false,
                limit: policy.limit,
                remaining: 0,
                retryAfterSeconds: Math.max(ttl , 0)
            }
        } catch (error) {
            throw new RateLimitUnavailableException();
        }
    }

    async reset(key: string): Promise<void> {
        await this.store.delete(key);
    }
}