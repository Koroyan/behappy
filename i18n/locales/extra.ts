import type { AppLanguage } from '@/contexts/LanguageContext';

import type { PartialMessages } from '../index';
import { de } from './extra/de';

/** Languages beyond the four primary ones. Each file mirrors en.ts; missing strings fall back to English. */
export const extraLocales: Partial<Record<AppLanguage, PartialMessages>> = { de };
