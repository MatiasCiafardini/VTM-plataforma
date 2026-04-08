import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as PrismaClientPackage from '@prisma/client';
import type { PrismaClient as GeneratedPrismaClient } from '../../node_modules/.prisma/client/default';

type PrismaClientCtor = new (options?: {
  adapter?: PrismaPg;
}) => GeneratedPrismaClient;

const { PrismaClient } = PrismaClientPackage as unknown as {
  PrismaClient: PrismaClientCtor;
};

const PrismaClientBase = PrismaClient;

@Injectable()
export class PrismaService
  extends PrismaClientBase
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const connectionString =
      configService.get<string>('PRISMA_DIRECT_URL') ??
      configService.get<string>('DATABASE_URL') ??
      '';

    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
