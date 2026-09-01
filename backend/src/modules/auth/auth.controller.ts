import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';

const cookieOptions = (expires: Date) => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/auth', expires });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(dto.email, dto.password);
    response.cookie('clinic_refresh', session.refreshToken, cookieOptions(session.expiresAt));
    return { accessToken: session.accessToken, user: session.user };
  }
  @Public() @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.clinic_refresh as string | undefined;
    if (!token) throw new UnauthorizedException('Refresh token required');
    const session = await this.auth.refresh(token);
    response.cookie('clinic_refresh', session.refreshToken, cookieOptions(session.expiresAt));
    return { accessToken: session.accessToken, user: session.user };
  }
  @Public() @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.clinic_refresh as string | undefined);
    response.clearCookie('clinic_refresh', { path: '/api/auth' });
    return null;
  }
  @Get('me') me(@CurrentUser() user: AuthenticatedUser) { return user; }
}
