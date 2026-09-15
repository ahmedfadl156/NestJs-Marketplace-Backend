import { IsEmail, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsStrongPassword()
    @MinLength(8)
    @MaxLength(50)
    password: string;
}