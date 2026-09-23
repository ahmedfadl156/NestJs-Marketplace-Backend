export interface EmailService {
    sendVerificationEmail(input: {
        to: string,
        firstName: string,
        token: string,
    }): Promise<void>;

    sendPasswordResetEmail(input: {
        to: string,
        firstName: string,
        token: string;
    }): Promise<void>;

    sendPasswordResetCompletedEmail(input: {
        to: string;
        firstName: string;
    }): Promise<void>;
}


