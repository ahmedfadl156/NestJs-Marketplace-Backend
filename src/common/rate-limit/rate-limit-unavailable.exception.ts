import { ServiceUnavailableException } from "@nestjs/common";

export class RateLimitUnavailableException extends ServiceUnavailableException {
    constructor(){
        super({
            code: "RATE_LIMIT_UNAVAILABLE",
            message: "Authentication service is temporarily unavailable",
        })
    }
}