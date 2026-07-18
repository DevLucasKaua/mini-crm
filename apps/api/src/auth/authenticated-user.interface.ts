import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  unitId: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
