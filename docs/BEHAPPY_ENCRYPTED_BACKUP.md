# Encrypted backup & sync: security design

Optional, **off by default**. Without it BeHappy keeps everything on the
device, as before, and makes no backup requests at all.

Code: `lib/backup/crypto.ts` (cryptography), `lib/backup/collections.ts`
(what is in a backup), `lib/backup/merge.ts` (record-by-record merge),
`lib/backup/engine.ts` (sync), `lib/backup/keyStore*.ts`, `lib/backup/random*.ts`,
`server/backup/index.mjs` (storage), `server/db/migrations/020_encrypted_backup.sql`,
`app/settings/backup.tsx`, `features/backup/BackupBridge.tsx`.

## Threat model

- The server (and anyone with database access, including BeHappy staff) must
  not be able to read backup contents or derive the key.
- A server or attacker must not be able to swap one person's or one object's
  ciphertext for another's undetected, or alter it undetected.
- A damaged, partial or older backup must never delete or overwrite newer data
  on a device.
- Out of scope: a compromised device (malware, someone with the unlocked
  phone/browser profile). On the web the data key is in local storage, like
  the rest of the person's data on that browser.

## Cryptography (audited libraries only)

- Libraries: `@noble/ciphers` 2.4.0 and `@noble/hashes` 2.4.0 (pure
  JavaScript, audited, identical on web, iOS and Android; no WebCrypto vs
  native differences). Randomness: `crypto.getRandomValues` on the web,
  `expo-crypto` (system CSPRNG) on iOS/Android.
- Data key (DEK): 32 random bytes, made on the device that turns backup on.
- Every payload (the snapshot, each artwork image): XChaCha20-Poly1305 with a
  random 24-byte nonce; associated data `behappy-backup|v1|<accountId>|<kind>|<id>`
  binds each box to its account, kind and object.
- Recovery key: 160 random bits + 20-bit checksum, shown as 36 Crockford
  base32 characters (9 groups of 4). It is not a password, so no memory-hard
  KDF is needed: the key-encryption key is HKDF-SHA256(recovery key, random
  16-byte salt). There is deliberately no user-chosen passphrase (it would be
  the weak link and would require scrypt/Argon2 with careful parameters).
- The server stores only the DEK wrapped by that key (`backup_vaults.key_envelope`:
  salt, sealed DEK, a public 16-hex key id). BeHappy never has the recovery key
  and cannot recover it. The app says so before the key is shown, shows it once,
  and requires the last 4 characters before continuing.
- On the device the DEK is kept in the iOS keychain / Android keystore
  (`expo-secure-store`); on the web in local storage. It is excluded from the
  readable export and removed by "Delete all my data".

## What is backed up

Journal entries and draft, Bea conversations, picture-card sessions, art
program progress (read and written as stored; the art therapy itself is not
changed) and saved artwork (images as separate encrypted boxes), mood
check-ins, the event log (sleep, practices…), My Steps and their marks,
programs (with the person's reflections), goals, badges and challenges, daily
reflections, self-checks, meditation and breathing logs, sound favourites and
history, profile, safety plan, reminder preferences, language, focus areas,
the first-launch choice, community topic and safety country.

Never backed up and never changed by a restore (`NEVER_BACKED_UP`): consent
to AI, AI personalisation and memory permissions, the usage-statistics queue,
the sign-in token, push and notification registrations, payment state, the
backup's own state and key. A restore can therefore never widen what the
person agreed to on a device.

## Sync and conflicts

Each store becomes a collection of records with stable ids. A sync downloads
the backup if it has a newer revision, merges three ways (this device, the
backup, and the base kept from the last sync), writes what changed in one
`multiSet`, then uploads the merged snapshot.

- Changed on one side only: that side wins.
- Changed on both: journal entries, card sessions and self-checks keep both
  versions (the older becomes a copy marked `conflictOf`); Bea conversations
  join messages by id in time order; events and badges are joined; small
  records and settings take the newer one and the replaced version goes to a
  list where it can be brought back (`Backup › Replaced while merging`).
- Deleting needs an explicit tombstone (kept 180 days). A record that is merely
  missing from the backup (partial, older or damaged) is never deleted from a
  device. A tombstone loses to an edit made after it.
- First sync of a device: its records without their own timestamp count as
  older than the backup (a fresh install must not overwrite what was backed
  up); anything they replace is listed and can be brought back.
- Concurrency: each upload names the revision it is based on; the server
  commits atomically only if that is still current, else answers 409 and the
  app merges first and retries.
- Uploads are in 1 MB parts; the server lists parts it has, so an interrupted
  upload resumes within the session; a half upload is never committed
  (size + SHA-256 checked). After an app restart a new upload starts; stale
  uploads are deleted after a day.
- Format: `behappy-backup` v1; `readSnapshot` refuses unknown or newer formats
  instead of half-reading them. Future versions migrate in `readSnapshot`.

What this is **not**: real-time sync. Devices exchange changes when a backup
runs (manually, or automatically when the app goes to the background, at most
every 6 hours; 30 minutes after a failure).

## Server

`/api/backup` (registered accounts only, so a new device can sign in):
status, key envelope (create; replace only with an explicit "start over"),
resumable part uploads with commit, part downloads, image boxes, delete.
Quotas per account (env): snapshot 25 MB, one image 8 MB, all images 200 MB.
Nothing is logged except an error name; responses never echo bodies. Deleting
the account deletes every backup row (foreign keys).

## Tests

- `lib/backup/backup.test.mjs`: seal/open, wrong key, other account or object,
  any changed byte, recovery key typos, base64/hex, first restore, one-sided
  and two-sided edits, conversations, deletions vs partial backups, union,
  shared storage keys, consent never included, refused formats.
- `server/test/backup.test.mjs`: registration required, server stores only
  ciphertext and the recovery key opens it, account isolation, interrupted
  upload resume and corrupt uploads, 409 on concurrent commits, a 5 MB image
  and quotas, delete / re-key / account deletion.
- `scripts/qa/journey-e2e.mjs` (real browser, two devices): turn on, key shown
  once, server copy unreadable, wrong key refused, restore, concurrent entries
  on two devices both kept, consent not restored.

## Limitations

- Not verified on physical iPhone/Android devices in this change (SecureStore
  and expo-crypto paths run only in native builds; the web path was tested).
- Large Bea histories: the snapshot is built in memory; tested to a few MB.
- Artwork images are re-read once to fingerprint; very many images make the
  first backup slow.
- Web: the data key lives in the browser profile; anyone with that profile can
  read local data anyway.
