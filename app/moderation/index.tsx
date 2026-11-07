/**
 * The first moderation desk lived here. Moderation now happens in the admin
 * center's queue (reports, the conversation around them, members, review
 * requests), so old links and bookmarks land there.
 */
import { Redirect } from 'expo-router';
import React from 'react';

export default function ModerationDeskRedirect() {
  return <Redirect href={'/admin/moderation' as any} />;
}
