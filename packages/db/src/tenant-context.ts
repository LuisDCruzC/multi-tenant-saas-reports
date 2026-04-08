import type { Prisma, PrismaClient } from "@prisma/client";

export async function withUserContext<T>(
  prisma: PrismaClient,
  userId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return callback(tx);
  });
}
