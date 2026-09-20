import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    // دى الفانكشن اللى بنستعملها علشان نبحث عن اليوزر بالالميل لو موجود نرجعه
    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: {email},
        })
    }

    // دى الفانكشن اللى هنستعملها فى اللوجين علشان ترع الالميل بتاع اليوزر لو موجود ومعاها الباسورد
    async findForAuthentication(email: string) {
        return this.prisma.user.findUnique({
            where: {email},
            include: {
                passwordCredential: true,
            }
        })
    }
}
