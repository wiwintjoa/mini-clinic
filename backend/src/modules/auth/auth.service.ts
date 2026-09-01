import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { verify } from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { DATABASE, Database } from '../../database/database.module';
import { refreshTokens } from '../../database/schema';
import { UsersService } from '../users/users.service';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly users: UsersService, private readonly jwt: JwtService, private readonly config: ConfigService) {}
  async login(email: string, password: string) {
    const user = await this.users.findForLogin(email);
    if (!user || !(await verify(user.passwordHash, password))) throw new UnauthorizedException('Invalid email or password');
    return this.issueSession(user.id);
  }
  async refresh(rawToken: string) {
    const [session] = await this.db.select().from(refreshTokens).where(and(eq(refreshTokens.tokenHash, digest(rawToken)), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date()))).limit(1);
    if (!session) throw new UnauthorizedException('Invalid or expired refresh token');
    await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, session.id));
    return this.issueSession(session.userId);
  }
  async logout(rawToken?: string) {
    if (rawToken) await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, digest(rawToken)));
  }
  private async issueSession(userId: string) {
    const rawToken = randomBytes(48).toString('base64url');
    const days = Number.parseInt(this.config.get('JWT_REFRESH_DAYS', '7'), 10);
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const [session] = await this.db.insert(refreshTokens).values({ userId, tokenHash: digest(rawToken), expiresAt }).returning({ id: refreshTokens.id });
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: session.id, type: 'access' }, { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '15m') as JwtSignOptions['expiresIn'] });
    return { accessToken, refreshToken: rawToken, expiresAt, user: await this.users.getAuthenticatedUser(userId) };
  }
}
