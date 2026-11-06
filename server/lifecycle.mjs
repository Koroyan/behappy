// Extension points shared by the feature modules.
//
// Account deletion: each module that stores something about an account
// (community, professional profile, bookings, messages) registers a hook that
// runs inside the deletion transaction. If any hook fails, nothing is deleted
// and the app is told so, never a silent partial deletion.

const deletionHooks = [];

export function registerAccountDeletionHook(name, fn) {
  if (!deletionHooks.some((h) => h.name === name)) deletionHooks.push({ name, fn });
}

export async function runAccountDeletionHooks(t, accountId, now) {
  for (const hook of deletionHooks) await hook.fn(t, accountId, now);
}
