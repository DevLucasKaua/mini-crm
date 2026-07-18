import * as fs from 'node:fs';
import * as path from 'node:path';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';

export const FIREBASE_APP = 'FIREBASE_APP';

export const firebaseAdminProvider: Provider<App> = {
  provide: FIREBASE_APP,
  inject: [ConfigService],
  useFactory: (config: ConfigService): App => {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      return existingApps[0];
    }

    const serviceAccountPath = config.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_PATH',
    );
    if (serviceAccountPath) {
      const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
      if (fs.existsSync(resolvedPath)) {
        return initializeApp({ credential: cert(resolvedPath) });
      }
    }

    const projectId = config.get<string>('FIREBASE_PROJECT_ID');
    if (projectId) {
      return initializeApp({ projectId });
    }

    throw new Error(
      'Firebase is not configured: set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID',
    );
  },
};
