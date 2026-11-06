/**
 * 3.0 translations per language. Each file covers only the namespaces added
 * in 3.0 and is merged over that language's 2.0 catalog; anything missing
 * falls back to English key by key, like the rest of the app.
 */
import type { AppLanguage } from '@/contexts/LanguageContext';

import type { PartialMessages } from '../../index';
import { az3 } from './az';
import { de3 } from './de';
import { es3 } from './es';
import { fr3 } from './fr';
import { hy3 } from './hy';
import { id3 } from './id';
import { it3 } from './it';
import { ja3 } from './ja';
import { ka3 } from './ka';
import { ko3 } from './ko';
import { pl3 } from './pl';
import { pt3 } from './pt';
import { ru3 } from './ru';
import { tr3 } from './tr';
import { uk3 } from './uk';

export const v3Locales: Partial<Record<AppLanguage, PartialMessages>> = { az: az3, de: de3, es: es3, fr: fr3, hy: hy3, id: id3, it: it3, ja: ja3, ka: ka3, ko: ko3, pl: pl3, pt: pt3, ru: ru3, tr: tr3, uk: uk3 };
