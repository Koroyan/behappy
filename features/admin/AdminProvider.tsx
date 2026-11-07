/**
 * Admin center context: who is signed in and what their roles allow (from
 * /api/admin/me), the shared date range, and two prompts every page uses:
 *
 *  - act(fn): runs a staff action; if the server asks for a fresh
 *    confirmation (password, plus the two-step code when it is on) or for the
 *    code itself, the prompt opens and the action is retried once.
 *  - ask(...): a reason (or a typed confirmation) for an action. The server
 *    refuses actions without one, so this is not decoration.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Sheet, TextField } from '@/design';
import { useT } from '@/i18n';

import { adminPost, errorCode, useAdminData } from './api';

export interface AdminMe {
  accountId: string;
  email: string;
  roles: string[];
  primaryRole: string | null;
  permissions: string[];
  stepUp: { validUntil: number | null; minutes: number };
  mfa: { enabled: boolean; required: boolean; verified: boolean };
  mode: 'test';
}

export type RangePreset = '7d' | '30d' | '90d';
const DAY = 24 * 60 * 60 * 1000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const rangeFor = (preset: RangePreset) => {
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  const now = Date.now();
  return { preset, from: iso(now - (days - 1) * DAY), to: iso(now), days };
};

interface AskOptions {
  title: string;
  body?: string;
  label?: string;
  confirmLabel?: string;
  /** Minimum length of the reason (the server enforces its own minimum too). */
  min?: number;
  /** When set, the person must type exactly this (for irreversible actions). */
  typeToConfirm?: string;
  destructive?: boolean;
  multiline?: boolean;
  initial?: string;
}

interface AdminContextValue {
  me: AdminMe | null;
  meError: unknown;
  meLoading: boolean;
  reloadMe: () => Promise<void>;
  can: (permission: string) => boolean;
  range: ReturnType<typeof rangeFor>;
  setRange: (p: RangePreset) => void;
  act: <T>(fn: () => Promise<T>) => Promise<T>;
  ask: (o: AskOptions) => Promise<string | null>;
  confirmIdentity: () => Promise<boolean>;
}

const Ctx = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin outside AdminProvider');
  return v;
}

type Pending = { resolve: (ok: boolean) => void; mode: 'step_up' | 'code' };

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const meQuery = useAdminData<AdminMe>('/me');
  const me = meQuery.data;
  const [range, setRangeState] = useState(() => rangeFor('30d'));
  const [pending, setPending] = useState<Pending | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [askState, setAskState] = useState<(AskOptions & { resolve: (v: string | null) => void }) | null>(null);
  const [answer, setAnswer] = useState('');
  const meRef = useRef(me);
  meRef.current = me;

  const can = useCallback((p: string) => Boolean(me?.permissions.includes(p)), [me]);

  const openPrompt = (mode: Pending['mode']) =>
    new Promise<boolean>((resolve) => {
      setPassword('');
      setCode('');
      setProblem(null);
      setPending({ resolve, mode });
    });

  const confirmIdentity = useCallback(() => openPrompt('step_up'), []);

  const act = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      const c = errorCode(e);
      if (c !== 'step_up_required' && c !== 'mfa_code_required') throw e;
      const ok = await openPrompt(c === 'step_up_required' ? 'step_up' : 'code');
      if (!ok) throw e;
      return fn();
    }
  }, []);

  const submit = async () => {
    if (!pending) return;
    setBusy(true);
    setProblem(null);
    try {
      if (pending.mode === 'step_up') await adminPost('/step-up', { password, ...(meRef.current?.mfa.enabled ? { code } : {}) });
      else await adminPost('/mfa/verify', { code });
      await meQuery.reload();
      pending.resolve(true);
      setPending(null);
    } catch (e) {
      const c = errorCode(e);
      setProblem(t(c === 'code_wrong' ? 'ac.stepUp.codeWrong' : c === 'rate_limited' ? 'ac.stepUp.tooMany' : 'ac.stepUp.wrong'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    pending?.resolve(false);
    setPending(null);
  };

  const ask = useCallback(
    (o: AskOptions) =>
      new Promise<string | null>((resolve) => {
        setAnswer(o.initial || '');
        setAskState({ ...o, resolve });
      }),
    []
  );

  const finishAsk = (value: string | null) => {
    askState?.resolve(value);
    setAskState(null);
  };

  const minLen = askState?.min ?? 3;
  const askValid = askState ? (askState.typeToConfirm ? answer.trim().toLowerCase() === askState.typeToConfirm.toLowerCase() : answer.trim().length >= minLen) : false;

  const value = useMemo<AdminContextValue>(
    () => ({
      me,
      meError: meQuery.error,
      meLoading: meQuery.loading,
      reloadMe: meQuery.reload,
      can,
      range,
      setRange: (p) => setRangeState(rangeFor(p)),
      act,
      ask,
      confirmIdentity,
    }),
    [me, meQuery.error, meQuery.loading, meQuery.reload, can, range, act, ask, confirmIdentity]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet visible={Boolean(pending)} onClose={cancel} title={t(pending?.mode === 'code' ? 'ac.stepUp.codeTitle' : 'ac.stepUp.title')} testID="admin-step-up">
        <View style={{ gap: 12 }}>
          <AppText variant="small" color="textSecondary">
            {t(pending?.mode === 'code' ? 'ac.stepUp.codeBody' : 'ac.stepUp.body', { minutes: me?.stepUp.minutes ?? 15 })}
          </AppText>
          {pending?.mode === 'step_up' ? (
            <TextField label={t('ac.stepUp.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" testID="admin-step-up-password" onSubmitEditing={submit} />
          ) : null}
          {pending?.mode === 'code' || me?.mfa.enabled ? (
            <TextField label={t('ac.stepUp.code')} value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" testID="admin-step-up-code" onSubmitEditing={submit} />
          ) : null}
          {problem ? (
            <AppText variant="small" color="danger">
              {problem}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button label={t('common.cancel')} variant="ghost" onPress={cancel} />
            <Button label={t('ac.stepUp.confirm')} onPress={submit} loading={busy} disabled={pending?.mode === 'step_up' ? !password : code.length !== 6} testID="admin-step-up-submit" />
          </View>
        </View>
      </Sheet>
      <Sheet visible={Boolean(askState)} onClose={() => finishAsk(null)} title={askState?.title} testID="admin-ask">
        <View style={{ gap: 12 }}>
          {askState?.body ? (
            <AppText variant="small" color="textSecondary">
              {askState.body}
            </AppText>
          ) : null}
          <TextField
            label={askState?.label || (askState?.typeToConfirm ? t('ac.ask.typeToConfirm', { text: askState.typeToConfirm }) : t('ac.ask.reason'))}
            value={answer}
            onChangeText={setAnswer}
            multiline={askState?.multiline !== false && !askState?.typeToConfirm}
            autoCapitalize={askState?.typeToConfirm ? 'none' : 'sentences'}
            testID="admin-ask-input"
          />
          {!askState?.typeToConfirm ? (
            <AppText variant="caption" color="textTertiary">
              {t('ac.ask.logged')}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button label={t('common.cancel')} variant="ghost" onPress={() => finishAsk(null)} />
            <Button label={askState?.confirmLabel || t('ac.ask.continue')} variant={askState?.destructive ? 'danger' : 'primary'} disabled={!askValid} onPress={() => finishAsk(answer.trim())} testID="admin-ask-submit" />
          </View>
        </View>
      </Sheet>
    </Ctx.Provider>
  );
}
