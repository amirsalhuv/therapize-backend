import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const result = await prisma.patientTherapistRelationship.update({
    where: { id: 'f9288089-1f80-49fc-977c-09ff51e0d744' },
    data: {
      status: 'PENDING_SCHEDULING',
      scheduledAt: null,
    },
  });
  console.log('Reset successful:', result.status);
} catch (e) {
  console.error('Error:', e);
} finally {
  await prisma.$disconnect();
}
