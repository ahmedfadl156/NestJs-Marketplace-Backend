import { IsString, Length } from "class-validator";

export class RefreshTokenDto {
    @IsString()
    @Length(43 , 43)
    refreshToken: string;
}