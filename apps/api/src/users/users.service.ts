import { Injectable, NotFoundException } from '@nestjs/common';
import { MeDto } from '@mini-crm/shared-types';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFromFirebase(decoded: {
    uid: string;
    email?: string;
    name?: string;
  }): Promise<User | null> {
    const byUid = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });
    if (byUid) {
      return byUid;
    }

    if (!decoded.email) {
      return null;
    }
    const byEmail = await this.prisma.user.findUnique({
      where: { email: decoded.email.toLowerCase() },
    });
    if (!byEmail) {
      return null;
    }

    return this.prisma.user.update({
      where: { id: byEmail.id },
      data: {
        firebaseUid: decoded.uid,
        ...(byEmail.name === null && decoded.name
          ? { name: decoded.name }
          : {}),
      },
    });
  }

  async getMe(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { unit: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      unit: {
        id: user.unit.id,
        name: user.unit.name,
        slug: user.unit.slug,
      },
    };
  }
}
