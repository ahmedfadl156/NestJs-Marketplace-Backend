import { plainToInstance, Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsString, Max, Min, MinLength, validateSync } from "class-validator";

enum Environment {
    Development = "development",
    Production = "production",
    Test = "test",
    Provision = "provision",
};

class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsNumber()
    @Min(0)
    @Max(65535)
    PORT: number;

    @IsString()
    @MinLength(1)
    JWT_ACCESS_SECRET: string;
    @IsString()
    MAIL_HOST: string;

    @Min(1)
    @Max(65535)
    @IsNumber()
    MAIL_PORT: number;
    
    @Transform(({ value }) => {
        if (value === undefined) {
            return value;
        }

        return value === true || value === "true";
    })
    @IsBoolean()
    MAIL_SECURE: boolean;

    @IsEmail()
    MAIL_FROM: string;

    @IsString()
    APP_BASE_URL: string;

    @IsString()
    AUTH_REFRESH_COOKIE_NAME: string;

    @IsBoolean()
    AUTH_REFRESH_COOKIE_SECURE: boolean;

    @IsString()
    AUTH_REFRESH_COOKIE_SAME_SITE: string;

}

export function validate(config: Record<string , unknown>){
    const normalizedConfig = {
        ...config,
        MAIL_SECURE: config.MAIL_SECURE === true || config.MAIL_SECURE === "true",
    };

    const validatedConfig = plainToInstance(
        EnvironmentVariables,
        normalizedConfig,
        {enableImplicitConversion: true}
    );

    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if(errors.length > 0){
        throw new Error(errors.toString());
    }

    return validatedConfig;
}