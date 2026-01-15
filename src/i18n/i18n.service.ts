import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type Locale = 'EN' | 'HE';

@Injectable()
export class I18nService implements OnModuleInit {
  private translations: Record<string, Record<string, Record<string, string>>> = {};

  onModuleInit() {
    this.loadTranslations();
  }

  private loadTranslations() {
    const locales = ['en', 'he'];
    const namespaces = ['errors', 'notifications'];

    for (const locale of locales) {
      this.translations[locale] = {};
      for (const ns of namespaces) {
        const filePath = path.join(__dirname, 'translations', locale, `${ns}.json`);
        if (fs.existsSync(filePath)) {
          try {
            this.translations[locale][ns] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          } catch (error) {
            console.warn(`Failed to load translation file: ${filePath}`);
          }
        }
      }
    }
  }

  /**
   * Translate a key to the specified locale
   * @param key - Translation key in format "namespace.key" (e.g., "errors.emailAlreadyRegistered")
   * @param locale - Target locale (EN or HE)
   * @param params - Optional parameters for interpolation
   */
  translate(key: string, locale: Locale, params?: Record<string, string | number>): string {
    const lang = locale.toLowerCase();
    const [namespace, ...keyParts] = key.split('.');
    const actualKey = keyParts.join('.');

    let translation = this.translations[lang]?.[namespace]?.[actualKey];

    // Fallback to English
    if (!translation) {
      translation = this.translations['en']?.[namespace]?.[actualKey] || key;
    }

    // Parameter interpolation (e.g., "Hello {{name}}" with { name: "John" })
    if (params && translation) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      });
    }

    return translation;
  }

  /**
   * Get localized field from an entity that has *He suffix fields
   * @param entity - Entity with localized fields (e.g., { name: "Exercise", nameHe: "תרגיל" })
   * @param field - Base field name (e.g., "name")
   * @param locale - Target locale
   */
  localizeField<T extends Record<string, unknown>>(
    entity: T,
    field: string,
    locale: Locale,
  ): string | null {
    if (locale === 'HE') {
      const heField = `${field}He`;
      const heValue = entity[heField];
      if (heValue && typeof heValue === 'string') {
        return heValue;
      }
    }
    const value = entity[field];
    return typeof value === 'string' ? value : null;
  }
}
