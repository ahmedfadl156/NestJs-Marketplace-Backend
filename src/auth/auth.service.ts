import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
    // هنا بنجهز Logger علشان نبدا نعرض كل log باسم الخدمة اتللى هو فيها علشان نعرف جا من اى خدمة
    private readonly logger = new Logger(AuthService.name);
}
