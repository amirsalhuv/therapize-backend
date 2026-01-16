import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // List all users first
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, roles: true },
  });
  console.log('All users:', users);

  // Find Nahum's user
  let nahum = await prisma.user.findFirst({
    where: { firstName: { contains: 'Nahum', mode: 'insensitive' } },
    include: { patientProfile: true },
  });

  if (!nahum) {
    // Try to find by email or create
    nahum = await prisma.user.findFirst({
      where: { roles: { has: 'PATIENT' } },
      include: { patientProfile: true },
    });
  }

  if (!nahum) {
    console.error('No patient user found');
    return;
  }

  console.log('Found user:', nahum.email, nahum.firstName, nahum.lastName);

  // Create patient profile if missing
  let patientProfile = nahum.patientProfile;
  if (!patientProfile) {
    console.log('Creating patient profile...');
    patientProfile = await prisma.patientProfile.create({
      data: {
        userId: nahum.id,
      },
    });
    console.log('Created patient profile:', patientProfile.id);
  }

  // Find or create a therapist
  let therapist = await prisma.therapistProfile.findFirst({
    include: { user: true },
  });

  if (!therapist) {
    console.log('No therapist found, creating one...');
    await prisma.user.create({
      data: {
        email: 'therapist@therapize.com',
        firstName: 'Sarah',
        lastName: 'Mitchell',
        passwordHash: '$2b$10$test', // placeholder
        roles: ['THERAPIST'],
        therapistProfile: {
          create: {
            licenseNumber: 'PT-12345',
          },
        },
      },
    });
    // Refetch the therapist profile with user included
    therapist = await prisma.therapistProfile.findFirst({
      include: { user: true },
    });
  }

  if (!therapist) {
    console.error('Failed to find or create therapist');
    return;
  }

  console.log('Using therapist:', therapist.id);

  // Create exercises if they don't exist
  const exercises = await Promise.all([
    prisma.exercise.upsert({
      where: { id: 'ex-pelvic-tilt' },
      update: {},
      create: {
        id: 'ex-pelvic-tilt',
        name: 'Pelvic Tilt',
        nameHe: 'הטיית אגן',
        description: 'A gentle exercise to strengthen your lower back',
        instructions: 'Lie on your back with knees bent. Tighten your abdominal muscles and push your lower back into the floor. Hold for 5 seconds, then relax.',
        durationMinutes: 5,
        repetitions: 10,
        sets: 3,
        difficulty: 2,
        category: 'LOWER_BACK',
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-cat-cow' },
      update: {},
      create: {
        id: 'ex-cat-cow',
        name: 'Cat-Cow Stretch',
        nameHe: 'מתיחת חתול-פרה',
        description: 'A flowing movement to improve spine flexibility',
        instructions: 'Start on hands and knees. Arch your back up like a cat, then lower it and lift your head like a cow. Move slowly between positions.',
        durationMinutes: 4,
        repetitions: 8,
        sets: 2,
        difficulty: 1,
        category: 'FLEXIBILITY',
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-bridge' },
      update: {},
      create: {
        id: 'ex-bridge',
        name: 'Bridge Exercise',
        nameHe: 'תרגיל גשר',
        description: 'Strengthen glutes and lower back',
        instructions: 'Lie on your back with knees bent. Lift your hips off the floor until your body forms a straight line. Hold for 3 seconds.',
        durationMinutes: 6,
        repetitions: 12,
        sets: 3,
        difficulty: 2,
        category: 'STRENGTH',
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-bird-dog' },
      update: {},
      create: {
        id: 'ex-bird-dog',
        name: 'Bird Dog',
        nameHe: 'כלב-ציפור',
        description: 'Core stability and balance exercise',
        instructions: 'Start on hands and knees. Extend one arm forward and opposite leg back. Hold for 5 seconds, then switch sides.',
        durationMinutes: 5,
        repetitions: 10,
        sets: 2,
        difficulty: 3,
        category: 'CORE',
      },
    }),
  ]);

  console.log('Created/found exercises:', exercises.map(e => e.name));

  // Create or find program episode
  let episode = await prisma.programEpisode.findFirst({
    where: { patientId: patientProfile.id },
  });

  if (!episode) {
    episode = await prisma.programEpisode.create({
      data: {
        patientId: patientProfile.id,
        therapistId: therapist.id,
        status: 'ACTIVE',
        currentWeek: 5,
        durationWeeks: 12,
        startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 4 weeks ago
        expectedEndDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000), // 8 weeks from now
      },
    });
    console.log('Created program episode');
  } else {
    console.log('Using existing episode:', episode.id);
  }

  // Create patient plan
  let plan = await prisma.patientPlan.findFirst({
    where: { episodeId: episode.id, isActive: true },
  });

  if (!plan) {
    plan = await prisma.patientPlan.create({
      data: {
        patientId: patientProfile.id,
        episodeId: episode.id,
        name: 'Lower Back Pain Recovery',
        isActive: true,
        startDate: episode.startDate,
      },
    });
    console.log('Created patient plan');
  }

  // Delete existing sessions for today (to recreate fresh)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.session.deleteMany({
    where: {
      episodeId: episode.id,
      scheduledDate: { gte: today, lt: tomorrow },
    },
  });

  // Create today's sessions (main + bonus)
  const mainSession = await prisma.session.create({
    data: {
      episodeId: episode.id,
      planId: plan.id,
      scheduledDate: today,
      status: 'SCHEDULED',
      sessionExercises: {
        create: [
          { exerciseId: 'ex-pelvic-tilt', orderIndex: 0 },
          { exerciseId: 'ex-cat-cow', orderIndex: 1 },
          { exerciseId: 'ex-bridge', orderIndex: 2 },
          { exerciseId: 'ex-bird-dog', orderIndex: 3 },
        ],
      },
    },
  });

  const bonusSession = await prisma.session.create({
    data: {
      episodeId: episode.id,
      planId: plan.id,
      scheduledDate: today,
      status: 'SCHEDULED',
      sessionExercises: {
        create: [
          { exerciseId: 'ex-cat-cow', orderIndex: 0 },
          { exerciseId: 'ex-bridge', orderIndex: 1 },
        ],
      },
    },
  });

  console.log('Created sessions for today:');
  console.log('  - Main session:', mainSession.id, '(4 exercises)');
  console.log('  - Bonus session:', bonusSession.id, '(2 exercises)');
  console.log('\nDone! The patient should now see the Today session.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
