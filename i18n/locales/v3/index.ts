/**
 * 3.0 translations per language. Each file covers only the namespaces added
 * in 3.0 and is merged over that language's 2.0 catalog; anything missing
 * falls back to English key by key, like the rest of the app.
 */
import type { AppLanguage } from '@/contexts/LanguageContext';

import type { PartialMessages } from '../../index';
import { az3 } from './az';
import { hy3 } from './hy';
import { ka3 } from './ka';
import { ru3 } from './ru';
import { tr3 } from './tr';
import { uk3 } from './uk';

export const v3Locales: Partial<Record<AppLanguage, PartialMessages>> = { az: az3, hy: hy3, ka: ka3, ru: ru3, tr: tr3, uk: uk3 };
