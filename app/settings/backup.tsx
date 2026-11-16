/**
 * Privacy › Encrypted backup & sync. Off by default; BeHappy works fully
 * without it, with everything kept on this device.
 *
 * - Turning it on makes a recovery key here; it is shown once, and the person
 *   confirms they saved it. BeHappy never has it and can't recover it.
 * - A new device (or a cleared browser) signs in and enters the recovery key:
 *   the backup is merged into the device, nothing newer is overwritten.
 * - Back up now, automatic backups, last backup time, storage used, versions
 *   that lost a conflict (one tap brings them back), turning it off here,
 *   deleting the backup.
 * Consent to AI, memory and statistics is never in a backup.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { AppText, Banner, Button, Card, Divider, Icon, ListRow, ProgressBar, Screen, SectionHeader, space, TextField, ToggleRow, useFeedback, useTheme } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { BackupLocal, BackupPhase, BACKUP_TOPIC, deleteBackup, dismissReplaced, enableBackup, getServerStatus, loadBackupLocal, restoreReplaced, ServerStatus, setAutoBackup, syncNow, turnOffOnThisDevice, unlockBackup } from '@/lib/backup/engine';
import { subscribe } from '@/lib/storage/json';

const MB = 1024 * 1024;

export default function BackupScreen() {
  const router = useRouter();
  const { t, formatDate, formatTime } = useT();
  const { colors } = useTheme();
  const { confirm, toast } = useFeedback();
  const identity = useIdentity();
  const { me } = useAccount();
  const [local, setLocal] = useState<BackupLocal | null>(null);
  const [server, setServer] = useState<ServerStatus | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [typedKey, setTypedKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ phase: BackupPhase; done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    loadBackupLocal().then(setLocal).catch(() => {});
    if (!identity.registered) return;
    getServerStatus()
      .then((s) => {
        setServer(s);
        setServerError(null);
      })
      .catch(() => setServerError('offline'));
  }, [identity.registered]);
  useFocusEffect(refresh);
  useEffect(() => subscribe(BACKUP_TOPIC, () => loadBackupLocal().then(setLocal).catch(() => {})), []);

  const accountId = me?.accountId || '';
  const when = (ms: number) => `${formatDate(ms, { day: 'numeric', month: 'long' })}, ${formatTime(ms)}`;
  const errorText = (code: string) => t(`jr.backup.errors.${code}`) === `jr.backup.errors.${code}` ? t('jr.backup.errors.server') : t(`jr.backup.errors.${code}`);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (done) toast(done);
    } catch (e) {
      setError((e as { code?: string })?.code || 'server');
    } finally {
      setBusy(false);
      setProgress(null);
      refresh();
    }
  };

  const backUp = () =>
    run(async () => {
      const r = await syncNow(setProgress);
      if (r.replaced) toast(t('jr.backup.replacedToast', { n: r.replaced }));
    }, t('jr.backup.done'));

  const turnOn = async (replace = false) => {
    if (replace) {
      const ok = await confirm({ title: t('jr.backup.newKeyTitle'), body: t('jr.backup.newKeyBody'), confirmLabel: t('jr.backup.newKeyCta'), destructive: true });
      if (!ok) return;
    }
    await run(async () => {
      setRecoveryKey(await enableBackup(accountId, { replace }));
      setSaved(false);
      setConfirmText('');
    });
  };

  const finishSetup = () => {
    setRecoveryKey(null);
    backUp();
  };

  const restore = () =>
    run(async () => {
      await unlockBackup(accountId, typedKey);
      setTypedKey('');
      const r = await syncNow(setProgress);
      if (r.replaced) toast(t('jr.backup.replacedToast', { n: r.replaced }));
    }, t('jr.backup.restored'));

  const removeBackup = async () => {
    const ok = await confirm({ title: t('jr.backup.deleteTitle'), body: t('jr.backup.deleteBody'), confirmLabel: t('jr.backup.deleteCta'), destructive: true });
    if (ok) await run(() => deleteBackup(), t('jr.backup.deleted'));
  };

  const offHere = async () => {
    const ok = await confirm({ title: t('jr.backup.offTitle'), body: t('jr.backup.offBody'), confirmLabel: t('jr.backup.offCta') });
    if (ok) await run(() => turnOffOnThisDevice());
  };

  const shareKey = async () => {
    if (!recoveryKey) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(recoveryKey).then(() => toast(t('jr.backup.copied')), () => toast(t('jr.backup.copyFailed')));
    } else {
      await Share.share({ message: `${t('jr.backup.keyShareLabel')}\n${recoveryKey}` }).catch(() => {});
    }
  };

  const progressBar = progress ? (
    <View style={{ gap: 6 }} testID="backup-progress">
      <AppText variant="small" color="textSecondary">
        {t(`jr.backup.phases.${progress.phase}`)}
        {progress.total > 1 ? ` · ${progress.done}/${progress.total}` : ''}
      </AppText>
      <ProgressBar value={progress.total ? progress.done / progress.total : 0} label={t(`jr.backup.phases.${progress.phase}`)} />
    </View>
  ) : null;

  const howItWorks = (
    <Card tone="muted" padding={18}>
      <AppText variant="smallStrong">{t('jr.backup.howTitle')}</AppText>
      <View style={{ gap: 8, marginTop: space[2] }}>
        {(['how1', 'how2', 'how3', 'how4'] as const).map((k) => (
          <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
            <Icon name="checkmark-circle-outline" size={18} color="brand" />
            <AppText variant="small" style={{ flex: 1 }}>
              {t(`jr.backup.${k}`)}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="smallStrong" style={{ marginTop: space[3] }}>
        {t('jr.backup.includedTitle')}
      </AppText>
      <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
        {t('jr.backup.included')}
      </AppText>
      <AppText variant="small" color="textSecondary" style={{ marginTop: 6 }}>
        {t('jr.backup.notIncluded')}
      </AppText>
    </Card>
  );

  let body: React.ReactNode;
  if (!identity.registered) {
    body = (
      <View style={{ gap: space[4] }}>
        <Banner tone="info" icon="person-add-outline" body={t('jr.backup.needAccount')} />
        <AccountGate returnTo="/settings/backup" />
        {howItWorks}
      </View>
    );
  } else if (recoveryKey) {
    const last = recoveryKey.slice(-4);
    body = (
      <View style={{ gap: space[4] }} testID="backup-key-step">
        <Card tone="gold" padding={20}>
          <AppText variant="title3">{t('jr.backup.keyTitle')}</AppText>
          <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            {t('jr.backup.keyBody')}
          </AppText>
          <View style={{ marginTop: space[4], padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <AppText variant="title3" selectable style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' }), letterSpacing: 1, textAlign: 'center' }} testID="backup-recovery-key">
              {recoveryKey}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: space[3], flexWrap: 'wrap' }}>
            <Button label={Platform.OS === 'web' ? t('jr.backup.copy') : t('jr.backup.save')} icon={Platform.OS === 'web' ? 'copy-outline' : 'share-outline'} size="sm" variant="secondary" onPress={shareKey} />
          </View>
          <AppText variant="caption" color="textSecondary" style={{ marginTop: space[3] }}>
            {t('jr.backup.keyWarning')}
          </AppText>
        </Card>
        <ToggleRow value={saved} onValueChange={setSaved} label={t('jr.backup.keySaved')} testID="backup-key-saved" />
        <TextField label={t('jr.backup.keyConfirm')} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} maxLength={4} testID="backup-key-confirm" />
        <Button label={t('jr.backup.keyContinue')} onPress={finishSetup} disabled={!saved || confirmText.trim().toUpperCase() !== last} fullWidth testID="backup-key-continue" />
      </View>
    );
  } else if (!local?.enabled && server?.enabled) {
    // A backup exists for this account, but this device has no key: restore with the recovery key.
    body = (
      <View style={{ gap: space[4] }} testID="backup-restore-step">
        <Card padding={20}>
          <AppText variant="title3">{t('jr.backup.restoreTitle')}</AppText>
          <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            {server.updatedAt ? t('jr.backup.restoreBody', { when: when(server.updatedAt) }) : t('jr.backup.restoreBodyEmpty')}
          </AppText>
          <TextField label={t('jr.backup.enterKey')} value={typedKey} onChangeText={setTypedKey} autoCapitalize="characters" autoCorrect={false} placeholder="XXXX-XXXX-…" containerStyle={{ marginTop: space[4] }} testID="backup-enter-key" />
          <Button label={t('jr.backup.restoreCta')} icon="cloud-download-outline" onPress={restore} loading={busy} disabled={typedKey.replace(/[\s-]/g, '').length < 36} style={{ marginTop: space[3], alignSelf: 'flex-start' }} testID="backup-restore" />
          <AppText variant="caption" color="textSecondary" style={{ marginTop: space[3] }}>
            {t('jr.backup.restoreNote')}
          </AppText>
        </Card>
        {progressBar}
        <Card tone="muted" padding={16}>
          <AppText variant="smallStrong">{t('jr.backup.lostKeyTitle')}</AppText>
          <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            {t('jr.backup.lostKeyBody')}
          </AppText>
          <Button label={t('jr.backup.newKeyCta')} size="sm" variant="ghost" onPress={() => turnOn(true)} style={{ alignSelf: 'flex-start', marginTop: space[2] }} testID="backup-new-key" />
        </Card>
        {howItWorks}
      </View>
    );
  } else if (!local?.enabled) {
    body = (
      <View style={{ gap: space[4] }} testID="backup-off">
        <Card padding={20}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="cloud-offline-outline" size={24} color="textSecondary" />
            <AppText variant="title3" style={{ flex: 1 }}>
              {t('jr.backup.offStatus')}
            </AppText>
          </View>
          <AppText variant="small" color="textSecondary" style={{ marginTop: space[2] }}>
            {t('jr.backup.offBodyIntro')}
          </AppText>
          <Button label={t('jr.backup.turnOn')} icon="lock-closed-outline" onPress={() => turnOn(false)} loading={busy} disabled={!server && !serverError} style={{ marginTop: space[4], alignSelf: 'flex-start' }} testID="backup-turn-on" />
        </Card>
        {howItWorks}
      </View>
    );
  } else {
    const used = (server?.size || 0) + (server?.quota.blobsUsed || 0);
    const cap = (server?.quota.snapshotMax || 0) + (server?.quota.blobsMax || 0);
    body = (
      <View style={{ gap: space[4] }} testID="backup-on">
        <Card padding={20}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="cloud-done-outline" size={24} color="brand" />
            <View style={{ flex: 1 }}>
              <AppText variant="title3">{t('jr.backup.onStatus')}</AppText>
              <AppText variant="small" color="textSecondary" testID="backup-last">
                {local.lastBackupAt ? t('jr.backup.last', { when: when(local.lastBackupAt) }) : t('jr.backup.never')}
              </AppText>
            </View>
          </View>
          {server ? (
            <View style={{ marginTop: space[3], gap: 6 }}>
              <ProgressBar value={cap ? used / cap : 0} label={t('jr.backup.storage')} />
              <AppText variant="caption" color="textSecondary">
                {t('jr.backup.storageUsed', { used: (used / MB).toFixed(1), max: Math.round(cap / MB) })}
                {server.blobs.length ? ` · ${t('jr.backup.images', { n: server.blobs.length })}` : ''}
              </AppText>
            </View>
          ) : null}
          <View style={{ marginTop: space[4], gap: space[3] }}>
            {progressBar}
            <Button label={t('jr.backup.now')} icon="cloud-upload-outline" onPress={backUp} loading={busy} style={{ alignSelf: 'flex-start' }} testID="backup-now" />
          </View>
          {local.lastError && !error ? <AppText variant="caption" color="danger" style={{ marginTop: space[2] }}>{errorText(local.lastError)}</AppText> : null}
        </Card>

        <Card padding={18}>
          <ToggleRow value={local.auto} onValueChange={(v) => setAutoBackup(v)} label={t('jr.backup.auto')} testID="backup-auto" />
          <AppText variant="caption" color="textSecondary">
            {t('jr.backup.autoHint')}
          </AppText>
          <AppText variant="caption" color="textSecondary" style={{ marginTop: space[2] }}>
            {t('jr.backup.syncHint')}
          </AppText>
        </Card>

        {local.replaced.length ? (
          <Card padding={18} testID="backup-replaced">
            <SectionHeader title={t('jr.backup.replacedTitle')} />
            <AppText variant="small" color="textSecondary" style={{ marginBottom: space[2] }}>
              {t('jr.backup.replacedBody')}
            </AppText>
            {local.replaced.slice(0, 10).map((r, i) => (
              <View key={`${r.collection}:${r.id}:${r.at}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                <AppText variant="small" style={{ flex: 1 }}>
                  {t(`jr.backup.collections.${r.collection}`) === `jr.backup.collections.${r.collection}` ? r.collection : t(`jr.backup.collections.${r.collection}`)} · {when(r.at)}
                </AppText>
                <Button label={t('jr.backup.bringBack')} size="sm" variant="secondary" onPress={() => restoreReplaced(i).then(() => toast(t('jr.backup.broughtBack')))} />
                <Button label={t('jr.backup.dismiss')} size="sm" variant="ghost" onPress={() => dismissReplaced(i)} />
              </View>
            ))}
          </Card>
        ) : null}

        <Card padding={6}>
          <View style={{ paddingHorizontal: 14 }}>
            <ListRow icon="phone-portrait-outline" iconTone="muted" title={t('jr.backup.offHere')} subtitle={t('jr.backup.offHereHint')} onPress={offHere} testID="backup-off-here" />
            <Divider />
            <ListRow icon="trash-outline" iconTone="danger" title={t('jr.backup.delete')} subtitle={t('jr.backup.deleteHint')} onPress={removeBackup} destructive testID="backup-delete" />
          </View>
        </Card>
        {howItWorks}
      </View>
    );
  }

  return (
    <Screen back title={t('jr.backup.title')} subtitle={t('jr.backup.subtitle')} width="reading" testID="screen-backup">
      <View style={{ gap: space[4] }}>
        {error ? <Banner tone="danger" body={errorText(error)} /> : null}
        {serverError && identity.registered ? <Banner tone="warning" body={t('jr.backup.errors.offline')} /> : null}
        {body}
        <Button label={t('jr.backup.exportLink')} variant="ghost" iconRight="arrow-forward" onPress={() => router.push('/profile' as never)} style={{ alignSelf: 'flex-start' }} />
      </View>
    </Screen>
  );
}
