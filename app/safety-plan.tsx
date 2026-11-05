/**
 * /safety-plan — the person's own plan for hard moments (warning signs, what
 * helps, who to call). Local only; reachable from "Get help now" and Explore.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { AppText, Banner, Button, Card, Icon, IconButton, Screen, space, TextField, useTheme } from '@/design';
import { useT } from '@/i18n';
import { addPlanItem, CONTACT_SECTIONS, dialable, loadSafetyPlan, PLAN_SECTIONS, PlanSectionKey, removePlanItem, SafetyPlan, SAFETY_PLAN_TOPIC } from '@/lib/storage/safetyPlan';
import { subscribe } from '@/lib/storage/json';

function SectionCard({ index, section, plan, onChange }: { index: number; section: PlanSectionKey; plan: SafetyPlan; onChange: (p: SafetyPlan) => void }) {
  const { t } = useT();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const isContact = CONTACT_SECTIONS.has(section);
  const items = plan.sections[section];

  const add = async () => {
    if (!text.trim()) return;
    onChange(await addPlanItem(section, text, phone));
    setText('');
    setPhone('');
  };

  return (
    <Card padding={20} testID={`plan-${section}`}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="smallStrong" color="onPrimarySoft">
            {index + 1}
          </AppText>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText variant="title3">{t(`safetyPlan.sections.${section}.title`)}</AppText>
          <AppText variant="small" color="textSecondary">
            {t(`safetyPlan.sections.${section}.hint`)}
          </AppText>
        </View>
      </View>

      <View style={{ gap: 8, marginTop: space[4] }}>
        {items.length ? (
          items.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.surfaceMuted }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="body">{item.text}</AppText>
                {item.phone ? (
                  <AppText variant="small" color="textSecondary">
                    {item.phone}
                  </AppText>
                ) : null}
              </View>
              {item.phone ? <Button label={t('safetyPlan.call')} icon="call-outline" size="sm" variant="secondary" onPress={() => Linking.openURL(`tel:${dialable(item.phone!)}`)} /> : null}
              <IconButton icon="close" label={t('safetyPlan.remove')} size={36} onPress={async () => onChange(await removePlanItem(section, item.id))} />
            </View>
          ))
        ) : (
          <AppText variant="small" color="textTertiary">
            {t('safetyPlan.empty')}
          </AppText>
        )}
      </View>

      <View style={{ gap: 8, marginTop: space[3] }}>
        <TextField value={text} onChangeText={setText} placeholder={t(`safetyPlan.sections.${section}.placeholder`)} onSubmitEditing={isContact ? undefined : add} returnKeyType={isContact ? 'next' : 'done'} maxLength={300} testID={`plan-input-${section}`} />
        {isContact ? <TextField value={phone} onChangeText={setPhone} placeholder={t('safetyPlan.phonePlaceholder')} keyboardType="phone-pad" onSubmitEditing={add} maxLength={40} /> : null}
        <Button label={t('safetyPlan.add')} icon="add" size="sm" variant="outline" onPress={add} disabled={!text.trim()} style={{ alignSelf: 'flex-start' }} testID={`plan-add-${section}`} />
      </View>
    </Card>
  );
}

export default function SafetyPlanScreen() {
  const router = useRouter();
  const { t, formatDate } = useT();
  const [plan, setPlan] = useState<SafetyPlan | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => loadSafetyPlan().then((p) => alive && setPlan(p));
    load();
    const off = subscribe(SAFETY_PLAN_TOPIC, load);
    return () => {
      alive = false;
      off();
    };
  }, []);

  return (
    <Screen back title={t('safetyPlan.title')} subtitle={t('safetyPlan.subtitle')} width="reading" keyboard testID="screen-safety-plan">
      <View style={{ gap: space[4] }}>
        <Card tone="muted" padding={20}>
          <AppText variant="body">{t('safetyPlan.intro')}</AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: space[3], alignItems: 'flex-start' }}>
            <Icon name="lock-closed-outline" size={16} color="textSecondary" />
            <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
              {t('safetyPlan.privacy')}
            </AppText>
          </View>
        </Card>

        {plan ? PLAN_SECTIONS.map((section, i) => <SectionCard key={section} index={i} section={section} plan={plan} onChange={setPlan} />) : null}

        {plan?.updatedAt ? (
          <AppText variant="caption" color="textTertiary">
            {t('safetyPlan.updated', { date: formatDate(plan.updatedAt, { day: 'numeric', month: 'long', year: 'numeric' }) })}
          </AppText>
        ) : null}
        <AppText variant="caption" color="textTertiary">
          {t('safetyPlan.basedOn')}
        </AppText>
        <Banner tone="danger" body={t('safetyPlan.emergency')} action={<Button label={t('safety.title')} size="sm" variant="danger" icon="heart-outline" onPress={() => router.push('/safety')} />} />
      </View>
    </Screen>
  );
}
