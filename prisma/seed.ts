import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Dev credentials - all passwords are "pass"
const DEV_PASSWORD = 'pass';

async function seedMilestoneTemplates() {
  console.log('Seeding default milestone templates...\n');

  const defaultTemplates = [
    {
      id: 'milestone-template-baseline',
      type: 'BASELINE_ASSESSMENT' as const,
      name: 'Baseline Assessment',
      nameHe: 'הערכה בסיסית',
      description: 'Initial evaluation to establish starting point and goals',
      descriptionHe: 'הערכה ראשונית לקביעת נקודת מוצא ומטרות',
      defaultWeek: 1,
      isRecurring: false,
      triggerType: 'FORM_COMPLETED' as const,
      triggerConfig: { formType: 'FIRST_SESSION_FORM' },
      isSystemDefault: true,
    },
    {
      id: 'milestone-template-checkin-2',
      type: 'CHECKIN' as const,
      name: 'Bi-weekly Check-in',
      nameHe: 'מעקב דו-שבועי',
      description: 'Progress review and plan adjustment',
      descriptionHe: 'סקירת התקדמות והתאמת תוכנית',
      defaultWeek: 2,
      isRecurring: true,
      recurrenceWeeks: 2,
      triggerType: 'VISIT_COMPLETED' as const,
      triggerConfig: { visitTypes: ['VIDEO', 'IN_PERSON'] },
      isSystemDefault: true,
    },
    {
      id: 'milestone-template-midpoint',
      type: 'MIDPOINT_ASSESSMENT' as const,
      name: 'Midpoint Assessment',
      nameHe: 'הערכת אמצע תוכנית',
      description: 'Mid-program evaluation to measure progress and adjust goals',
      descriptionHe: 'הערכה באמצע התוכנית למדידת התקדמות והתאמת מטרות',
      defaultWeek: 6,
      isRecurring: false,
      triggerType: 'VISIT_COMPLETED' as const,
      triggerConfig: { visitTypes: ['VIDEO', 'IN_PERSON'] },
      isSystemDefault: true,
    },
    {
      id: 'milestone-template-completion',
      type: 'PROGRAM_COMPLETION' as const,
      name: 'Program Completion',
      nameHe: 'סיום תוכנית',
      description: 'Final evaluation and decision on next steps',
      descriptionHe: 'הערכה סופית והחלטה על המשך',
      defaultWeek: 12,
      isRecurring: false,
      triggerType: 'MANUAL' as const,
      triggerConfig: Prisma.JsonNull,
      isSystemDefault: true,
    },
  ];

  for (const template of defaultTemplates) {
    await prisma.milestoneTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        nameHe: template.nameHe,
        description: template.description,
        descriptionHe: template.descriptionHe,
        defaultWeek: template.defaultWeek,
        isRecurring: template.isRecurring,
        recurrenceWeeks: template.recurrenceWeeks,
        triggerType: template.triggerType,
        triggerConfig: template.triggerConfig as Prisma.InputJsonValue | typeof Prisma.JsonNull,
      },
      create: {
        id: template.id,
        type: template.type,
        name: template.name,
        nameHe: template.nameHe,
        description: template.description,
        descriptionHe: template.descriptionHe,
        defaultWeek: template.defaultWeek,
        isRecurring: template.isRecurring,
        recurrenceWeeks: template.recurrenceWeeks,
        triggerType: template.triggerType,
        triggerConfig: template.triggerConfig as Prisma.InputJsonValue | typeof Prisma.JsonNull,
        isSystemDefault: template.isSystemDefault,
      },
    });
    console.log(`  Created milestone template: ${template.name}`);
  }

  console.log('');
}

async function initializeEpisodeMilestones(
  episodeId: string,
  startDate: Date,
  durationWeeks: number,
  therapistName: string,
) {
  // Check if milestones already exist
  const existingCount = await prisma.episodeMilestone.count({
    where: { episodeId },
  });

  if (existingCount > 0) {
    console.log(`  Milestones already exist for episode ${episodeId}, skipping...`);
    return;
  }

  const templates = await prisma.milestoneTemplate.findMany({
    where: { isSystemDefault: true },
    orderBy: { defaultWeek: 'asc' },
  });

  const milestoneData: Prisma.EpisodeMilestoneCreateManyInput[] = [];

  for (const template of templates) {
    if (template.isRecurring && template.recurrenceWeeks) {
      // Create recurring milestones
      for (
        let week = template.defaultWeek;
        week <= durationWeeks;
        week += template.recurrenceWeeks
      ) {
        const targetDate = new Date(startDate);
        targetDate.setDate(targetDate.getDate() + (week - 1) * 7);

        milestoneData.push({
          episodeId,
          templateId: template.id,
          type: template.type,
          name: template.name,
          nameHe: template.nameHe,
          description: template.description,
          descriptionHe: template.descriptionHe,
          targetWeek: week,
          targetDate,
          triggerType: template.triggerType,
          triggerConfig: template.triggerConfig || undefined,
          status: 'PENDING',
          orderIndex: week * 10,
          therapistName,
        });
      }
    } else {
      // Create single milestone
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + (template.defaultWeek - 1) * 7);

      milestoneData.push({
        episodeId,
        templateId: template.id,
        type: template.type,
        name: template.name,
        nameHe: template.nameHe,
        description: template.description,
        descriptionHe: template.descriptionHe,
        targetWeek: template.defaultWeek,
        targetDate,
        triggerType: template.triggerType,
        triggerConfig: template.triggerConfig || undefined,
        status: 'PENDING',
        orderIndex: template.defaultWeek * 10,
        therapistName,
      });
    }
  }

  await prisma.episodeMilestone.createMany({ data: milestoneData });
  console.log(`  Created ${milestoneData.length} milestones for episode ${episodeId}`);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // Seed milestone templates first
  await seedMilestoneTemplates();

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

  // Create Patient 3 - Nahum
  const patient3 = await prisma.user.upsert({
    where: { email: 'nahum@gmail.com' },
    update: {},
    create: {
      email: 'nahum@gmail.com',
      passwordHash,
      firstName: 'Nahum',
      lastName: 'Patient',
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
          conditionDescription: 'Seeking physical therapy',
        },
      },
    },
  });
  console.log(`Created patient: ${patient3.email}`);

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

  const nahumProfile = await prisma.patientProfile.findUnique({
    where: { userId: patient3.id },
  });

  if (sarahProfile && johnProfile && janeProfile && nahumProfile) {
    // Create patient-therapist relationships
    const relationship1 = await prisma.patientTherapistRelationship.upsert({
      where: {
        patientId_therapistId: {
          patientId: johnProfile.id,
          therapistId: sarahProfile.id,
        },
      },
      update: {},
      create: {
        patientId: johnProfile.id,
        therapistId: sarahProfile.id,
        discipline: 'PT',
        status: 'ACTIVE',
      },
    });
    console.log(`Created relationship: John Doe <-> Dr. Sarah`);

    const relationship2 = await prisma.patientTherapistRelationship.upsert({
      where: {
        patientId_therapistId: {
          patientId: janeProfile.id,
          therapistId: sarahProfile.id,
        },
      },
      update: {},
      create: {
        patientId: janeProfile.id,
        therapistId: sarahProfile.id,
        discipline: 'PT',
        status: 'ACTIVE',
      },
    });
    console.log(`Created relationship: Jane Smith <-> Dr. Sarah`);

    const relationship3 = await prisma.patientTherapistRelationship.upsert({
      where: {
        patientId_therapistId: {
          patientId: nahumProfile.id,
          therapistId: sarahProfile.id,
        },
      },
      update: {},
      create: {
        patientId: nahumProfile.id,
        therapistId: sarahProfile.id,
        discipline: 'PT',
        status: 'ACTIVE',
      },
    });
    console.log(`Created relationship: Nahum <-> Dr. Sarah`);

    // Create Program Episode for John Doe with Dr. Sarah (Week 5 of 12)
    const episode1 = await prisma.programEpisode.upsert({
      where: {
        id: 'demo-episode-john-sarah',
      },
      update: {
        currentWeek: 5,
        status: 'ACTIVE',
        relationshipId: relationship1.id,
      },
      create: {
        id: 'demo-episode-john-sarah',
        patientId: johnProfile.id,
        therapistId: sarahProfile.id,
        relationshipId: relationship1.id,
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
        relationshipId: relationship2.id,
      },
      create: {
        id: 'demo-episode-jane-sarah',
        patientId: janeProfile.id,
        therapistId: sarahProfile.id,
        relationshipId: relationship2.id,
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

    // Initialize milestones for demo episodes
    await initializeEpisodeMilestones(episode1.id, episode1.startDate, episode1.durationWeeks, `${therapist1.firstName} ${therapist1.lastName}`);
    await initializeEpisodeMilestones(episode2.id, episode2.startDate, episode2.durationWeeks, `${therapist1.firstName} ${therapist1.lastName}`);

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
  console.log('  nahum@gmail.com');
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
