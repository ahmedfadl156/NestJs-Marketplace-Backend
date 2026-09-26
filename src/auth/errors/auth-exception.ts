import { HttpException, HttpStatus } from "@nestjs/common";
import { AuthErrorCode } from "../constants/auth-error-code.js";

export class AuthException extends HttpException {
    constructor(code: AuthErrorCode , message: string , status = HttpStatus.UNAUTHORIZED , 
            public readonly retryAfterSeconds?: number,
    ){
        super({code , message} , status);
    }
}