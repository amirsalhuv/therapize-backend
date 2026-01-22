import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sampleExercises = [
  {
    name: 'Shoulder Flexion',
    nameHe: 'כיפוף כתף',
    description: 'Raise your arm straight forward and up',
    descriptionHe: 'הרימו את הזרוע ישר קדימה ומעלה',
    instructions: '1. Stand upright\n2. Raise arm forward\n3. Hold for 2-3 seconds\n4. Lower slowly',
    instructionsHe: '1. עמדו זקופים\n2. הרימו את הזרוע קדימה\n3. החזיקו 2-3 שניות\n4. הורידו לאט',
    purpose: 'Improves shoulder range of motion and strength',
    purposeHe: 'משפר טווח תנועה וכוח בכתף',
    repetitions: 10,
    sets: 3,
    bodyParts: ['Shoulder'],
    category: 'Mobility',
    difficulty: 2,
    isLibraryExercise: true,
  },
  {
    name: 'Knee Bends',
    nameHe: 'כיפופי ברכיים',
    description: 'Gentle knee flexion and extension',
    descriptionHe: 'כיפוף והרחבה עדינה של הברך',
    instructions: '1. Sit on chair\n2. Slowly bend knee\n3. Straighten leg\n4. Repeat',
    instructionsHe: '1. שבו על כיסא\n2. כופפו את הברך לאט\n3. יישרו את הרגל\n4. חזרו',
    purpose: 'Strengthens quadriceps and improves knee mobility',
    purposeHe: 'מחזק את הקוודריצפס ומשפר ניידות ברך',
    repetitions: 15,
    sets: 2,
    bodyParts: ['Knee', 'Leg'],
    category: 'Strength',
    difficulty: 1,
    isLibraryExercise: true,
  },
  {
    name: 'Ankle Pumps',
    nameHe: 'משאבות קרסול',
    description: 'Move ankle up and down',
    descriptionHe: 'הזיזו את הקרסול מעלה ומטה',
    instructions: '1. Sit or lie down\n2. Point toes forward\n3. Pull toes back\n4. Repeat',
    instructionsHe: '1. שבו או שכבו\n2. כוונו את האצבעות קדימה\n3. משכו את האצבעות אחורה\n4. חזרו',
    purpose: 'Improves circulation and ankle mobility',
    purposeHe: 'משפר זרימת דם וניידות קרסול',
    repetitions: 20,
    sets: 3,
    bodyParts: ['Ankle', 'Foot'],
    category: 'Mobility',
    difficulty: 1,
    isLibraryExercise: true,
  },
  {
    name: 'Wall Push-ups',
    nameHe: 'שכיבות סמיכה על קיר',
    description: 'Modified push-ups against a wall',
    descriptionHe: 'שכיבות סמיכה מותאמות על קיר',
    instructions: '1. Stand facing wall\n2. Place hands on wall\n3. Lean forward\n4. Push back',
    instructionsHe: '1. עמדו מול קיר\n2. הניחו ידיים על הקיר\n3. רכנו קדימה\n4. דחפו אחורה',
    purpose: 'Builds upper body strength with reduced impact',
    purposeHe: 'בונה כוח בגוף העליון עם פחות עומס',
    repetitions: 12,
    sets: 3,
    bodyParts: ['Chest', 'Arms', 'Shoulder'],
    category: 'Strength',
    difficulty: 2,
    isLibraryExercise: true,
  },
  {
    name: 'Seated March',
    nameHe: 'צעידה בישיבה',
    description: 'Lift knees alternately while seated',
    descriptionHe: 'הרימו ברכיים לסירוגין בישיבה',
    instructions: '1. Sit upright in chair\n2. Lift right knee\n3. Lower it\n4. Lift left knee\n5. Repeat',
    instructionsHe: '1. שבו זקוף בכיסא\n2. הרימו ברך ימנית\n3. הורידו\n4. הרימו ברך שמאלית\n5. חזרו',
    purpose: 'Activates hip flexors and improves core stability',
    purposeHe: 'מפעיל מכופפי ירך ומשפר יציבות ליבה',
    repetitions: 10,
    sets: 2,
    durationMinutes: 5,
    bodyParts: ['Hip', 'Core'],
    category: 'Cardio',
    difficulty: 1,
    isLibraryExercise: true,
  },
  {
    name: 'Heel Slides',
    nameHe: 'החלקות עקב',
    description: 'Slide heel towards buttocks',
    descriptionHe: 'החליקו עקב לכיוון הישבן',
    instructions: '1. Lie on back\n2. Slide heel toward buttocks\n3. Keep heel on surface\n4. Return to start',
    instructionsHe: '1. שכבו על הגב\n2. החליקו עקב לכיוון ישבן\n3. שמרו על עקב על פני השטח\n4. חזרו למצב התחלתי',
    purpose: 'Improves knee flexion and hamstring flexibility',
    purposeHe: 'משפר כיפוף ברך וגמישות שרירי ירך אחוריים',
    repetitions: 15,
    sets: 3,
    bodyParts: ['Knee', 'Leg'],
    category: 'Mobility',
    difficulty: 1,
    isLibraryExercise: true,
  },
  {
    name: 'Deep Breathing',
    nameHe: 'נשימות עמוקות',
    description: 'Controlled breathing exercise',
    descriptionHe: 'תרגיל נשימה מבוקרת',
    instructions: '1. Sit comfortably\n2. Breathe in slowly through nose\n3. Hold for 3 seconds\n4. Exhale slowly',
    instructionsHe: '1. שבו בנוחות\n2. שאפו לאט דרך האף\n3. החזיקו 3 שניות\n4. נשפו לאט',
    purpose: 'Promotes relaxation and improves oxygen flow',
    purposeHe: 'מקדם הרפיה ומשפר זרימת חמצן',
    repetitions: 10,
    sets: 1,
    durationMinutes: 3,
    bodyParts: ['Chest'],
    category: 'Breathing',
    difficulty: 1,
    isLibraryExercise: true,
  },
  {
    name: 'Hip Abduction',
    nameHe: 'היפוך ירך',
    description: 'Lift leg out to the side',
    descriptionHe: 'הרימו רגל הצידה',
    instructions: '1. Stand holding support\n2. Lift leg sideways\n3. Keep body straight\n4. Lower slowly',
    instructionsHe: '1. עמדו בעזרת תמיכה\n2. הרימו רגל הצידה\n3. שמרו על גוף ישר\n4. הורידו לאט',
    purpose: 'Strengthens hip abductor muscles',
    purposeHe: 'מחזק שרירי מרחיקים של הירך',
    repetitions: 12,
    sets: 3,
    bodyParts: ['Hip', 'Leg'],
    category: 'Strength',
    difficulty: 2,
    isLibraryExercise: true,
  },
];

async function main() {
  console.log('Seeding library exercises...\n');

  for (const exercise of sampleExercises) {
    const created = await prisma.exercise.create({
      data: exercise,
    });
    console.log(`✓ Created: ${created.name}`);
  }

  const count = await prisma.exercise.count({ where: { isLibraryExercise: true } });
  console.log(`\n✅ Seeded ${count} library exercises`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
