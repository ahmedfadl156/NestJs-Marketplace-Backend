import { ConflictException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { EMAIL_SERVICE } from '../infrastructure/email/email.token.js';
import type { EmailService } from '../infrastructure/email/email.service.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Ifde6UBO/pNuST7SmySUdA$RClZtJrlvvBQ6XceJgEryBWx2ch0meLdFDLsFwPvzwg';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    // هنا بنجهز Logger علشان نبدا نعرض كل log باسم الخدمة اتللى هو فيها علشان نعرف جا من اى خدمة
    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordHasher: PasswordHasher,
        private readonly emailNormalizer: EmailNormalizer,
        private readonly verificationTokenService: VerificationTokenService,
        private readonly usersService: UsersService,
        private readonly tokenService: TokenService,
        @Inject(EMAIL_SERVICE)
        private readonly emailService: EmailService,
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

            await this.emailService.sendVerificationEmail({
                to: user.email,
                firstName: user.firstName,
                token: rawVerificationToken
            })
            // هنا بقا بعد مانخلص العميلات وتنجح هنبعت الايميل ليةر علشان يكمل تسجيل
            return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            };
        } catch (error) {
            if(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'){
                this.logger.warn(`Registration conflict for normalized email ${email}`);
                throw new ConflictException("Registration Conflict.")
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
            await this.passwordHasher.verify(dto.password, DUMMY_PASSWORD_HASH);
            throw new UnauthorizedException('Invalid Email or Password');
        }
        // هنعمل verify للباسورد ونتاكد انه صح
        const passwordValid = await this.passwordHasher.verify(
            dto.password,
            user.passwordCredential.passwordHash
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


    /*
    RefreshToken
      │
      ▼
hash(token)
      │
      ▼
find RefreshToken
      │
      ├── not found ──────→ 401
      │
      ├── USED ────────────→ replay detection
      │
      ├── REVOKED ─────────→ 401
      │
      ├── expired ─────────→ 401
      │
      ▼
validate Session
      │
      ▼
mark old token USED
      │
      ▼
create new RefreshToken
      │
      ▼
link old → new
      │
      ▼
update Session.lastUsedAt
      │
      ▼
SecurityEvent
      │
      ▼
new AccessToken
*/

// الميثود اللى هنستعلمها علشان نكتشف لما يحصل استخدام خاطى لتوكن تم اتسخدامه قبل كدا
    private async handleRefreshTokenReplay(
        sessionId: string,
        context: AuthRequestContext
    ) {
        await this.prisma.$transaction(async (tx) => {
            const session = await tx.session.update({
                where: {
                    id: sessionId,
                },
                data: {
                    status: 'REVOKED',
                    revokedAt: new Date(),
                    revocationReason: 'SECURITY_RESPONSE',
                },
            });

            await tx.refreshToken.updateMany({
                where: {
                    sessionId,
                    status: 'ACTIVE'
                },
                data: {
                    status: 'REVOKED',
                    revokedAt: new Date()
                }
            });

            await tx.securityEvent.create({
                data: {
                    userId: session.userId,
                    type: 'SESSION_REVOKED',
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    metadata: {
                        reason: 'REFRESH_TOKEN_REPLAY',
                        sessionId
                    }
                }
            })
        })
    }
// الفانكشن المسئولة عن انها تعمل ريفرش للتوكن لما ينتهى او يحصل فيه اى حاجة
    async refresh(
        dto: RefreshTokenDto,
        context: AuthRequestContext
    ) {
        const tokenHash = this.tokenService.hashRefreshToken(dto.refreshToken);

        const now = new Date();

        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: {tokenHash},
            include: {
                session: true
            }
        });

        if(!refreshToken){
            throw new UnauthorizedException("Invalid refresh token");
        }

        if(refreshToken.status === 'USED'){
            await this.handleRefreshTokenReplay(refreshToken.sessionId , context);

            throw new UnauthorizedException('Invalid refresh token');
        }

        if(refreshToken.status !== 'ACTIVE' || refreshToken.expiresAt <= now){
            throw new UnauthorizedException('Invalid refresh token');
        }

        const session = refreshToken.session;

        if(session.status !== 'ACTIVE' || session.absoluteExpiresAt <= now || session.idleExpiresAt <= now){
            throw new UnauthorizedException('Invalid refresh token');
        }

        const newRawRefreshToken = this.tokenService.generateRefreshToken();
        const newRefershTokenHash = this.tokenService.hashRefreshToken(newRawRefreshToken);
        const newRefreshToenExpiresAt = new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000
        );

        const result = await this.prisma.$transaction(async (tx) => {
            const consumed = await tx.refreshToken.updateMany({
                where: {
                    id: refreshToken.id,
                    status: 'ACTIVE',
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: {
                        gt: now,
                    },
                },
                data: {
                    status: 'USED',
                    usedAt: now,
                }
            });

            if(consumed.count !== 1){
                throw new UnauthorizedException("Invalid refresh token");
            }

            const newRefreshToken = await tx.refreshToken.create({
                data: {
                    sessionId: session.id,
                    tokenHash: newRefershTokenHash,
                    expiresAt: newRefreshToenExpiresAt
                }
            });

            await tx.refreshToken.update({
                where: {
                    id: refreshToken.id,
                },
                data: {
                    replacedByTokenId: newRefreshToken.id
                }
            });

            const updatedSession = await tx.session.update({
                where: {
                    id: session.id,
                },
                data: {
                    lastUsedAt: now,
                    idleExpiresAt: new Date(
                        now.getTime() + 30 * 24 * 60 * 60 * 1000
                    )
                }
            });

            await tx.securityEvent.create({
                data: {
                    userId: session.userId,
                    type: 'LOGIN_SUCCEEDED',
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    metadata: {
                        event: 'REFRESH_TOKEN_ROTATED',
                        sessionId: session.id
                    }
                }
            });

            return updatedSession;
        })

        const accessToken = await this.tokenService.generateAccessToken(
            session.userId,
            result.id
        );

        return {
            accessToken,
            refreshToken: newRawRefreshToken,
        }
    }

    // هنا السيرفيس المسؤلة عن تسجيل الخروج لليوزر من السيشن الحالية
    async logout(refreshToken: string){
        const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
        const now = new Date();

        const token = await this.prisma.refreshToken.findUnique({
            where: {
                tokenHash,
            },
            include: {
                session: true
            }
        });

        if(!token){
            return {
                message: 'Logged out successfully.'
            }
        };

        await this.prisma.$transaction(async (tx) => {
            await tx.session.updateMany({
                where: {
                    id: token.sessionId,
                    status: 'ACTIVE'
                },
                data: {
                    status: 'REVOKED',
                    revokedAt: now,
                    revocationReason: 'USER_LOGOUT'
                },
            });

            await tx.refreshToken.updateMany({
                where: {
                    sessionId: token.sessionId,
                    status: 'ACTIVE'
                },
                data: {
                    status: 'REVOKED',
                    revokedAt: now
                },
            });

            await tx.securityEvent.create({
                data: {
                    userId: token.session.userId,
                    type: 'LOGOUT',
                    metadata: {
                        sessionId: token.sessionId
                    }
                }
            });
        })

        return {
            message: 'Logged out successfully.',
        }
    }

    async getCurrentUser(userId: string) {
        const user = await this.usersService.findCurrentUserById(userId);

        if(!user){
            throw new UnauthorizedException("Unaouthorized.");
        }

        return user;
    }


    /*
        1-Forgot Password => POST Request for route
        2-email input
        3-search if email exist or not 
        4-if exist send random reset token and send it to the user
        5-then user sned with token link
        6- Reset Password => POST Request for the route by the link
        7- token validate
        8-new password input
        9- hash the password by argon2id
        10- save the hahsed password in DB
        11- revoke old sessions
        12- create secuirty event for changing password
    */ 

    async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
        // الاول هنعمل نورماليز للايميل علشان يبقى جاى مظبوط
        const email = this.emailNormalizer.normalize(dto.email);
        // هناخد الايميل علشان نشوف هل موجود ولا لا يوزر مرتبط بالايميل دا
        const user = await this.usersService.findByEmail(email);

        if(!user){
            return;
        }

        // نعمل توكن جديد ونعمله هاش علشان نخزن الهاش فى الداتابيز ونبعت العادى لليوزر
        const rawToken = this.verificationTokenService.generate();
        const tokenHash = this.verificationTokenService.hash(rawToken);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await this.prisma.$transaction(async (tx) => {
            await tx.passwordResetChallenge.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    expiresAt,
                }
            });

            await tx.securityEvent.create({
                data: {
                    userId: user.id,
                    type: 'PASSWORD_RESET_REQUESTED',
                }
            });
        })

        await this.emailService.sendPasswordResetEmail({
            to: user.email,
            firstName: user.firstName,
            token: rawToken
        })
    }

    async resetPassword(dto: ResetPasswordDto): Promise<void> {
        // بعمل الاول هاش للاتوكن والباسورد وبعمل هاش للباسورد
        // برا الترانزاكشن علشان دى عملية تقيلة على ال CPU مينفعش اعملها جوا الداتابيز هتقعد فترة طويلة 
        const tokenHash = this.verificationTokenService.hash(dto.token);
        const passwordHash = await this.passwordHasher.hash(dto.newPassword);

        const now = new Date();

        const result = await this.prisma.$transaction(async (tx) => {
            const challenge = await tx.passwordResetChallenge.findUnique({
                where: {
                    tokenHash,
                },
            });

            if(!challenge){
                throw new UnauthorizedException('Invalid or expired password reset token');
            }

            if(challenge.usedAt || challenge.revokedAt || challenge.expiresAt <= now){
                throw new UnauthorizedException('Invalid or expired password reset token');
            }

            const consumed = await tx.passwordResetChallenge.updateMany({
                where: {
                    id: challenge.id,
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: {
                        gt: now
                    }
                },
                data: {
                    usedAt: now,
                }
            });

            if(consumed.count !== 1){
                throw new UnauthorizedException('Invalid or expired password reset token'); 
            };

            await tx.passwordCredential.update({
                where: {
                    userId: challenge.userId,
                },
                data: {
                    passwordHash,
                    passwordChangedAt: now,
                }
            })

            await tx.refreshToken.updateMany({
                where: {
                    session: {
                        userId: challenge.userId,
                    },
                    status: 'ACTIVE'
                },
                data: {
                    status: 'REVOKED',
                    revokedAt: now
                }
            });

            await tx.session.updateMany({
                where: {
                    userId: challenge.userId,
                    status: "ACTIVE"
                },
                data: {
                    status: 'REVOKED',
                    revokedAt: now,
                    revocationReason: 'PASSWORD_CHANGED'
                }
            });

            await tx.passwordResetChallenge.updateMany({
                where: {
                    userId: challenge.userId,
                    id: {
                        not: challenge.id
                    },
                    usedAt: null,
                    revokedAt: null
                },
                data: {
                    revokedAt: now
                }
            });

            await tx.securityEvent.create({
                data: {
                    userId: challenge.userId,
                    type: 'PASSWORD_RESET_COMPLETED'
                }
            });

            const user = await tx.user.findUniqueOrThrow({
                where: {
                    id: challenge.userId,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                }
            })

            return user;
        })

        await this.emailService.sendPasswordResetCompletedEmail({
            to: result.email,
            firstName: result.firstName
        })
    }
}
