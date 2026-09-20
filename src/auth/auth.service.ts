import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { EmailNormalizer } from './security/email-normalizer.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordHasher } from './security/password-hasser.service.js';
import { VerificationTokenService } from './security/verification-token.service.js';
import { AuthRequestContext } from './security/auth-request-context.js';
import { Prisma } from '../generated/prisma/client.js';
import { LoginDto } from './dto/login.dto.js';
import { UsersService } from '../users/users.service.js';
import { TokenService } from './security/token.service.js';

@Injectable()
export class AuthService {
    // هنا بنجهز Logger علشان نبدا نعرض كل log باسم الخدمة اتللى هو فيها علشان نعرف جا من اى خدمة
    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordHasher: PasswordHasher,
        private readonly emailNormalizer: EmailNormalizer,
        private readonly verificationTokenService: VerificationTokenService,
        private readonly usersService: UsersService,
        private readonly tokenService: TokenService
    ){}
    // الفانكشن الخاصة السيرفس بعملية تسجيل مستخدم جديد
    async register(dto: RegisterDto , context: AuthRequestContext) {
        // اول حاجة هنعمل noralize للايميل
        const email = this.emailNormalizer.normalize(dto.email)
        // تانى حادة هنعمل Hash Password
        const passwordHash = await this.passwordHasher.hash(dto.password)
        // تالت حجاة هنعمل generate للتوكن اللى هنبعته علشان نأكد الايميل
        const rawVerificationToken = this.verificationTokenService.generate()
        // رابع حاجة هنعمل hash للتوكن بتاع الااليمل علشان نخزنه وهو متشفر 
        const verificationTokenHash = this.verificationTokenService.hash(
            rawVerificationToken
        );

        // هنحدد المدة اللى هينتهى فيها التوكن الخاص بالايميل
        const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60);

        // هنعمل بقا هنا DB Transaction علشان نسجل اليوزر ولازم كل حاجاة تتم مع بعض
        // علشان كدا هنستعمل ال transaction علشان لو اى خطوة غلط كله يفشبل مع بعض او كله ينجح مع بعض
        try {
            const user = await this.prisma.$transaction(
                async (tx: any) => {
                    // هنا هنسجل المعلومات الخاصة باليوزر
                    const createdUser = await tx.user.create({
                        data: {
                            email,
                            firstName: dto.firstName,
                            lastName: dto.lastName
                        },
                    });
    
                    // هنا هنسجل الملعومات بتاعت المهمة زى الباسورد ومتربط باى يوزر
                    await tx.passwordCredential.create({
                        data: {
                            userId: createdUser.id,
                            passwordHash
                        }
                    });
    
                    // هنا هنسجل معلومات الايميل والتوكن اللى هيتعبت علشان نوثق الايميل
                    await tx.emailVerificationChallenge.create({
                        data: {
                            userId: createdUser.id,
                            tokenHash: verificationTokenHash,
                            expiresAt: verificationExpiresAt
                        }
                    });
    
                    // هنا هنسجل الحدث بان التسجيل تم بنجاح
                    await tx.securityEvent.create({
                        data: {
                            userId: createdUser.id,
                            type: 'REGISTRATION_SUCCEEDED',
                            ipAddress: context.ipAddress,
                            userAgent: context.userAgent
                        }
                    });
    
                    return createdUser;
                }
            );
            // هنا بقا بعد مانخلص العميلات وتنجح هنبعت الايميل ليةر علشان يكمل تسجيل
            return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            };
        } catch (error) {
            if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'){
                throw new ConflictException('Registration Conflict');
            }
            throw error;
        }
    }

    // الفانكشن الخاصة بتأكيد الاييمل
    async verifyEmail(token: string) {
        const tokenHash = this.verificationTokenService.hash(token);

        return this.prisma.$transaction(async (tx) => {
            const challenge = await tx.emailVerificationChallenge.findUnique({
                where: {
                    tokenHash,
                },
            });

            if(!challenge){
                throw new ConflictException('Invalid verification token');
            }

            const now = new Date();

            if(challenge.usedAt){
                throw new ConflictException('Verification token already used');
            }

            if(challenge.revokedAt){
                throw new ConflictException('Verification token revoked');
            }

            if(challenge.expiresAt <= now){
                throw new ConflictException('Verification token expired');
            }

            const consumed = await tx.emailVerificationChallenge.updateMany({
                where: {
                    id: challenge.id,
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: {
                        gt: now,
                    },
                },
                data: {
                    usedAt: now,
                },
            });

            if(consumed.count !== 1){
                throw new ConflictException('Verification token is no longer valid');
            }

            const user = await tx.user.update({
                where: {
                    id: challenge.userId,
                },
                data: {
                    emailVerifiedAt: now,
                },
            });

            await tx.securityEvent.create({
                data: {
                    userId: user.id,
                    type: 'EMAIL_VERIFIED'
                },
            });

            return {
                message: 'Email verified successfully',
            }
        })
    }


// دى هنا السيرفيس الخاصة بتسجيل الدخول لليوزر
    async login(dto: LoginDto , context: AuthRequestContext) {
        // اول حاجة هنظبط الايميل
        const email = this.emailNormalizer.normalize(dto.email);
        // هنجيب اليوزر ونتأكد انه موجود ومعلوماته صحيحة
        const user = await this.usersService.findForAuthentication(email);

        if(!user || !user.passwordCredential){
            throw new UnauthorizedException('Invalid Email or Password');
        }
        // هنعمل verify للباسورد ونتاكد انه صح
        const passwordValid = await this.passwordHasher.verify(
            user.passwordCredential.passwordHash,
            dto.password
        );

        // لو غلط هنرمى ايرور
        if(!passwordValid){
            throw new UnauthorizedException("Invalid Email or Password");
        }

        if(user.status !== 'ACTIVE') {
            throw new UnauthorizedException("Invalid Email or Password");
        }
        // لو صح هنظبط التوكنز بتاعتنا ونبدا سيشن علشان نخزن الملعومات ونبدا سيشن لليورز
        const rawRefreshToken = this.tokenService.generateRefreshToken();
        const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

        const now = new Date();

        // هنا بنظبط التواريخ بتاعت الانتهاء للريفرش توكن
        const idleExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const absoluteExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        const refreshTokenExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // هنبدا السيشن علشان  نبدا نخزن المعلومات فى مانها ونبدا سيشن جديد
        const session = await this.prisma.$transaction(async (tx) => {
            const createdSession = await tx.session.create({
                data: {
                    userId: user.id,
                    clientType: 'WEB',
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    lastUsedAt: now,
                    idleExpiresAt,
                    absoluteExpiresAt,
                },
            });

            await tx.refreshToken.create({
                data: {
                    sessionId: createdSession.id,
                    tokenHash: refreshTokenHash,
                    expiresAt: refreshTokenExpiresAt
                }
            });

            await tx.securityEvent.create({
                data: {
                    userId: user.id,
                    type: 'LOGIN_SUCCEEDED',
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent
                }
            });

            return createdSession;
        });

        const accessToken = await this.tokenService.generateAccessToken(
            user.id,
            session.id
        );

        return {
            accessToken,
            refreshToken: rawRefreshToken
        }
    }
}
