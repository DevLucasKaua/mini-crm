import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { firebaseAdminProvider } from './firebase-admin.provider';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Module({
  imports: [UsersModule],
  providers: [firebaseAdminProvider, FirebaseAuthGuard],
  exports: [firebaseAdminProvider, FirebaseAuthGuard],
})
export class AuthModule {}
