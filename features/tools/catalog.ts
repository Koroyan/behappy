/**
 * Every self-help tool in one list, shared by the Tools tab, the tools strip
 * on Today and search. Titles reuse the existing Explore strings, so a tool
 * has the same name everywhere.
 */
import type { IconName } from '@/design';

export type ToolTone = 'primary' | 'peach' | 'lavender' | 'gold' | 'sage' | 'danger' | 'muted';
export type ToolSection = 'calm' | 'grow' | 'create' | 'understand' | 'professional' | 'safety';

export interface Tool {
  key: string;
  icon: IconName;
  tone: ToolTone;
  route: string;
  section: ToolSection;
  title: string;
  subtitle: string;
  /** Shown only when this platform feature is switched on. */
  flag?: 'wellbeingSummary';
}

const explore = (key: string) => ({ title: `explore.items.${key}.title`, subtitle: `explore.items.${key}.subtitle` });
const wb = (key: string) => ({ title: `wb.tools.${key}.title`, subtitle: `wb.tools.${key}.subtitle` });

export const TOOLS: Tool[] = [
  { key: 'breathing', icon: 'leaf-outline', tone: 'sage', route: '/breathing', section: 'calm', ...explore('breathing') },
  { key: 'meditation', icon: 'flower-outline', tone: 'lavender', route: '/meditation', section: 'calm', ...explore('meditation') },
  { key: 'grounding', icon: 'hand-left-outline', tone: 'primary', route: '/grounding', section: 'calm', ...explore('grounding') },
  { key: 'calm', icon: 'water-outline', tone: 'sage', route: '/calm', section: 'calm', ...wb('calm') },
  { key: 'sound', icon: 'musical-notes-outline', tone: 'lavender', route: '/sound', section: 'calm', ...wb('sound') },
  { key: 'sleep', icon: 'moon-outline', tone: 'lavender', route: '/sleep', section: 'calm', ...wb('sleep') },
  { key: 'steps', icon: 'footsteps-outline', tone: 'primary', route: '/steps', section: 'grow', ...wb('steps') },
  { key: 'badges', icon: 'ribbon-outline', tone: 'gold', route: '/badges', section: 'grow', ...wb('badges') },
  { key: 'reflection', icon: 'sparkles-outline', tone: 'peach', route: '/reflection', section: 'grow', ...wb('reflection') },
  { key: 'cards', icon: 'albums-outline', tone: 'gold', route: '/cards', section: 'create', ...explore('cards') },
  { key: 'art', icon: 'color-palette-outline', tone: 'peach', route: '/art', section: 'create', ...explore('art') },
  { key: 'journal', icon: 'book-outline', tone: 'lavender', route: '/journal', section: 'create', ...explore('journal') },
  { key: 'anulia', icon: 'chatbubble-ellipses-outline', tone: 'primary', route: '/anulia', section: 'create', ...explore('anulia') },
  { key: 'assessments', icon: 'clipboard-outline', tone: 'primary', route: '/assessments', section: 'understand', ...explore('assessments') },
  { key: 'insights', icon: 'analytics-outline', tone: 'sage', route: '/insights', section: 'understand', ...explore('insights') },
  { key: 'goals', icon: 'flag-outline', tone: 'gold', route: '/goals', section: 'grow', ...explore('goals') },
  { key: 'memory', icon: 'bookmark-outline', tone: 'primary', route: '/anulia/memory', section: 'understand', ...wb('memory') },
  { key: 'summary', icon: 'document-text-outline', tone: 'lavender', route: '/wellbeing-summary', section: 'understand', title: 'tools.summaryTitle', subtitle: 'tools.summarySub', flag: 'wellbeingSummary' },
  { key: 'specialists', icon: 'medkit-outline', tone: 'primary', route: '/specialists', section: 'professional', title: 'tools.specialistsTitle', subtitle: 'tools.specialistsSub' },
  { key: 'appointments', icon: 'calendar-outline', tone: 'sage', route: '/appointments', section: 'professional', title: 'tools.appointmentsTitle', subtitle: 'tools.appointmentsSub' },
  { key: 'messages', icon: 'mail-outline', tone: 'lavender', route: '/messages', section: 'professional', title: 'tools.messagesTitle', subtitle: 'tools.messagesSub' },
  { key: 'safety', icon: 'heart-circle-outline', tone: 'danger', route: '/safety', section: 'safety', ...explore('safety') },
  { key: 'safetyPlan', icon: 'shield-checkmark-outline', tone: 'sage', route: '/safety-plan', section: 'safety', ...explore('safetyPlan') },
];

/** Quick ways in, for the moment someone opens the tab. */
export const QUICK: { key: string; icon: IconName; route: string; label: string; tool: string }[] = [
  { key: 'calm', icon: 'water-outline', route: '/calm', label: 'wb.today.calm', tool: 'calm' },
  { key: 'breathe', icon: 'leaf-outline', route: '/breathing', label: 'tools.quickBreathe', tool: 'breathing' },
  { key: 'card', icon: 'albums-outline', route: '/cards', label: 'tools.quickCard', tool: 'cards' },
  { key: 'ground', icon: 'hand-left-outline', route: '/grounding', label: 'tools.quickGround', tool: 'grounding' },
  { key: 'write', icon: 'create-outline', route: '/journal/editor', label: 'tools.quickWrite', tool: 'journal' },
  { key: 'talk', icon: 'chatbubble-ellipses-outline', route: '/anulia', label: 'tools.quickTalk', tool: 'anulia' },
];

/** The strip on Today: the tools people look for most. */
export const TODAY_TOOLS = ['cards', 'art', 'sound', 'breathing', 'journal', 'steps', 'meditation', 'grounding'];

export const TONE_BG: Record<ToolTone, 'primarySoft' | 'peachSoft' | 'lavenderSoft' | 'goldSoft' | 'sageSoft' | 'dangerSoft' | 'surfaceMuted'> = {
  primary: 'primarySoft',
  peach: 'peachSoft',
  lavender: 'lavenderSoft',
  gold: 'goldSoft',
  sage: 'sageSoft',
  danger: 'dangerSoft',
  muted: 'surfaceMuted',
};
export const TONE_FG: Record<ToolTone, 'onPrimarySoft' | 'onPeachSoft' | 'onLavenderSoft' | 'onGoldSoft' | 'onDangerSoft' | 'textSecondary'> = {
  primary: 'onPrimarySoft',
  peach: 'onPeachSoft',
  lavender: 'onLavenderSoft',
  gold: 'onGoldSoft',
  sage: 'onPrimarySoft',
  danger: 'onDangerSoft',
  muted: 'textSecondary',
};
