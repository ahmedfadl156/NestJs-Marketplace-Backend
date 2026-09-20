import { Transform } from "class-transformer"
import { IsEmail, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator"

export class LoginDto {
    @Transform(({value}) => 
        typeof value === 'string' ? value.trim() : value
    )
    @IsEmail()
    @MaxLength(254)
    email: string

    @IsString()
    @MaxLength(128)
    password: string
}