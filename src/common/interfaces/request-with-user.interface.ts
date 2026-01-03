import { Request } from 'express';
import { Role } from '../enums';

export interface RequestUser {
  id: string;
  email: string;
  roles: Role[];
  refreshTokenId?: string;
}

export interface RequestWithUser extends Request {
  user: RequestUser;
}
