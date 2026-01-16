import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Map video filenames to exercise IDs
const videoMappings: Record<string, { exerciseId: string; mediaType: 'video' | 'image' }> = {
  'Cat_Cow.mp4': { exerciseId: 'ex-cat-cow', mediaType: 'video' },
  'Pelvic_Tilt.mp4': { exerciseId: 'ex-pelvic-tilt', mediaType: 'video' },
  'Bridge.mp4': { exerciseId: 'ex-bridge', mediaType: 'video' },
  'Bird_Dog.mp4': { exerciseId: 'ex-bird-dog', mediaType: 'video' },
};

// Use your machine's local IP for mobile device access
const BACKEND_URL = process.env.BACKEND_URL || 'http://10.100.102.205:3001';

async function main() {
  const videosDir = path.join(__dirname, '..', '..', 'Videos');

  console.log('Scanning videos directory:', videosDir);

  if (!fs.existsSync(videosDir)) {
    console.error('Videos directory not found');
    return;
  }

  const files = fs.readdirSync(videosDir);
  console.log('Found files:', files);

  for (const file of files) {
    const mapping = videoMappings[file];
    if (mapping) {
      const mediaUrl = `${BACKEND_URL}/videos/${encodeURIComponent(file)}`;

      try {
        const updated = await prisma.exercise.update({
          where: { id: mapping.exerciseId },
          data: {
            mediaUrl,
            mediaType: mapping.mediaType,
          },
        });
        console.log(`✓ Updated ${updated.name}: ${mediaUrl}`);
      } catch (error) {
        console.log(`✗ Exercise ${mapping.exerciseId} not found, skipping`);
      }
    } else {
      console.log(`? No mapping for file: ${file}`);
    }
  }

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
