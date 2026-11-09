import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText, Banner, Button, Card, Divider, Icon, Screen, Skeleton, space, TextField } from '@/design';
import { useT } from '@/i18n';
import { getCatalog, getQuote, PENDING_ORDER_KEY, Product, Quote, startCheckout } from '@/lib/api/payments';

export default function CheckoutScreen() {
  const { product: productId } = useLocalSearchParams<{ product?: string }>();
  const router = useRouter();
  const { t, formatPrice, language } = useT();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The price comes from the server (offers and codes are checked there).
  const [quote, setQuote] = useState<Quote | null>(null);
  const [code, setCode] = useState('');
  const [codeNote, setCodeNote] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | undefined>(undefined);

  useEffect(() => {
    getCatalog()
      .then((c) => setProduct(c.products.find((p) => p.id === productId) ?? null))
      .catch(() => setError(t('checkout.offline')))
      .finally(() => setLoading(false));
    if (productId) getQuote(productId).then(setQuote).catch(() => setQuote(null));
  }, [productId, t]);

  const applyCode = async () => {
    if (!product || !code.trim()) return;
    setCodeNote(null);
    try {
      const q = await getQuote(product.id, code.trim());
      setQuote(q);
      if (q.codeNotBetter) setCodeNote(t('wb.money.codeNotBetter'));
      else {
        setApplied(code.trim());
        setCodeNote(q.promotion ? t('wb.money.codeApplied', { name: q.promotion.name }) : null);
      }
    } catch {
      setCodeNote(t('wb.money.codeInvalid'));
    }
  };
  const total = quote && product && quote.productId === product.id ? quote.finalMinor : product?.amountMinor ?? 0;

  const name = product?.kind === 'art' ? t('pricing.artTitle') : t('pricing.plusTitle');
  const access = product?.durationDays ? t('pricing.passDays', { days: product.durationDays }) : t('pricing.lifetime');

  const pay = async () => {
    if (!product) return;
    setBusy(true);
    setError(null);
    try {
      const { order, checkoutUrl } = await startCheckout(product.id, language, applied);
      await AsyncStorage.setItem(PENDING_ORDER_KEY, order.id);
      if (Platform.OS === 'web') {
        // Full-page redirect to Flitt's hosted checkout; Flitt returns via our
        // server, which verifies the payment and sends the browser back here.
        window.location.assign(checkoutUrl);
        return;
      }
      await WebBrowser.openAuthSessionAsync(checkoutUrl, 'behappy://checkout/result');
      router.replace(`/checkout/result?orderId=${encodeURIComponent(order.id)}`);
    } catch {
      setError(t('checkout.errorCreate'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back title={t('checkout.title')} width="reading" testID="screen-checkout">
      <View style={{ gap: space[5] }}>
        <Banner tone="test" title={t('common.test')} body={t('checkout.testNotice')} />
        {loading ? (
          <Skeleton height={220} radius={22} />
        ) : product ? (
          <Card padding={22}>
            <View style={{ gap: space[4] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <AppText variant="small" color="textSecondary">
                  {t('checkout.product')}
                </AppText>
                <AppText variant="bodyStrong" style={{ flexShrink: 1 }} align="right">
                  {name}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <AppText variant="small" color="textSecondary">
                  {t('checkout.duration')}
                </AppText>
                <AppText variant="body" align="right">
                  {access}
                </AppText>
              </View>
              <AppText variant="caption" color="textTertiary">
                {t('pricing.oneTime')} · {t('pricing.noRenewal')}
              </AppText>
              <Divider />
              {quote && quote.discountMinor > 0 ? (
                <View style={{ gap: 6 }} testID="checkout-discount">
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <AppText variant="small" color="textSecondary">{t('wb.money.regularPrice')}</AppText>
                    <AppText variant="small">{formatPrice(quote.listMinor, product.currency)}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <AppText variant="small" color="success">{quote.promotion?.name || t('wb.money.discount')}</AppText>
                    <AppText variant="small" color="success">−{formatPrice(quote.discountMinor, product.currency)}</AppText>
                  </View>
                  {quote.clamped ? <AppText variant="caption" color="textTertiary">{t('wb.money.adjusted')}</AppText> : null}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="title3">{t('checkout.total')}</AppText>
                <AppText variant="title1" testID="checkout-total">
                  {formatPrice(total, product.currency)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <TextField value={code} onChangeText={setCode} placeholder={t('wb.money.promoCode')} autoCapitalize="characters" testID="checkout-code" />
                </View>
                <Button label={t('wb.money.apply')} variant="secondary" onPress={applyCode} disabled={!code.trim()} testID="checkout-apply" />
              </View>
              {codeNote ? <AppText variant="caption" color="textSecondary" testID="checkout-code-note">{codeNote}</AppText> : null}
            </View>
          </Card>
        ) : (
          <Banner tone="warning" body={error ?? t('errors.loadFailed')} />
        )}

        <Card tone="gold" padding={16}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Icon name="card-outline" size={20} color="onGoldSoft" />
            <AppText variant="small" color="onGoldSoft" style={{ flex: 1 }}>
              {t('checkout.testCard')}
            </AppText>
          </View>
        </Card>

        {error && product ? <Banner tone="warning" body={error} /> : null}

        <Button label={busy ? t('checkout.redirecting') : t('checkout.pay')} icon="lock-closed-outline" onPress={pay} loading={busy} disabled={!product} fullWidth size="lg" testID="checkout-pay" />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="shield-checkmark-outline" size={16} color="textTertiary" />
          <AppText variant="caption" color="textTertiary" align="center">
            {t('checkout.secureNote')}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
