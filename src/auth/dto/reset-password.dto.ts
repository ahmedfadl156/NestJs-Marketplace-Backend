import { IsString, IsStrongPassword, Length, MaxLength, MinLength } from "class-validator";
import { Match } from "../../common/validation/match.decorator.js";

export class ResetPasswordDto {
    @IsString()
    @Length(43 , 43)
    token: string;

    @IsString()
    @IsStrongPassword()
    @MinLength(8)
    @MaxLength(128)
    newPassword: string;

    @IsString()
    @MinLength(8)
    @MaxLength(128)
    @Match('newPassword' , {message: 'confirmPassword must match newPassword'})
    confirmPassword: string;
}