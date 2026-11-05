import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, Divider, Icon, Screen, SectionHeader, Skeleton, space, useLayout } from '@/design';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';
import { Catalog, getCatalog, Product } from '@/lib/api/payments';


export default function PricingScreen() {
  const router = useRouter();
  const { t, tl, formatPrice, formatDate } = useT();
  const { isCompact } = useLayout();
  const { entitlements, refresh } = useAccount();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setError(false);
      getCatalog()
        .then(setCatalog)
        .catch(() => setError(true));
      refresh();
    }, [refresh])
  );

  const plus = catalog?.products.filter((p) => p.kind === 'plus') ?? [];
  const art = catalog?.products.find((p) => p.kind === 'art');
  const limits = catalog?.limits;
  const fill = (s: string) => s.replace('{anulia}', String(limits?.free.anuliaMessages ?? '…'));
  const fillPlus = (s: string) => s.replace('{anulia}', String(limits?.plus.anuliaMessages ?? '…')).replace('{cards}', String(limits?.plus.cardConversationsPerDay ?? '…')).replace('{journal}', String(limits?.plus.journalReflectionsPerDay ?? '…'));

  const buy = (p: Product) => router.push(`/checkout?product=${p.id}`);

  const check = (text: string) => (
    <View key={text} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Icon name="checkmark" size={18} color="brand" style={{ marginTop: 2 }} />
      <AppText variant="small" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );

  const planCard = (p: Product) => {
    const perMonth = p.durationDays && p.durationDays > 31 ? formatPrice(Math.round((p.amountMinor / p.durationDays) * 30), p.currency) : null;
    return (
      <Card key={p.id} padding={20} tone={p.highlight ? 'primary' : 'surface'} bordered style={{ flexGrow: 1, flexBasis: isCompact ? undefined : 170, minWidth: isCompact ? undefined : 170 }} testID={`plan-${p.id}`}>
        <View style={{ gap: 6 }}>
          {p.highlight ? <Badge label={t('pricing.recommended')} tone="primary" /> : <View style={{ height: 22 }} />}
          <AppText variant="title3">{t('pricing.passDays', { days: p.durationDays ?? 0 })}</AppText>
          <AppText variant="display" style={{ fontSize: 34, lineHeight: 40 }}>
            {formatPrice(p.amountMinor, p.currency)}
          </AppText>
          {perMonth ? (
            <AppText variant="caption" color="textSecondary">
              {t('pricing.perMonth', { price: perMonth })}
            </AppText>
          ) : null}
          <AppText variant="caption" color="textSecondary">
            {t('pricing.oneTime')} · {t('pricing.noRenewal')}
          </AppText>
          <Button label={entitlements.plus.active ? t('pricing.extend') : t('pricing.buy')} onPress={() => buy(p)} fullWidth style={{ marginTop: space[3] }} variant={p.highlight ? 'primary' : 'secondary'} testID={`buy-${p.id}`} />
        </View>
      </Card>
    );
  };

  return (
    <Screen back title={t('pricing.title')} subtitle={t('pricing.subtitle')} testID="screen-pricing">
      <View style={{ gap: space[6] }}>
        <Banner tone="test" title={t('common.test')} body={t('pricing.testBanner')} />

        {entitlements.plus.active && entitlements.plus.expiresAt ? (
          <Banner tone="success" body={t('pricing.youHavePlus', { date: formatDate(entitlements.plus.expiresAt, { day: 'numeric', month: 'long', year: 'numeric' }) })} />
        ) : null}

        <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: space[5], alignItems: 'stretch' }}>
          <Card padding={22} tone="muted" style={{ flex: isCompact ? undefined : 1 }}>
            <AppText variant="label" color="textTertiary">
              {t('pricing.freeTitle')}
            </AppText>
            <AppText variant="title1" style={{ marginTop: 4 }}>
              {t('pricing.freePrice')}
            </AppText>
            <View style={{ gap: 10, marginTop: space[4] }}>{tl('pricing.freeItems').map((s) => check(fill(s)))}</View>
          </Card>

          <Card padding={22} style={{ flex: isCompact ? undefined : 1.6 }} raised>
            <AppText variant="label" color="primary">
              {t('pricing.plusTitle')}
            </AppText>
            <AppText variant="title2" style={{ marginTop: 4 }}>
              {t('pricing.plusTagline')}
            </AppText>
            <View style={{ gap: 10, marginTop: space[4] }}>{tl('pricing.plusItems').map((s) => check(fillPlus(s)))}</View>
            <View style={{ flexDirection: isCompact ? 'column' : 'row', flexWrap: 'wrap', gap: space[3], marginTop: space[5] }}>
              {catalog ? plus.map(planCard) : error ? null : [0, 1, 2].map((i) => <Skeleton key={i} height={170} radius={22} style={{ flex: 1 }} />)}
            </View>
          </Card>
        </View>

        {art ? (
          <Card padding={22} tone="peach" testID="plan-art">
            <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: space[5], alignItems: isCompact ? 'stretch' : 'center' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <AppText variant="label" color="onPeachSoft">
                  {t('pricing.artTitle')}
                </AppText>
                <AppText variant="title2">{t('pricing.artTagline')}</AppText>
                <View style={{ gap: 8, marginTop: space[2] }}>{tl('pricing.artItems').map(check)}</View>
              </View>
              <View style={{ gap: 6, minWidth: 220 }}>
                <AppText variant="display" style={{ fontSize: 34, lineHeight: 40 }}>
                  {formatPrice(art.amountMinor, art.currency)}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {t('pricing.oneTime')} · {t('pricing.lifetime')}
                </AppText>
                {entitlements.artProgram.owned ? (
                  <Badge label={t('pricing.youOwnArt')} tone="success" icon="checkmark" />
                ) : (
                  <Button label={t('pricing.buy')} onPress={() => buy(art)} testID="buy-art_program" />
                )}
              </View>
            </View>
          </Card>
        ) : null}

        {error ? <Banner tone="warning" body={t('checkout.offline')} /> : null}

        <AppText variant="caption" color="textTertiary">
          {t('pricing.limitsNote')}
        </AppText>

        <View>
          <SectionHeader title={t('pricing.faqTitle')} />
          <Card padding={6}>
            {(tl('pricing.faq') as unknown as { q: string; a: string }[]).map((item, i, arr) => (
              <View key={item.q} style={{ padding: 16, gap: 6 }}>
                <AppText variant="bodyStrong">{item.q}</AppText>
                <AppText variant="small" color="textSecondary">
                  {item.a}
                </AppText>
                {i < arr.length - 1 ? <Divider style={{ marginTop: 12 }} /> : null}
              </View>
            ))}
          </Card>
        </View>
      </View>
    </Screen>
  );
}
