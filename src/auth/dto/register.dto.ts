import { Transform } from "class-transformer";
import { IsEmail, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
    @Transform(({value}) => 
        typeof value === 'string' ? value.trim() : value,
    )
    @IsEmail()
    @MaxLength(254)
    email: string;

    @IsStrongPassword()
    @MinLength(8)
    @MaxLength(128)
    password: string;

    @IsString()
    @MinLength(3)
    @MaxLength(100)
    firstName: string;

    @IsString()
    @MinLength(3)
    @MaxLength(100)
    lastName: string;
}