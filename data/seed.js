const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function countWordMasterRows() {
  try {
    const count = await prisma.wordMaster.count();
    console.log('Number of rows in WordMaster table:', count);
  } catch (error) {
    console.error('Error counting rows:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countWordMasterRows();