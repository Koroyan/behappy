import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Icon, Sheet, space } from '@/design';
import { useT } from '@/i18n';
import { loadConsent, setAiConsent } from '@/lib/privacy/consent';

interface ConsentGateValue {
  /** Resolves true if AI may be used (asking once if needed). */
  ensureConsent: () => Promise<boolean>;
}

const Ctx = createContext<ConsentGateValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const { t, tl } = useT();
  const [visible, setVisible] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ensureConsent = useCallback(async () => {
    const state = await loadConsent();
    if (state.ai) return true;
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setVisible(true);
    });
  }, []);

  const finish = async (agreed: boolean) => {
    if (agreed) await setAiConsent(true);
    setVisible(false);
    resolver.current?.(agreed);
    resolver.current = null;
  };

  return (
    <Ctx.Provider value={{ ensureConsent }}>
      {children}
      <Sheet
        visible={visible}
        onClose={() => finish(false)}
        title={t('consent.title')}
        testID="consent-sheet"
        footer={
          <View style={{ gap: 10 }}>
            <Button label={t('consent.agree')} onPress={() => finish(true)} fullWidth testID="consent-agree" />
            <Button label={t('consent.decline')} variant="quiet" onPress={() => finish(false)} fullWidth />
          </View>
        }
      >
        <AppText variant="body" color="textSecondary" style={{ marginBottom: space[4] }}>
          {t('consent.body')}
        </AppText>
        <View style={{ gap: 12 }}>
          {tl('consent.points').map((p) => (
            <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="checkmark-circle-outline" size={20} color="brand" />
              <AppText variant="small" style={{ flex: 1 }}>
                {p}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color="textTertiary" style={{ marginTop: space[4] }}>
          {t('consent.settingsNote')}
        </AppText>
      </Sheet>
    </Ctx.Provider>
  );
}

export function useEnsureConsent() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEnsureConsent must be used inside ConsentProvider');
  return ctx.ensureConsent;
}
