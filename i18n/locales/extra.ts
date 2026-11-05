import type { AppLanguage } from '@/contexts/LanguageContext';

import type { PartialMessages } from '../index';
import { az } from './extra/az';
import { de } from './extra/de';
import { es } from './extra/es';
import { fr } from './extra/fr';
import { id } from './extra/id';
import { it } from './extra/it';
import { pl } from './extra/pl';
import { pt } from './extra/pt';
import { tr } from './extra/tr';
import { uk } from './extra/uk';

/** Languages beyond the four primary ones. Each file mirrors en.ts; missing strings fall back to English. */
export const extraLocales: Partial<Record<AppLanguage, PartialMessages>> = { az, de, es, fr, id, it, pl, pt, tr, uk };
