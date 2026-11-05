/**
 * Date formatting for languages some browsers can't format (Chrome has no
 * Georgian or Armenian date data and almost no Azerbaijani, so Intl silently
 * falls back to English). Output follows full ICU for the option sets the app
 * uses. Native platforms use their own ICU and don't need this.
 */
import { DATE_NAMES } from './dateNames.generated';

type Lang = keyof typeof DATE_NAMES;
export const DATE_FALLBACK_LANGS = new Set<string>(Object.keys(DATE_NAMES));

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateFallback(lang: Lang, d: Date, o: Intl.DateTimeFormatOptions): string {
  const n = DATE_NAMES[lang];
  const day = d.getDate();
  const m = d.getMonth();
  const y = d.getFullYear();
  const wd = d.getDay();
  const W = o.weekday === 'long' ? n.weekdaysLong[wd] : o.weekday === 'narrow' ? n.weekdaysNarrow[wd] : n.weekdaysShort[wd];
  const short = o.month === 'short';
  const M = short ? n.monthsShort[m] : o.day ? n.monthsLong[m] : n.monthsLongStandalone[m];
  let s = '';

  if (lang === 'ka') {
    if (o.day && o.month) s = `${day} ${M}${o.year ? (short ? `. ${y}` : `, ${y}`) : ''}`;
    else if (o.month) s = o.year ? `${M}, ${y}` : M;
    if (o.weekday) s = s ? `${W}, ${s}` : W;
  } else if (lang === 'hy') {
    if (o.day && o.month) {
      if (o.weekday) s = `${M} ${day}, ${W}`;
      else if (short) s = `${day} ${M}${o.year ? `, ${y} թ.` : ''}`;
      else s = o.year ? `${day} ${M}, ${y} թ.` : `${M} ${day}`;
    } else if (o.month) s = o.year ? `${y} թ․ ${M}` : M;
    else if (o.weekday) s = W;
  } else {
    if (o.day && o.month) s = `${day} ${M}${o.year ? ` ${y}` : ''}`;
    else if (o.month) s = o.year ? `${M} ${y}` : M;
    if (o.weekday) s = s ? `${s}, ${W}` : W;
  }

  if (!s && o.year) s = String(y);
  if (o.hour) {
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    s = s ? `${s}, ${time}` : time;
  }
  return s;
}

export const formatTimeFallback = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
