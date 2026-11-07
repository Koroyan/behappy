/**
 * Explore became the Tools tab (search, quick ways in, every tool by
 * purpose). Old links and bookmarks to /explore land there.
 */
import { Redirect } from 'expo-router';
import React from 'react';

export default function ExploreRedirect() {
  return <Redirect href={'/tools' as any} />;
}
