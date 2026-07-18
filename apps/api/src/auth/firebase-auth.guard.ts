import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { App } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { UsersService } from '../users/users.service';
import { RequestWithUser } from './authenticated-user.interface';
import { FIREBASE_APP } from './firebase-admin.provider';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(FIREBASE_APP) private readonly firebaseApp: App,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let decoded: DecodedIdToken;
    try {
      decoded = await getAuth(this.firebaseApp).verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.usersService.resolveFromFirebase({
      uid: decoded.uid,
      email: decoded.email,
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
    });
    if (!user) {
      throw new ForbiddenException('User is not provisioned for any unit');
    }

    request.user = {
      userId: user.id,
      unitId: user.unitId,
      email: user.email,
    };
    return true;
  }
}
