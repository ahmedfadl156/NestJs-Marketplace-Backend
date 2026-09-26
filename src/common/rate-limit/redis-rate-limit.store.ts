import { Injectable } from "@nestjs/common";
import { RedisService } from "../../infrastructure/redis/redis.service.js";
import { RateLimitPolicy } from "./rate-limit.types.js";

const INCREMENT_WITH_EXPIRY_SCRIPT = `
    local current = redis.call('INCR' , KEYS[1])

    if current == 1 then 
        redis.call('EXPIRE' , KEYS[1] , ARGV[1])
    end

    return current
`;

@Injectable()
export class RedisRateLimitStore {
    constructor(private readonly redisService: RedisService){}

    async increment(policy: RateLimitPolicy) {
        const result = await this.redisService.getClient().eval(
            INCREMENT_WITH_EXPIRY_SCRIPT,
            {
                keys: [policy.key],
                arguments: [String(policy.windowSeconds)],
            }
        );

        return Number(result);
    }

    async getTtl(key: string): Promise<number> {
        return this.redisService.getClient().ttl(key);
    }

    async getCount(key: string): Promise<number> {
        const value = await this.redisService.getClient().get(key);

        return value ? Number(value) : 0;
    }

    async delete(key: string): Promise<void> {
        await this.redisService.getClient().del(key);
    }
}