import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText, Button, EmptyState, Press, Screen, Sheet, space, useFeedback, useLayout, useTheme } from '@/design';
import { useT } from '@/i18n';
import { Artwork, deleteArtwork, exportArtwork, listArtworks } from '@/lib/media/artworkStore';

export default function ArtGallery() {
  const { t, formatDate } = useT();
  const { colors } = useTheme();
  const { width, sidebarWidth, gutter, isCompact } = useLayout();
  const { confirm } = useFeedback();
  const [items, setItems] = useState<Artwork[]>([]);
  const [open, setOpen] = useState<Artwork | null>(null);

  const load = useCallback(() => {
    listArtworks().then(setItems);
  }, []);
  useFocusEffect(load);

  const columns = isCompact ? 2 : width - sidebarWidth > 1100 ? 4 : 3;
  const available = Math.min(width - sidebarWidth - gutter * 2, 1080);
  const size = (available - space[3] * (columns - 1)) / columns;

  const remove = async (a: Artwork) => {
    if (!(await confirm({ title: t('common.delete'), confirmLabel: t('common.delete'), destructive: true }))) return;
    await deleteArtwork(a.id);
    setOpen(null);
    load();
  };

  return (
    <Screen back title={t('art.gallery.title')} subtitle={t('art.gallery.subtitle')} testID="screen-art-gallery">
      {items.length === 0 ? (
        <EmptyState icon="images-outline" title={t('art.gallery.empty')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          {items.map((a) => (
            <Press key={a.id} onPress={() => setOpen(a)} feedback="scale" accessibilityLabel={t('art.gallery.fromSession', { number: a.sessionId })} style={{ width: size, gap: 6 }}>
              <Image source={{ uri: a.uri }} contentFit="cover" style={{ width: size, height: size, borderRadius: 18, backgroundColor: colors.surfaceSunken }} />
              <AppText variant="caption" color="textSecondary">
                {t('art.gallery.fromSession', { number: a.sessionId })} · {formatDate(a.createdAt, { day: 'numeric', month: 'short' })}
              </AppText>
            </Press>
          ))}
        </View>
      )}
      <Sheet
        visible={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? t('art.gallery.fromSession', { number: open.sessionId }) : undefined}
        maxWidth={720}
        footer={
          open ? (
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Button label={Platform.OS === 'web' ? t('art.gallery.download') : t('art.gallery.shareImage')} icon={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} onPress={() => exportArtwork(open)} />
              <Button label={t('common.delete')} icon="trash-outline" variant="danger" onPress={() => remove(open)} />
            </View>
          ) : null
        }
      >
        {open ? <Image source={{ uri: open.uri }} contentFit="contain" style={{ width: '100%', aspectRatio: 1, borderRadius: 18, backgroundColor: colors.surfaceSunken }} /> : null}
      </Sheet>
    </Screen>
  );
}
