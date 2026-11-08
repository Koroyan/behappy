import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Card, Chip, Divider, Icon, IconButton, Press, Screen, SectionHeader, Skeleton, space, TextField, Toggle, useFeedback, useTheme } from '@/design';
import { AccountGate, CodeField } from '@/features/account/AccountParts';
import { ProAvatar, VerificationBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { ApiError } from '@/lib/api/client';
import { pickImage } from '@/lib/media/images';
import * as pro from '@/lib/api/pros';
import type { ProProfile, Qualification, Service } from '@/lib/api/pros';

type Step = 'identity' | 'qualifications' | 'practice' | 'services' | 'availability' | 'review';
const STEPS: Step[] = ['identity', 'qualifications', 'practice', 'services', 'availability', 'review'];
const LANGS = ['ka', 'en', 'ru', 'hy', 'uk', 'tr', 'az', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'id', 'ar', 'hi', 'zh', 'ja', 'ko'] as const;
const SPECS = ['anxiety', 'depression', 'panic', 'trauma', 'stress_burnout', 'relationships', 'family', 'grief', 'self_esteem', 'emotional_regulation', 'sleep', 'addiction', 'eating', 'ocd', 'children_adolescents', 'work_career', 'life_transitions', 'lgbtq', 'personal_growth'];
const METHODS = ['bank_transfer', 'card_link', 'cash_in_person', 'other'];
const DOC_KINDS = ['identity', 'degree', 'license', 'certification', 'other'];

const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromHHMM = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v <= 1440 ? v : null;
};

/** Web: a native file chooser for PDFs and images; returns a data URL. */
function chooseFileWeb(accept: string): Promise<{ name: string; type: string; dataUrl: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    // Attached (hidden) so mobile Safari opens the chooser reliably.
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: f.name, type: f.type || 'application/octet-stream', dataUrl: String(reader.result) });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    };
    input.click();
  });
}

export default function ProApply() {
  const router = useRouter();
  const { t, tl } = useT();
  const { colors } = useTheme();
  const { refresh } = useAccount();
  const identity = useIdentity();
  const { toast } = useFeedback();
  const [p, setP] = useState<ProProfile | null>(null);
  const [step, setStep] = useState<Step>('identity');
  const [form, setForm] = useState<Record<string, any>>({});
  const [quals, setQuals] = useState<Qualification[]>([]);
  const [services, setServicesState] = useState<Partial<Service>[]>([]);
  const [hours, setHours] = useState<Record<number, { open: boolean; from: string; to: string }>>({});
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [docKind, setDocKind] = useState('identity');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adopt = useCallback((profile: ProProfile) => {
    setP(profile);
    setForm({
      legalName: profile.legalName || '',
      publicName: profile.publicName || '',
      country: profile.country || '',
      city: profile.city || '',
      contactEmail: profile.contactEmail || '',
      bio: profile.bio || '',
      practiceAreas: profile.practiceAreas || '',
      languages: profile.languages,
      confirmLanguages: profile.languagesConfirmed,
      specializations: profile.specializations,
      experienceYears: profile.experienceYears ?? '',
      offersOnline: profile.offersOnline,
      offersInPerson: profile.offersInPerson,
      inPersonAddress: profile.inPersonAddress || '',
      timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      paymentArrangement: profile.paymentArrangement || '',
      paymentMethods: profile.paymentMethods,
      cancellationPolicy: profile.cancellationPolicy || '',
      cancellationNoticeHours: String(profile.cancellationNoticeHours),
      bookingNoticeHours: String(profile.bookingNoticeHours),
      bufferMinutes: String(profile.bufferMinutes),
      autoConfirm: profile.autoConfirm,
    });
    setQuals(profile.qualifications.length ? profile.qualifications : [{ kind: 'degree', title: '', institution: '', number: '', year: null }]);
    setServicesState(profile.services.filter((s) => s.active !== false).length ? profile.services.filter((s) => s.active !== false) : [{ title: '', mode: 'online', minutes: 50, priceMinor: 0 }]);
    const h: Record<number, { open: boolean; from: string; to: string }> = {};
    for (let d = 1; d <= 7; d += 1) {
      const r = profile.availability.rules.find((x) => x.weekday === d);
      h[d] = r ? { open: true, from: toHHMM(r.startMinute), to: toHHMM(r.endMinute) } : { open: false, from: '10:00', to: '18:00' };
    }
    setHours(h);
    setPhone(profile.phone || '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Applying needs an account (opened from a link, someone may not have one yet).
      if (!identity.registered) return;
      pro
        .proMe()
        .then(async (m) => adopt(m.profile || (await pro.startApplication())))
        .catch(() => setError(t('common.errorBody')));
    }, [adopt, t, identity.registered])
  );

  if (!identity.registered) {
    return (
      <Screen back title={t('pro.apply.title')} width="reading" testID="screen-pro-apply">
        <AccountGate returnTo="/pro/apply" />
      </Screen>
    );
  }

  if (!p) {
    return (
      <Screen back title={t('pro.apply.title')} width="reading" testID="screen-pro-apply">
        {error ? <Banner tone="danger" body={error} /> : <Skeleton height={240} radius={22} />}
      </Screen>
    );
  }

  const locked = ['submitted', 'under_review', 'rejected', 'suspended'].includes(p.status);
  const identityLocked = locked || p.status === 'approved';
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const errText = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : undefined;
    return t(`pro.apply.errors.${code && t(`pro.apply.errors.${code}`) !== `pro.apply.errors.${code}` ? code : 'generic'}`);
  };

  const run = async (fn: () => Promise<ProProfile | void>, goNext = false, refreshForm = true) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      if (next) {
        if (refreshForm) adopt(next);
        else setP(next);
      }
      toast(t('pro.apply.saved'));
      if (goNext) setStep(STEPS[Math.min(STEPS.indexOf(step) + 1, STEPS.length - 1)]);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const saveIdentity = () =>
    run(() => pro.updatePro(identityLocked ? { publicName: form.publicName, city: form.city } : { legalName: form.legalName, publicName: form.publicName, country: String(form.country).toUpperCase(), city: form.city, contactEmail: form.contactEmail }), true);
  const saveQuals = () => run(() => pro.setQualifications(quals.filter((q) => q.title.trim()).map((q) => ({ ...q, year: q.year ? Number(q.year) : null }))), true);
  const savePractice = () =>
    run(
      () =>
        pro.updatePro({
          bio: form.bio,
          practiceAreas: form.practiceAreas,
          languages: form.languages,
          confirmLanguages: form.confirmLanguages,
          specializations: form.specializations,
          experienceYears: Number(form.experienceYears),
          offersOnline: form.offersOnline,
          offersInPerson: form.offersInPerson,
          inPersonAddress: form.inPersonAddress,
          timezone: form.timezone,
        }),
      true
    );
  const saveServices = () =>
    run(async () => {
      await pro.setServices(services.filter((s) => (s.title || '').trim()).map((s) => ({ id: s.id, title: s.title, mode: s.mode, minutes: Number(s.minutes), priceMinor: Math.round(Number(s.priceMinor)) })));
      return pro.updatePro({
        paymentArrangement: form.paymentArrangement,
        paymentMethods: form.paymentMethods,
        cancellationPolicy: form.cancellationPolicy,
        cancellationNoticeHours: Number(form.cancellationNoticeHours),
        bookingNoticeHours: Number(form.bookingNoticeHours),
        bufferMinutes: Number(form.bufferMinutes),
        autoConfirm: form.autoConfirm,
      });
    }, true);
  const saveHours = () =>
    run(() => {
      const rules = Object.entries(hours)
        .filter(([, h]) => h.open)
        .map(([d, h]) => ({ weekday: Number(d), startMinute: fromHHMM(h.from) ?? -1, endMinute: fromHHMM(h.to) ?? -1 }))
        .filter((r) => r.startMinute >= 0 && r.endMinute > r.startMinute);
      return pro.setAvailability(rules, p.availability.daysOff);
    }, true);

  const uploadDoc = async () => {
    setError(null);
    let file: { name: string; type: string; dataUrl: string } | null = null;
    if (Platform.OS === 'web') file = await chooseFileWeb('application/pdf,image/*');
    else {
      const img = await pickImage('library');
      if (img) file = { name: `${docKind}.jpg`, type: 'image/jpeg', dataUrl: img.dataUrl };
    }
    if (!file) return;
    const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    await run(() => pro.uploadDocument({ kind: docKind, fileName: file!.name, mime, dataBase64: file!.dataUrl.split(',')[1] || '' }), false, false);
  };

  const uploadPhoto = async () => {
    setError(null);
    let dataUrl: string | null = null;
    let mime = 'image/jpeg';
    if (Platform.OS === 'web') {
      const f = await chooseFileWeb('image/jpeg,image/png,image/webp');
      if (f) {
        dataUrl = f.dataUrl;
        mime = f.type;
      }
    } else {
      const img = await pickImage('library');
      dataUrl = img?.dataUrl || null;
    }
    if (!dataUrl) return;
    await run(() => pro.uploadPhoto(dataUrl!.split(',')[1] || '', mime), false, false);
  };

  const toggle = (key: 'languages' | 'specializations' | 'paymentMethods', value: string, max = 19) =>
    set(key, (form[key] as string[]).includes(value) ? (form[key] as string[]).filter((x) => x !== value) : [...(form[key] as string[]), value].slice(0, max));

  const stepper = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {STEPS.map((s, i) => {
        const active = s === step;
        return (
          <Press key={s} onPress={() => setStep(s)} accessibilityRole="tab" accessibilityState={{ selected: active }} testID={`apply-step-${s}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.primarySoft : colors.surface, borderWidth: 1, borderColor: active ? colors.primarySoft : colors.border }}>
            <AppText variant="smallStrong" color={active ? 'onPrimarySoft' : 'textSecondary'}>
              {i + 1}. {t(`pro.apply.steps.${s}`)}
            </AppText>
          </Press>
        );
      })}
    </ScrollView>
  );

  const saveBar = (onSave: () => void, disabled = false) => (
    <View style={{ gap: 8 }}>
      {error ? <Banner tone="danger" body={error} /> : null}
      <Button label={t('pro.apply.save')} onPress={onSave} loading={busy} disabled={disabled} fullWidth testID="apply-save" />
    </View>
  );

  return (
    <Screen back title={t('pro.apply.title')} width="reading" keyboard testID="screen-pro-apply" headerRight={<VerificationBadge status={p.status} />}>
      <View style={{ gap: space[4] }}>
        {stepper}
        {locked ? <Banner tone="info" body={t('pro.apply.locked')} /> : null}
        {p.status === 'approved' ? <Banner tone="info" body={t('pro.apply.lockedIdentity')} /> : null}

        {step === 'identity' ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <ProAvatar name={form.publicName} photoUrl={p.photoUrl} size={64} />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="smallStrong">{t('pro.apply.photo')}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {t('pro.apply.photoHint')}
                  </AppText>
                  <Button label={t('pro.apply.changePhoto')} size="sm" variant="quiet" icon="image-outline" onPress={uploadPhoto} disabled={locked} />
                </View>
              </View>
              <TextField label={t('pro.apply.legalName')} helper={t('pro.apply.legalNameHint')} value={form.legalName} onChangeText={(v) => set('legalName', v)} editable={!identityLocked} testID="apply-legal-name" />
              <TextField label={t('pro.apply.publicName')} value={form.publicName} onChangeText={(v) => set('publicName', v)} editable={!locked} testID="apply-public-name" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextField label={t('pro.apply.country')} value={form.country} onChangeText={(v) => set('country', v.toUpperCase().slice(0, 2))} autoCapitalize="characters" editable={!identityLocked} containerStyle={{ flex: 1 }} testID="apply-country" />
                <TextField label={t('pro.apply.city')} value={form.city} onChangeText={(v) => set('city', v)} editable={!locked} containerStyle={{ flex: 2 }} testID="apply-city" />
              </View>
              <TextField label={t('pro.apply.contactEmail')} value={form.contactEmail} onChangeText={(v) => set('contactEmail', v)} keyboardType="email-address" autoCapitalize="none" editable={!identityLocked} testID="apply-contact-email" />
              {saveBar(saveIdentity, locked)}
              <Divider />
              <TextField label={t('pro.apply.phone')} helper={t('pro.apply.phoneHint')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!locked} testID="apply-phone" />
              {p.phoneVerified && phone === p.phone ? (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Icon name="checkmark-circle" size={18} color="success" />
                  <AppText variant="smallStrong" color="success">
                    {t('pro.apply.phoneVerified')}
                  </AppText>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <Button label={t('pro.apply.sendCode')} size="sm" variant="secondary" disabled={locked || phone.length < 8} onPress={async () => {
                    setError(null);
                    try {
                      await pro.startPhone(phone);
                      setCodeSent(true);
                    } catch (e) {
                      setError(errText(e));
                    }
                  }} testID="apply-send-code" />
                  {codeSent ? (
                    <>
                      <CodeField value={code} onChangeText={setCode} testID="apply-code" />
                      <Button label={t('pro.apply.confirmCode')} size="sm" disabled={code.length !== 6} onPress={() => run(() => pro.verifyPhone(code), false, false)} testID="apply-confirm-code" />
                    </>
                  ) : null}
                </View>
              )}
            </View>
          </Card>
        ) : null}

        {step === 'qualifications' ? (
          <>
            <Card padding={20}>
              <View style={{ gap: space[3] }}>
                {quals.map((q, i) => (
                  <View key={i} style={{ gap: 8, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      {(['degree', 'license', 'registration', 'certification'] as const).map((k) => (
                        <Chip key={k} label={t(`pro.apply.qualificationKinds.${k}`)} selected={q.kind === k} onPress={() => setQuals((list) => list.map((x, j) => (j === i ? { ...x, kind: k } : x)))} />
                      ))}
                      <IconButton icon="trash-outline" label={t('pro.apply.remove')} size={36} onPress={() => setQuals((list) => list.filter((_, j) => j !== i))} disabled={identityLocked} />
                    </View>
                    <TextField label={t('pro.apply.qualificationTitle')} value={q.title} onChangeText={(v) => setQuals((list) => list.map((x, j) => (j === i ? { ...x, title: v } : x)))} editable={!identityLocked} testID={`apply-qual-title-${i}`} />
                    <TextField label={t('pro.apply.institution')} value={q.institution || ''} onChangeText={(v) => setQuals((list) => list.map((x, j) => (j === i ? { ...x, institution: v } : x)))} editable={!identityLocked} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextField label={t('pro.apply.number')} value={q.number || ''} onChangeText={(v) => setQuals((list) => list.map((x, j) => (j === i ? { ...x, number: v } : x)))} editable={!identityLocked} containerStyle={{ flex: 2 }} />
                      <TextField label={t('pro.apply.year')} value={q.year ? String(q.year) : ''} onChangeText={(v) => setQuals((list) => list.map((x, j) => (j === i ? { ...x, year: v.replace(/\D/g, '').slice(0, 4) ? Number(v.replace(/\D/g, '').slice(0, 4)) : null } : x)))} keyboardType="number-pad" editable={!identityLocked} containerStyle={{ flex: 1 }} />
                    </View>
                  </View>
                ))}
                <Button label={t('pro.apply.addQualification')} icon="add" size="sm" variant="quiet" onPress={() => setQuals((list) => [...list, { kind: 'license', title: '', institution: '', number: '', year: null }])} disabled={identityLocked} testID="apply-add-qual" />
                {saveBar(saveQuals, identityLocked)}
              </View>
            </Card>
            <Card padding={20}>
              <View style={{ gap: space[3] }}>
                <SectionHeader title={t('pro.apply.documents')} subtitle={t('pro.apply.documentsHint')} />
                {p.documents.map((d) => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="document-attach-outline" size={20} color="textSecondary" />
                    <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>
                      {t(`pro.apply.documentKinds.${d.kind}`)} · {d.fileName}
                    </AppText>
                    {!identityLocked ? <Button label={t('pro.apply.remove')} size="sm" variant="quiet" onPress={() => run(() => pro.removeDocument(d.id), false, false)} /> : null}
                  </View>
                ))}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {DOC_KINDS.map((k) => (
                    <Chip key={k} label={t(`pro.apply.documentKinds.${k}`)} selected={docKind === k} onPress={() => setDocKind(k)} testID={`doc-kind-${k}`} />
                  ))}
                </View>
                <Button label={t('pro.apply.upload')} icon="cloud-upload-outline" variant="secondary" onPress={uploadDoc} disabled={identityLocked} loading={busy} testID="apply-upload" />
                {error ? <Banner tone="danger" body={error} /> : null}
              </View>
            </Card>
          </>
        ) : null}

        {step === 'practice' ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              <TextField label={t('pro.apply.bio')} helper={t('pro.apply.bioHint')} value={form.bio} onChangeText={(v) => set('bio', v)} multiline maxLength={3000} inputStyle={{ minHeight: 120 }} editable={!locked} testID="apply-bio" />
              <TextField label={t('pro.apply.practiceAreas')} value={form.practiceAreas} onChangeText={(v) => set('practiceAreas', v)} multiline maxLength={1000} editable={!locked} />
              <AppText variant="smallStrong" color="textSecondary">
                {t('pro.apply.languages')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {LANGS.map((l) => (
                  <Chip key={l} label={LANGUAGE_NAMES[l]} selected={(form.languages as string[]).includes(l)} onPress={() => { toggle('languages', l); set('confirmLanguages', false); }} testID={`apply-lang-${l}`} />
                ))}
              </View>
              <Press onPress={() => set('confirmLanguages', !form.confirmLanguages)} accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(form.confirmLanguages) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} testID="apply-confirm-languages">
                <Icon name={form.confirmLanguages ? 'checkbox' : 'square-outline'} size={22} color={form.confirmLanguages ? 'primary' : 'textSecondary'} />
                <AppText variant="callout" style={{ flex: 1 }}>
                  {t('pro.apply.confirmLanguages')}
                </AppText>
              </Press>
              <AppText variant="smallStrong" color="textSecondary">
                {t('pro.apply.specializations')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {SPECS.map((s) => (
                  <Chip key={s} label={t(`specialists.specializations.${s}`)} selected={(form.specializations as string[]).includes(s)} onPress={() => toggle('specializations', s, 10)} testID={`apply-spec-${s}`} />
                ))}
              </View>
              <TextField label={t('pro.apply.experience')} value={String(form.experienceYears ?? '')} onChangeText={(v) => set('experienceYears', v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" editable={!locked} testID="apply-experience" />
              <AppText variant="smallStrong" color="textSecondary">
                {t('pro.apply.formats')}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chip label={t('specialists.online')} selected={Boolean(form.offersOnline)} onPress={() => set('offersOnline', !form.offersOnline)} />
                <Chip label={t('specialists.inPerson')} selected={Boolean(form.offersInPerson)} onPress={() => set('offersInPerson', !form.offersInPerson)} />
              </View>
              {form.offersInPerson ? <TextField label={t('pro.apply.address')} value={form.inPersonAddress} onChangeText={(v) => set('inPersonAddress', v)} editable={!locked} /> : null}
              <TextField label={t('pro.apply.timezone')} value={form.timezone} onChangeText={(v) => set('timezone', v)} autoCapitalize="none" editable={!locked} />
              {saveBar(savePractice, locked)}
            </View>
          </Card>
        ) : null}

        {step === 'services' ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              <SectionHeader title={t('pro.apply.services')} />
              {services.map((s, i) => (
                <View key={s.id || i} style={{ gap: 8, paddingBottom: space[3], borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                  <TextField label={t('pro.apply.serviceTitle')} value={s.title || ''} onChangeText={(v) => setServicesState((l) => l.map((x, j) => (j === i ? { ...x, title: v } : x)))} editable={!locked} testID={`apply-service-title-${i}`} />
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <Chip label={t('specialists.online')} selected={s.mode === 'online'} onPress={() => setServicesState((l) => l.map((x, j) => (j === i ? { ...x, mode: 'online' } : x)))} />
                    <Chip label={t('specialists.inPerson')} selected={s.mode === 'in_person'} onPress={() => setServicesState((l) => l.map((x, j) => (j === i ? { ...x, mode: 'in_person' } : x)))} />
                    <IconButton icon="trash-outline" label={t('pro.apply.remove')} size={36} onPress={() => setServicesState((l) => l.filter((_, j) => j !== i))} disabled={locked} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextField label={t('pro.apply.minutes')} value={String(s.minutes ?? '')} onChangeText={(v) => setServicesState((l) => l.map((x, j) => (j === i ? { ...x, minutes: Number(v.replace(/\D/g, '').slice(0, 3)) || 0 } : x)))} keyboardType="number-pad" editable={!locked} containerStyle={{ flex: 1 }} />
                    <TextField label={t('pro.apply.priceGel')} value={s.priceMinor ? String(Math.round(Number(s.priceMinor) / 100)) : ''} onChangeText={(v) => setServicesState((l) => l.map((x, j) => (j === i ? { ...x, priceMinor: (Number(v.replace(/\D/g, '').slice(0, 5)) || 0) * 100 } : x)))} keyboardType="number-pad" editable={!locked} containerStyle={{ flex: 1 }} testID={`apply-service-price-${i}`} />
                  </View>
                </View>
              ))}
              <Button label={t('pro.apply.addService')} icon="add" size="sm" variant="quiet" onPress={() => setServicesState((l) => [...l, { title: '', mode: 'online', minutes: 50, priceMinor: 0 }])} disabled={locked} />
              <TextField label={t('pro.apply.paymentArrangement')} helper={t('pro.apply.paymentArrangementHint')} value={form.paymentArrangement} onChangeText={(v) => set('paymentArrangement', v)} multiline editable={!locked} testID="apply-payment" />
              <AppText variant="smallStrong" color="textSecondary">
                {t('pro.apply.paymentMethods')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {METHODS.map((m) => (
                  <Chip key={m} label={t(`specialists.paymentMethods.${m}`)} selected={(form.paymentMethods as string[]).includes(m)} onPress={() => toggle('paymentMethods', m, 4)} />
                ))}
              </View>
              <TextField label={t('pro.apply.cancellationPolicy')} value={form.cancellationPolicy} onChangeText={(v) => set('cancellationPolicy', v)} multiline editable={!locked} testID="apply-cancellation" />
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <TextField label={t('pro.apply.noticeHours')} value={form.cancellationNoticeHours} onChangeText={(v) => set('cancellationNoticeHours', v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" editable={!locked} containerStyle={{ flex: 1, minWidth: 140 }} />
                <TextField label={t('pro.apply.bookingNotice')} value={form.bookingNoticeHours} onChangeText={(v) => set('bookingNoticeHours', v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" editable={!locked} containerStyle={{ flex: 1, minWidth: 140 }} />
                <TextField label={t('pro.apply.buffer')} value={form.bufferMinutes} onChangeText={(v) => set('bufferMinutes', v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" editable={!locked} containerStyle={{ flex: 1, minWidth: 140 }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <AppText variant="callout" style={{ flex: 1 }}>
                  {t('pro.apply.autoConfirm')}
                </AppText>
                <Toggle value={Boolean(form.autoConfirm)} onValueChange={(v) => set('autoConfirm', v)} label={t('pro.apply.autoConfirm')} />
              </View>
              {saveBar(saveServices, locked)}
            </View>
          </Card>
        ) : null}

        {step === 'availability' ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              <SectionHeader title={t('pro.apply.weekly')} subtitle={form.timezone} />
              {tl('pro.apply.weekdays').map((label, i) => {
                const d = i + 1;
                const h = hours[d] || { open: false, from: '10:00', to: '18:00' };
                return (
                  <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <View style={{ width: 54 }}>
                      <AppText variant="bodyStrong">{label}</AppText>
                    </View>
                    <Toggle value={h.open} onValueChange={(v) => setHours((all) => ({ ...all, [d]: { ...h, open: v } }))} label={label} testID={`apply-day-${d}`} />
                    {h.open ? (
                      <>
                        <TextField value={h.from} onChangeText={(v) => setHours((all) => ({ ...all, [d]: { ...h, from: v } }))} placeholder="10:00" containerStyle={{ width: 90 }} accessibilityLabel={t('pro.apply.from')} />
                        <AppText variant="small">–</AppText>
                        <TextField value={h.to} onChangeText={(v) => setHours((all) => ({ ...all, [d]: { ...h, to: v } }))} placeholder="18:00" containerStyle={{ width: 90 }} accessibilityLabel={t('pro.apply.to')} />
                      </>
                    ) : (
                      <AppText variant="small" color="textTertiary">
                        {t('pro.apply.closed')}
                      </AppText>
                    )}
                  </View>
                );
              })}
              {saveBar(saveHours, ['rejected', 'suspended'].includes(p.status))}
            </View>
          </Card>
        ) : null}

        {step === 'review' ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              {p.missing.length ? (
                <>
                  <AppText variant="title3">{t('pro.apply.missingTitle')}</AppText>
                  {p.missing.map((m) => (
                    <View key={m} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Icon name="ellipse-outline" size={16} color="textTertiary" />
                      <AppText variant="body">{t(`pro.apply.missing.${m}`)}</AppText>
                    </View>
                  ))}
                </>
              ) : (
                <Banner tone="success" body={t('pro.apply.ready')} />
              )}
              {['draft', 'more_info_required', 'expired'].includes(p.status) ? (
                <>
                  {error ? <Banner tone="danger" body={error} /> : null}
                  <Button
                    label={t('pro.apply.submit')}
                    icon="paper-plane-outline"
                    disabled={p.missing.length > 0}
                    loading={busy}
                    fullWidth
                    onPress={() =>
                      run(async () => {
                        const next = await pro.submitApplication();
                        await refresh();
                        toast(t('pro.apply.submitted'));
                        return next;
                      })
                    }
                    testID="apply-submit"
                  />
                </>
              ) : (
                <Button label={t('pro.title')} variant="secondary" onPress={() => router.replace('/pro' as any)} />
              )}
            </View>
          </Card>
        ) : null}

        {step !== 'review' ? <Button label={t('pro.apply.next')} variant="ghost" iconRight="arrow-forward" onPress={() => setStep(STEPS[STEPS.indexOf(step) + 1])} /> : null}
      </View>
    </Screen>
  );
}
