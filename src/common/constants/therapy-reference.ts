export interface BilingualItem {
  en: string;
  he: string;
}

export const BODY_PARTS: BilingualItem[] = [
  { en: 'Upper Extremity', he: 'גפה עליונה' },
  { en: 'Lower Extremity', he: 'גפה תחתונה' },
  { en: 'Lower Back', he: 'גב תחתון' },
  { en: 'Upper Back', he: 'גב עליון' },
  { en: 'Neck', he: 'צוואר' },
  { en: 'Shoulder', he: 'כתף' },
  { en: 'Hip', he: 'ירך' },
  { en: 'Knee', he: 'ברך' },
  { en: 'Ankle', he: 'קרסול' },
  { en: 'Wrist', he: 'שורש כף היד' },
  { en: 'Hand', he: 'כף יד' },
  { en: 'Core', he: 'ליבה' },
  { en: 'Full Body', he: 'כל הגוף' },
];

export const CONDITIONS: BilingualItem[] = [
  // Neurological
  { en: 'Stroke Recovery', he: 'החלמה משבץ' },
  { en: 'Hemiplegia', he: 'המיפלגיה' },
  { en: "Parkinson's Disease", he: 'מחלת פרקינסון' },
  { en: 'Multiple Sclerosis', he: 'טרשת נפוצה' },
  { en: 'Traumatic Brain Injury', he: 'פגיעת ראש טראומטית' },
  { en: 'Spinal Cord Injury', he: 'פגיעת חוט שדרה' },
  // Orthopedic
  { en: 'Lower Back Pain', he: 'כאבי גב תחתון' },
  { en: 'Neck Pain', he: 'כאבי צוואר' },
  { en: 'Shoulder Injury', he: 'פגיעת כתף' },
  { en: 'Knee Rehabilitation', he: 'שיקום ברך' },
  { en: 'Post-Surgery Recovery', he: 'החלמה לאחר ניתוח' },
  { en: 'Arthritis', he: 'דלקת מפרקים' },
  { en: 'Fracture Recovery', he: 'החלמה משבר' },
  { en: 'Rotator Cuff Injury', he: 'פגיעת שרוול מסובב' },
  { en: 'ACL Reconstruction', he: 'שחזור רצועה צולבת' },
  { en: 'Hip Replacement', he: 'החלפת מפרק ירך' },
  // Other
  { en: 'Balance Disorders', he: 'הפרעות שיווי משקל' },
  { en: 'Fall Prevention', he: 'מניעת נפילות' },
  { en: 'Chronic Pain', he: 'כאב כרוני' },
  { en: 'Sports Injury', he: 'פציעת ספורט' },
  { en: 'Fibromyalgia', he: 'פיברומיאלגיה' },
  { en: 'Osteoporosis', he: 'אוסטאופורוזיס' },
];

export const CATEGORIES: BilingualItem[] = [
  { en: 'Orthopedic', he: 'אורתופדי' },
  { en: 'Neurological', he: 'נוירולוגי' },
  { en: 'Geriatric', he: 'גריאטרי' },
  { en: 'Pediatric', he: 'ילדים' },
  { en: 'Sports Medicine', he: 'רפואת ספורט' },
  { en: "Women's Health", he: 'בריאות האישה' },
];

export type BodyPart = string;
export type Condition = string;
export type Category = string;
