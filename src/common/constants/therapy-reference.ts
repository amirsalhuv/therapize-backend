export const BODY_PARTS = [
  'Upper Extremity',
  'Lower Extremity',
  'Lower Back',
  'Upper Back',
  'Neck',
  'Shoulder',
  'Hip',
  'Knee',
  'Ankle',
  'Wrist',
  'Hand',
  'Core',
  'Full Body',
] as const;

export const CONDITIONS = [
  // Neurological
  'Stroke Recovery',
  'Hemiplegia',
  "Parkinson's Disease",
  'Multiple Sclerosis',
  'Traumatic Brain Injury',
  'Spinal Cord Injury',
  // Orthopedic
  'Lower Back Pain',
  'Neck Pain',
  'Shoulder Injury',
  'Knee Rehabilitation',
  'Post-Surgery Recovery',
  'Arthritis',
  'Fracture Recovery',
  'Rotator Cuff Injury',
  'ACL Reconstruction',
  'Hip Replacement',
  // Other
  'Balance Disorders',
  'Fall Prevention',
  'Chronic Pain',
  'Sports Injury',
  'Fibromyalgia',
  'Osteoporosis',
] as const;

export const CATEGORIES = [
  'Orthopedic',
  'Neurological',
  'Geriatric',
  'Pediatric',
  'Sports Medicine',
  "Women's Health",
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];
export type Condition = (typeof CONDITIONS)[number];
export type Category = (typeof CATEGORIES)[number];
