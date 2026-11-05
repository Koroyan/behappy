import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, Chip, Screen, space, TextField, useFeedback } from '@/design';
import { useT } from '@/i18n';
import { Gender, getUserProfile, saveUserProfile } from '@/services/userProfileService';

const GENDERS: Gender[] = ['female', 'male', 'other', 'prefer_not_to_say'];

export default function PersonalDetails() {
  const router = useRouter();
  const { t } = useT();
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('prefer_not_to_say');
  const [concerns, setConcerns] = useState('');
  const [health, setHealth] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (!p) return;
      setName(p.name ?? '');
      setAge(p.age ? String(p.age) : '');
      setGender(p.gender ?? 'prefer_not_to_say');
      setConcerns(p.mainConcerns ?? '');
      setHealth(p.healthConditions ?? '');
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const parsedAge = Number.parseInt(age, 10);
    await saveUserProfile({
      name: name.trim(),
      gender,
      age: Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 120 ? parsedAge : 0,
      mainConcerns: concerns.trim() || undefined,
      healthConditions: health.trim() || undefined,
    });
    setSaving(false);
    toast(t('personal.saved'));
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  return (
    <Screen back title={t('personal.title')} subtitle={t('personal.intro')} width="reading" keyboard testID="screen-personal">
      <Card padding={22}>
        <View style={{ gap: space[5] }}>
          <TextField label={t('personal.name')} value={name} onChangeText={setName} placeholder={t('personal.namePlaceholder')} autoComplete="given-name" testID="personal-name" />
          <TextField label={t('personal.age')} value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, '').slice(0, 3))} placeholder={t('personal.agePlaceholder')} keyboardType="number-pad" />
          <View style={{ gap: 8 }}>
            <AppText variant="smallStrong" color="textSecondary">
              {t('personal.gender')}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GENDERS.map((g) => (
                <Chip key={g} label={t(`personal.genders.${g}`)} selected={gender === g} onPress={() => setGender(g)} />
              ))}
            </View>
          </View>
          <TextField label={t('personal.concerns')} value={concerns} onChangeText={setConcerns} placeholder={t('personal.concernsPlaceholder')} multiline />
          <TextField label={t('personal.health')} value={health} onChangeText={setHealth} placeholder={t('personal.healthPlaceholder')} multiline />
          <Button label={t('common.save')} onPress={save} loading={saving} fullWidth testID="personal-save" />
        </View>
      </Card>
    </Screen>
  );
}
