export interface AuthenticatedUser {
    sid: string;
    jti: string;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
    sub: string;
}