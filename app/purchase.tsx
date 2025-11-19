import { useLanguage } from '@/contexts/LanguageContext';
import PurchaseService, { PurchaseProduct } from '@/services/purchase';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function PurchasePage() {
  const { language } = useLanguage();
  const params = useLocalSearchParams<{ product?: string; amount?: string; currency?: string; returnTo?: string; checkoutUrl?: string; test?: string }>();
  const router = useRouter();
  const webRef = useRef<WebView>(null);

  const product = (params.product || 'art-therapy') as PurchaseProduct;
  const amount = parseInt(params.amount || '50', 10) || 50;
  const currency = params.currency || 'GEL';
  const returnTo = (params.returnTo as string) || '/art-therapy';
  const checkoutUrl = params.checkoutUrl as string | undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    const paramTest = String(params.test || '').toLowerCase();
    const isTestParam = paramTest === 'true' || paramTest === '1';
    const isTest = isTestParam || String(process.env.EXPO_PUBLIC_FLITT_TEST_MODE ?? 'true') === 'true' || (process.env.EXPO_PUBLIC_FLITT_MERCHANT_ID ? false : true);
    const base = product === 'art-therapy' ? 'Unlock Art Therapy' : 'Complete Purchase';
    return isTest ? `${base} (TEST)` : base;
  }, [product, params.test]);

  const isTestMode = useMemo(() => {
    const paramTest = String(params.test || '').toLowerCase();
    const isTestParam = paramTest === 'true' || paramTest === '1';
    const envTest = String(process.env.EXPO_PUBLIC_FLITT_TEST_MODE ?? 'true') === 'true' || !process.env.EXPO_PUBLIC_FLITT_MERCHANT_ID;
    return isTestParam || envTest;
  }, [params.test]);

  const onSuccess = useCallback(async () => {
    try {
      setLoading(true);
      await PurchaseService.markUnlocked(product);
      router.replace(returnTo as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to finalize purchase');
    } finally {
      setLoading(false);
    }
  }, [product, returnTo, router]);

  const onWebNavChange = useCallback((navState: any) => {
    const url: string = navState?.url || '';
    // Consider payment success if URL contains status=success or success=true
    if (/status=success|success=true/i.test(url)) {
      onSuccess();
    }
  }, [onSuccess]);

  // Web-only: listen for postMessage from embedded iframe (srcDoc)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MessageEvent) => {
      if (typeof e.data === 'string' && e.data === 'FLITT_SUCCESS') {
        onSuccess();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccess]);

  // Web-only: detect success=true on current URL (redirect/fullscreen fallback)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        onSuccess();
      }
    } catch {}
  }, [onSuccess]);

  // Flitt locales: allow only officially supported values
  const FLITT_SUPPORTED = useMemo(() => (
    ['az','cs','da','de','en','es','fi','fr','hu','it','ka','ko','lv','nl','pl','ro','ru','sk','uk','zh'] as const
  ), []);

  const toFlittLocale = useCallback((lang?: string) => {
    const code = String(lang || 'en').toLowerCase();
    // If supported directly, return as-is
    if ((FLITT_SUPPORTED as readonly string[]).includes(code)) return code;
    // Map common app languages to closest supported; fallback to 'en'
    const map: Record<string, string> = {
      pt: 'en', tr: 'en', ar: 'en', hi: 'en', ja: 'en', hy: 'en', id: 'en'
    };
    return map[code] || 'en';
  }, [FLITT_SUPPORTED]);

  // Build Flitt Embedded Custom HTML when checkoutUrl isn't provided (native-only or iframe fallback)
  const flittHtml = useMemo(() => {
    if (checkoutUrl) return '';
    const paramTest = String(params.test || '').toLowerCase();
    const isTestParam = paramTest === 'true' || paramTest === '1';
    const envMerchant = Number(process.env.EXPO_PUBLIC_FLITT_MERCHANT_ID || 1549901);
    const envTest = String(process.env.EXPO_PUBLIC_FLITT_TEST_MODE ?? 'true') === 'true' || envMerchant === 1549901;
    const isTest = isTestParam || envTest;
    const merchantId = isTest ? 1549901 : envMerchant;
    // Flitt expects integer amount; many gateways use minor units. We'll multiply by 100 as a safe default.
    const minor = amount * 100;
    // Use real origin on web; neutral https on native (intercepted via success=true)
    const respUrl = (typeof window !== 'undefined' && Platform.OS === 'web')
      ? `${window.location.origin}/purchase?success=true`
      : 'https://example.com/behappy-purchase-success?success=true';
  const lang = toFlittLocale(language || 'en');
  const localesJson = JSON.stringify(Array.from(new Set([lang, 'en'])));
  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://pay.flitt.com/latest/checkout-vue/checkout.css" />
    <style>html,body,#app{height:100%;margin:0;padding:0;background:#0b0f19}</style>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://pay.flitt.com/latest/checkout-vue/checkout.js"></script>
    <script>
      (function(){
        try{
          var Options = {
            options: {
              methods: ['card'],
              active_tab: 'card',
              full_screen: true,
              show_pay_button_amount: true,
              show_title: true,
              show_link: false,
              locales: ${localesJson},
              theme: { type: 'dark', preset: 'black' },
              show_test_mode: ${isTest ? 'true' : 'false'},
            },
            params: {
              merchant_id: ${merchantId},
              currency: '${currency}',
              amount: ${minor},
              order_desc: 'Art Therapy Unlock',
              response_url: '${respUrl}'
            }
          };
          // Mount checkout
          // @ts-ignore
          window.checkout && window.checkout('#app', Options);
          // Detect success; notify parent window
          var __sent=false;
          setInterval(function(){
            try{
              var ok = /status=success|success=true/i.test(window.location.search || '');
              if(ok && !__sent){ __sent=true; window.parent && window.parent.postMessage('FLITT_SUCCESS','*'); }
            }catch(_e){}
          }, 600);
        }catch(e){
          document.body.style.background = '#1f2937';
          document.body.innerHTML = '<p style="color:#fff;padding:16px">Failed to load Flitt checkout.</p>';
        }
      })();
    </script>
  </body>
</html>`;
  }, [checkoutUrl, amount, currency, params.test, language, toFlittLocale]);

  // Web-only: render checkout directly in DOM (no iframe) to avoid bank redirect issues
  useEffect(() => {
    if (Platform.OS !== 'web') return;
  if (checkoutUrl) return; // direct URL path uses iframe/new tab logic

    const container = document.getElementById('flitt-web-root');
    if (!container) return;

    // Inject CSS if not already
    const cssId = 'flitt-checkout-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://pay.flitt.com/latest/checkout-vue/checkout.css';
      document.head.appendChild(link);
    }

    // Load script then init
    let mounted = true;
    const scriptId = 'flitt-checkout-js';
    const init = () => {
      try {
  const paramTest = String(params.test || '').toLowerCase();
  const isTestParam = paramTest === 'true' || paramTest === '1';
  const envMerchant = Number(process.env.EXPO_PUBLIC_FLITT_MERCHANT_ID || 1549901);
  const envTest = String(process.env.EXPO_PUBLIC_FLITT_TEST_MODE ?? 'true') === 'true' || envMerchant === 1549901;
  const isTest = isTestParam || envTest;
  const merchantId = isTest ? 1549901 : envMerchant;
        const minor = amount * 100;
        const respUrl = `${window.location.origin}/purchase?success=true`;
        const lang = toFlittLocale(language || 'en');
        const locales = Array.from(new Set([lang, 'en']));
        const Options: any = {
          options: {
            methods: ['card'],
            active_tab: 'card',
            full_screen: true,
            show_pay_button_amount: true,
            show_title: true,
            show_link: false,
            locales,
            theme: { type: 'dark', preset: 'black' },
            show_test_mode: isTest,
          },
          params: {
            merchant_id: merchantId,
            currency,
            amount: minor,
            order_desc: 'Art Therapy Unlock',
            response_url: respUrl,
          },
        };
        // @ts-ignore
        (window as any).checkout && (window as any).checkout('#flitt-web-root', Options);
      } catch (e) {
        console.warn('Flitt web embed init failed:', e);
      }
    };

    if (!(window as any).checkout) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://pay.flitt.com/latest/checkout-vue/checkout.js';
      script.onload = () => mounted && init();
      document.body.appendChild(script);
    } else {
      init();
    }

    return () => { mounted = false; };
  }, [checkoutUrl, amount, currency, params.test, language, toFlittLocale]);

  return (
    <LinearGradient colors={["#111827","#1f2937"]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Amount: {amount} {currency}</Text>
        </View>

        {checkoutUrl ? (
          <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginTop: 8 }}>
            {Platform.OS === 'web' ? (
              <View style={{ flex: 1 }}>
                <iframe src={checkoutUrl} style={{ width: '100%', height: '100%', border: '0' }} />
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#E5E7EB', marginBottom: 8 }}>If the checkout does not auto-close, click after finishing payment:</Text>
                  <TouchableOpacity disabled={loading} onPress={onSuccess} style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
                    <Text style={{ fontWeight: '800', color: '#062b21' }}>{loading ? 'Processing...' : 'I have completed payment'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <WebView
                ref={webRef}
                source={{ uri: checkoutUrl }}
                onShouldStartLoadWithRequest={(req) => {
                  if (req?.url?.startsWith('behappy://')) {
                    onSuccess();
                    return false;
                  }
                  return true;
                }}
                onNavigationStateChange={onWebNavChange}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loadingWrap}><ActivityIndicator size="large" color="#fff" /></View>
                )}
              />
            )}
          </View>
        ) : (
          <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: 16, marginTop: 8 }}>
            {Platform.OS === 'web' ? (
              // Render embedded checkout directly in DOM for web
              <div id="flitt-web-root" style={{ width: '100%', height: '100%' }} />
            ) : (
              <WebView
                ref={webRef}
                originWhitelist={["*"]}
                source={{ html: flittHtml, baseUrl: 'https://pay.flitt.com' }}
                onShouldStartLoadWithRequest={(req) => {
                  if (req?.url?.includes('success=true')) {
                    onSuccess();
                    return false;
                  }
                  return true;
                }}
                onNavigationStateChange={onWebNavChange}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loadingWrap}><ActivityIndicator size="large" color="#fff" /></View>
                )}
              />
            )}
          </View>
        )}
      </SafeAreaView>

      {isTestMode && (
        <View style={styles.testBar}>
          <Text style={styles.testBarText}>TEST MODE — If redirect fails in dev, use this to simulate success.</Text>
          <TouchableOpacity onPress={onSuccess} disabled={loading} style={styles.testBtn}>
            <Text style={styles.testBtnText}>{loading ? 'Processing...' : 'Mark as paid (TEST)'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 8, paddingHorizontal: 16 },
  title: { color: '#fff', fontWeight: '800', fontSize: 22 },
  subtitle: { color: '#D1D5DB', marginTop: 4 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.6)' },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151'
  },
  cardText: { color: '#E5E7EB' },
  payBtn: { marginTop: 16, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  payBtnText: { color: '#062b21', fontWeight: '800' },
  cancelBtn: { marginTop: 10, backgroundColor: '#374151', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#E5E7EB', fontWeight: '700' },
  errorText: { color: '#FCA5A5', marginTop: 10 },
  testBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'rgba(17,24,39,0.95)', borderTopWidth: 1, borderTopColor: '#374151' },
  testBarText: { color: '#E5E7EB', marginBottom: 8 },
  testBtn: { alignSelf: 'flex-start', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  testBtnText: { color: '#062b21', fontWeight: '800' }
});
