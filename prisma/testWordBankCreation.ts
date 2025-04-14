import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()

async function testCreateWordBank() {
  try {
    const wordBank = await prisma.wordBank.create({
      data: {
        name: 'Test Bank',
        description: 'Test Description',
        userId: 'test-user-id'
      }
    })
    console.log('Created word bank:', wordBank)
  } catch (error) {
    console.error('Error creating word bank:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCreateWordBank()
