import { Module } from "@nestjs/common";
import { RedisModule } from "../../infrastructure/redis/redis.module.js";
import { RedisRateLimitStore } from "./redis-rate-limit.store.js";
import { RateLimitService } from "./rate-limit.service.js";

@Module({
    imports: [RedisModule],
    providers: [
        RedisRateLimitStore,
        RateLimitService,
    ],
    exports: [RateLimitService],
})

export class RateLimitModule {}