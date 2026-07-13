const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e) => logger.warn('Prisma warning:', e));
prisma.$on('error', (e) => logger.error('Prisma error:', e));

async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function disconnectDB() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

// Graceful shutdown
process.on('beforeExit', disconnectDB);
process.on('SIGINT', async () => { await disconnectDB(); process.exit(0); });
process.on('SIGTERM', async () => { await disconnectDB(); process.exit(0); });

module.exports = { prisma, connectDB, disconnectDB };
