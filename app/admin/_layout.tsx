import { Slot } from 'expo-router';
import React from 'react';

import { AdminProvider } from '@/features/admin/AdminProvider';
import { AdminShell } from '@/features/admin/AdminShell';

/** The admin center: its own navigation, gates and prompts around every admin page. */
export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminShell>
        <Slot />
      </AdminShell>
    </AdminProvider>
  );
}
