import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const patients = await prisma.patientProfile.findMany({
    include: {
      user: true,
      programEpisodes: {
        include: {
          firstSessionForm: true
        }
      }
    }
  });

  // Find Sara
  const sara = patients.find((p: any) =>
    p.user?.firstName?.toLowerCase().includes('sara') ||
    p.user?.lastName?.toLowerCase().includes('sara') ||
    p.user?.firstName?.includes('שרה')
  );

  if (!sara) {
    console.log('Patient Sara not found');
    console.log('Available patients:');
    patients.forEach((p: any) => console.log(`  - ${p.user?.firstName} ${p.user?.lastName}`));
    return;
  }

  console.log('Found patient:', sara.user?.firstName, sara.user?.lastName);

  for (const episode of sara.programEpisodes) {
    if (episode.firstSessionForm) {
      console.log('Deleting first session form:', episode.firstSessionForm.id);
      await prisma.firstSessionForm.delete({
        where: { id: episode.firstSessionForm.id }
      });
      console.log('Deleted!');
    } else {
      console.log('No first session form found for episode:', episode.id);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
