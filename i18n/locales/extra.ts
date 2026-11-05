import type { AppLanguage } from '@/contexts/LanguageContext';
import type { PartialMessages } from '../index';
import { ar } from './extra/ar';
import { az } from './extra/az';
import { de } from './extra/de';
import { es } from './extra/es';
import { fr } from './extra/fr';
import { hi } from './extra/hi';
import { id } from './extra/id';
import { it } from './extra/it';
import { ja } from './extra/ja';
import { ko } from './extra/ko';
import { pl } from './extra/pl';
import { pt } from './extra/pt';
import { tr } from './extra/tr';
import { uk } from './extra/uk';
import { zh } from './extra/zh';

/** Languages beyond the four primary ones. Each file mirrors en.ts; missing strings fall back to English. */
export const extraLocales: Partial<Record<AppLanguage, PartialMessages>> = { ar, az, de, es, fr, hi, id, it, ja, ko, pl, pt, tr, uk, zh };
