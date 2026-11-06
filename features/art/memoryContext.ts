/**
 * Longitudinal context for art sessions, moved verbatim from the pre-2.0
 * session screen: a short internal summary of completed sessions (themes,
 * emotions, safety notes) that helps the model stay attuned across sessions.
 */
import ArtTherapyProgramManager from '@/services/artTherapyProgramNew';
import type { ArtTherapyResponse } from '@/services/artTherapyService';

export async function buildMemoryContext(): Promise<string> {
  try {
    const progressMap = await ArtTherapyProgramManager.getProgress();
    const entries = Array.from(progressMap.entries())
      .map(([id, prog]) => ({ id, prog }))
      .filter(e => e.prog.completed && e.prog.clinicalSummary);
    if (entries.length === 0) return '';

    // Sort by completion date ascending
    entries.sort((a, b) => {
      const at = a.prog.completedAt ? new Date(a.prog.completedAt).getTime() : 0;
      const bt = b.prog.completedAt ? new Date(b.prog.completedAt).getTime() : 0;
      return at - bt;
    });

    // Build detailed clinical history (last 3-5 sessions)
    const recent = entries.slice(-5);
    const sessionDetails: string[] = [];
    recent.forEach(e => {
      const cs: ArtTherapyResponse = e.prog.clinicalSummary!;
      const dateStr = e.prog.completedAt ? new Date(e.prog.completedAt).toISOString().split('T')[0] : 'unknown';
      const emotions = cs.clinical_insights.emotional_indicators.detected_emotions.slice(0, 4).join(', ') || 'none';
      const themes = cs.clinical_insights.psychological_themes.slice(0, 4).join(', ') || 'none';
      const shift = cs.progress_tracking?.emotional_shift || '';
      const insight = cs.progress_tracking?.insight_gained || '';
      sessionDetails.push(`Session ${e.id} (${dateStr}):\n  Emotions: ${emotions}\n  Themes: ${themes}\n  Emotional shift: ${shift}\n  Key insight: ${insight}`);
    });

    // Get most recent session summary if available
    const lastSession = recent[recent.length - 1];
    const lastSummary = lastSession?.prog.clinicalSummary?.session_summary || '';

    // Collect recurring patterns across all sessions
    const allThemes = entries.flatMap(e => e.prog.clinicalSummary!.clinical_insights.psychological_themes);
    const allEmotions = entries.flatMap(e => e.prog.clinicalSummary!.clinical_insights.emotional_indicators.detected_emotions);
    const recurringThemes = Array.from(new Set(allThemes)).slice(0, 8);
    const recurringEmotions = Array.from(new Set(allEmotions)).slice(0, 8);

    // Check for any safety concerns in history
    const safetyConcerns = entries
      .filter(e => {
        const risk = e.prog.clinicalSummary?.safety_assessment?.risk_level;
        return risk && risk !== 'none' && risk !== 'low';
      })
      .map(e => {
        const risk = e.prog.clinicalSummary!.safety_assessment.risk_level;
        const concerns = e.prog.clinicalSummary!.safety_assessment.concerning_imagery;
        return `Session ${e.id}: ${risk} risk${concerns.length > 0 ? ' (' + concerns.join(', ') + ')' : ''}`;
      });

    // Analyze progress trajectory (subtle insights for AI awareness)
    let progressNote = '';
    if (recent.length >= 2) {
      const recentShifts = recent.map(e => e.prog.clinicalSummary?.progress_tracking?.emotional_shift || '').filter(s => s);
      const recentAlliance = recent.map(e => e.prog.clinicalSummary?.progress_tracking?.therapeutic_alliance || '').filter(a => a);
      if (recentShifts.length > 0) {
        progressNote = `Recent emotional shifts: ${recentShifts.slice(-3).join(' → ')}`;
      }
      if (recentAlliance.length > 0) {
        progressNote += `\nComfort with the exercise (recent): ${recentAlliance.slice(-3).join(' → ')}`;
      }
    }

    // Professional clinical context: AI knows everything but stays present-focused
    return `[CLINICAL CONTEXT - Internal Reference Only]
Total Sessions: ${entries.length}

Recent Session History:
${sessionDetails.join('\n\n')}

Recurring Patterns Across All Sessions:
- Themes: ${recurringThemes.join(', ')}
- Emotions: ${recurringEmotions.join(', ')}

Last Session Summary: ${lastSummary}
${safetyConcerns.length > 0 ? `\nPrevious Safety Concerns:\n${safetyConcerns.join('\n')}` : ''}
${progressNote ? `\n${progressNote}` : ''}

[INSTRUCTION]
Use this context only for warmth and continuity. It is background, not a record to analyse.
- Stay present-focused on THIS session's image and current feelings
- Do NOT ask comparative questions about previous sessions unless the person brings them up
- Let earlier sessions inform your understanding and tone, not your questions
- Don't say "in previous sessions you..." and never draw conclusions about the person from patterns
- Keep continuity while respecting each session's independence
- Notice changes in safety concerns, and follow the safety rules if risk appears
- Avoid repeating questions that were already explored in earlier sessions
- Use awareness of recurring themes to ask more attuned questions about THIS session's material`;
  } catch (e) {
    console.warn('Memory context build failed:', e);
    return '';
  }
}
