export interface EmailService {
    sendVerificationEmail(input: {
        to: string,
        firstName: string,
        token: string,
    }): Promise<void>;
}
