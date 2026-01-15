import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Locale } from '../i18n.service';

/**
 * Parameter decorator to extract the current locale from the request
 * Priority: 1. Accept-Language header, 2. User profile locale, 3. Default (EN)
 *
 * Usage in controllers:
 * @Get('templates')
 * async getTemplates(@CurrentLocale() locale: Locale) {
 *   return this.service.getAll(locale);
 * }
 */
export const CurrentLocale = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Locale => {
    const request = ctx.switchToHttp().getRequest();

    // Check Accept-Language header first
    const acceptLanguage = request.headers['accept-language'];
    if (acceptLanguage) {
      const lang = acceptLanguage.split(',')[0].split('-')[0].toUpperCase();
      if (lang === 'HE') return 'HE';
    }

    // Check user profile locale (from JWT payload)
    if (request.user?.locale) {
      return request.user.locale as Locale;
    }

    // Default to English
    return 'EN';
  },
);
