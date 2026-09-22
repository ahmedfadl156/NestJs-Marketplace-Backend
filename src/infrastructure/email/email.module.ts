import { Module } from '@nestjs/common';
import { EMAIL_SERVICE } from './email.token.js';
import { SmtpEmailService } from './smtp-email.service.js';

@Module({
    providers: [
        {
            provide: EMAIL_SERVICE,
            useClass: SmtpEmailService
        },
    ],
    exports: [EMAIL_SERVICE],
})
export class EmailModule {}
