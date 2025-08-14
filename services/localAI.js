export const generateAIInsights = (sessionHistory) => {
  if (!sessionHistory) return [];

  const sessions = JSON.parse(sessionHistory);

  // Example analysis logic
  const insights = sessions.map((session) => {
    return {
      sessionId: session.sessionId,
      recommendation: `Focus on improving ${session.keyInsights[0] || 'your main challenge'}.`,
    };
  });

  return insights;
};
