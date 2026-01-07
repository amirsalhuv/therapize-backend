import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Dev credentials - all passwords are "pass"
const DEV_PASSWORD = 'pass';

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  console.log('Seeding development users...\n');

  // Create Therapist 1
  const therapist1 = await prisma.user.upsert({
    where: { email: 'dr.sarah@therapize.dev' },
    update: { passwordHash },
    create: {
      email: 'dr.sarah@therapize.dev',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Cohen',
      roles: ['THERAPIST'],
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      locale: 'EN',
      therapistProfile: {
        create: {
          licenseNumber: 'PT-12345',
          licenseState: 'IL',
          specializations: ['Back Pain', 'Sports Injuries', 'Post-Surgery'],
          bio: 'Experienced physical therapist specializing in orthopedic rehabilitation.',
          yearsOfExperience: 8,
          isLeadTherapist: true,
          acceptingNewPatients: true,
        },
      },
    },
  });
  console.log(`Created therapist: ${therapist1.email}`);

  // Create Therapist 2
  const therapist2 = await prisma.user.upsert({
    where: { email: 'dr.michael@therapize.dev' },
    update: { passwordHash },
    create: {
      email: 'dr.michael@therapize.dev',
      passwordHash,
      firstName: 'Michael',
      lastName: 'Levy',
      roles: ['THERAPIST'],
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      locale: 'EN',
      therapistProfile: {
        create: {
          licenseNumber: 'PT-67890',
          licenseState: 'IL',
          specializations: ['Neurological', 'Geriatric', 'Balance'],
          bio: 'Specialized in neurological rehabilitation and balance disorders.',
          yearsOfExperience: 12,
          isLeadTherapist: false,
          acceptingNewPatients: true,
        },
      },
    },
  });
  console.log(`Created therapist: ${therapist2.email}`);

  // Create Patient 1
  const patient1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      gender: 'MALE',
      roles: ['PATIENT'],
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      locale: 'EN',
      patientProfile: {
        create: {
          ageRange: 'ADULT',
          country: 'Israel',
          city: 'Tel Aviv',
          conditionDescription: 'Lower back pain for 3 months after lifting injury',
        },
      },
    },
  });
  console.log(`Created patient: ${patient1.email}`);

  // Create Patient 2
  const patient2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'FEMALE',
      roles: ['PATIENT'],
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      locale: 'EN',
      patientProfile: {
        create: {
          ageRange: 'ADULT',
          country: 'Israel',
          city: 'Jerusalem',
          conditionDescription: 'Knee rehabilitation post ACL surgery',
        },
      },
    },
  });
  console.log(`Created patient: ${patient2.email}`);

  // Get therapist and patient profiles for creating episodes
  const sarahProfile = await prisma.therapistProfile.findUnique({
    where: { userId: therapist1.id },
  });

  const johnProfile = await prisma.patientProfile.findUnique({
    where: { userId: patient1.id },
  });

  const janeProfile = await prisma.patientProfile.findUnique({
    where: { userId: patient2.id },
  });

  if (sarahProfile && johnProfile && janeProfile) {
    // Create Program Episode for John Doe with Dr. Sarah (Week 5 of 12)
    const episode1 = await prisma.programEpisode.upsert({
      where: {
        id: 'demo-episode-john-sarah',
      },
      update: {
        currentWeek: 5,
        status: 'ACTIVE',
      },
      create: {
        id: 'demo-episode-john-sarah',
        patientId: johnProfile.id,
        therapistId: sarahProfile.id,
        status: 'ACTIVE',
        durationWeeks: 12,
        currentWeek: 5,
        startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 5 weeks ago
        expectedEndDate: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000), // 7 weeks from now
        goals: {
          primary: 'Reduce lower back pain',
          secondary: ['Improve core strength', 'Return to normal activities'],
        },
        notes: 'Patient showing good progress. Pain reduced from 7/10 to 4/10.',
      },
    });
    console.log(`Created episode: John Doe -> Dr. Sarah (Week ${episode1.currentWeek}/${episode1.durationWeeks})`);

    // Create Program Episode for Jane Smith with Dr. Sarah (Week 3 of 12)
    const episode2 = await prisma.programEpisode.upsert({
      where: {
        id: 'demo-episode-jane-sarah',
      },
      update: {
        currentWeek: 3,
        status: 'ACTIVE',
      },
      create: {
        id: 'demo-episode-jane-sarah',
        patientId: janeProfile.id,
        therapistId: sarahProfile.id,
        status: 'ACTIVE',
        durationWeeks: 12,
        currentWeek: 3,
        startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 3 weeks ago
        expectedEndDate: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000), // 9 weeks from now
        goals: {
          primary: 'ACL rehabilitation',
          secondary: ['Restore knee mobility', 'Strengthen quadriceps'],
        },
        notes: 'Post-surgery recovery on track. Starting strength exercises.',
      },
    });
    console.log(`Created episode: Jane Smith -> Dr. Sarah (Week ${episode2.currentWeek}/${episode2.durationWeeks})`);

    // Create Program Templates for Dr. Sarah
    const program1 = await prisma.programTemplate.upsert({
      where: { id: 'demo-program-lower-back' },
      update: {},
      create: {
        id: 'demo-program-lower-back',
        name: 'Lower Back Pain Recovery',
        description: 'A comprehensive 12-week program for chronic lower back pain focusing on core strengthening and mobility.',
        durationWeeks: 12,
        category: 'Orthopedic',
        targetConditions: ['Lower Back Pain', 'Lumbar Strain', 'Disc Herniation'],
        isPublished: true,
        createdById: sarahProfile.id,
        structure: {
          weeks: [
            { week: 1, focus: 'Assessment & Pain Management', exercises: 4 },
            { week: 2, focus: 'Gentle Mobility', exercises: 5 },
            { week: 3, focus: 'Core Activation', exercises: 6 },
          ],
        },
      },
    });
    console.log(`Created program: ${program1.name}`);

    const program2 = await prisma.programTemplate.upsert({
      where: { id: 'demo-program-knee-rehab' },
      update: {},
      create: {
        id: 'demo-program-knee-rehab',
        name: 'Post-ACL Surgery Rehabilitation',
        description: 'Evidence-based 16-week ACL reconstruction recovery program.',
        durationWeeks: 16,
        category: 'Sports Medicine',
        targetConditions: ['ACL Tear', 'Knee Surgery', 'Sports Injury'],
        isPublished: false,
        createdById: sarahProfile.id,
        structure: {
          weeks: [
            { week: 1, focus: 'Range of Motion', exercises: 3 },
            { week: 2, focus: 'Weight Bearing', exercises: 4 },
            { week: 3, focus: 'Strength Building', exercises: 5 },
          ],
        },
      },
    });
    console.log(`Created program: ${program2.name}`);
  }

  console.log('\n--- DEV CREDENTIALS ---');
  console.log('Password for all accounts: pass\n');
  console.log('THERAPISTS:');
  console.log('  dr.sarah@therapize.dev');
  console.log('  dr.michael@therapize.dev');
  console.log('\nPATIENTS:');
  console.log('  john.doe@example.com');
  console.log('  jane.smith@example.com');
  console.log('------------------------\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
