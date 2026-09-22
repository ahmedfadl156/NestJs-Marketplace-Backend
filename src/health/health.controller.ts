import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
    @Get()
    @Public()
    checkHealth() {
        return {
            status: 'OK',
        };
    }
}
