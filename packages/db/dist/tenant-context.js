export async function withUserContext(prisma, userId, callback) {
    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw `SELECT set_config('app.user_id', ${userId}, true)`;
        return callback(tx);
    });
}
