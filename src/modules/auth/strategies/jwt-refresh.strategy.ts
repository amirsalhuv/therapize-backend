import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtRefreshPayload, RequestUser } from '../../../common/interfaces';
import { PrismaService } from '../../../database';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    } as any); // Type assertion needed for passReqToCallback with custom strategy
  }

  async validate(req: Request, payload: JwtRefreshPayload): Promise<RequestUser> {
    const refreshToken = req.body.refreshToken;

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.refreshTokenId },
      include: { user: { select: { id: true, email: true, roles: true, status: true } } },
    });

    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (storedToken.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User inactive');
    }

    return {
      id: storedToken.user.id,
      email: storedToken.user.email,
      roles: payload.roles,
      refreshTokenId: payload.refreshTokenId,
    };
  }
}
