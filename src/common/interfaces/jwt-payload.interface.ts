import { Role } from '../enums';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: Role[];
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshTokenId: string;
}
