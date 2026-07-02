# ართ თერაპიის გასწორებები

## შეასრულებული:
1. ✅ კლინიკური კონტექსტის სრული სისტემა - AI იცის ყველაფერი წინა სესიების შესახებ მაგრამ არ სვამს შედარებით კითხვებს

## დასასრულებელი:

### 1. Welcome Message-ის ენის პრობლემა
**პრობლემა:** პირველი მესიჯი რუსულად ჩნდება

**ფაილი:** `components/ArtTherapySessionChat.tsx` (line 336-351)

**გასასწორებელი კოდი:**
```typescript
// ძველი (line 336-351):
} else {
  const getByLang = (obj: Record<string, string>) => (obj as any)[language as AppLanguage] ?? obj.en;
  const title = getByLang(session.title);
  const desc = getByLang(session.description);
  const welcomeMessage: ChatMessage = {
    id: Date.now().toString(),
    content: `${pick(T.welcomePrefix, language as AppLanguage)} ${title}! ${desc}`,
    timestamp: new Date(),
    role: 'assistant'
  };
  setMessages([welcomeMessage]);

  // Persist initial message to start session progress
  await persistMessages(session.id, [welcomeMessage], 0);
}

// ახალი (უფრო მარტივი ფორმატი):
} else {
  // Use current language for all text
  const getByLang = (obj: Record<string, string>) => (obj as any)[language as AppLanguage] ?? obj.en;
  const title = getByLang(session.title);
  const desc = getByLang(session.description);
  // Simple format without complicated prefix
  const welcomeText = `${title}\n\n${desc}`;
  const welcomeMessage: ChatMessage = {
    id: Date.now().toString(),
    content: welcomeText,
    timestamp: new Date(),
    role: 'assistant'
  };
  setMessages([welcomeMessage]);

  // Persist initial message to start session progress
  await persistMessages(session.id, [welcomeMessage], 0);
}
```

### 2. პროგრესის Reset ფუნქციონალი

**დასამატებელი Localization Strings:** (line 69-ის შემდეგ)
```typescript
  continueNext: { en: 'Continue to next session', ka: 'გადადი შემდეგ სესიაზე', ru: 'Перейти к следующей сессии', hy: 'Շարունակել հաջորդ սեանսին', tr: 'Sonraki seansa devam et', az: 'Növbəti sessiyaya davam et', es: 'Continuar a la siguiente sesión', de: 'Weiter zur nächsten Sitzung', fr: 'Continuer vers la prochaine séance', pt: 'Continuar para a próxima sessão', id: 'Lanjut ke sesi berikutnya', it: 'Continua alla prossima sessione', ar: 'تابع إلى الجلسة التالية', hi: 'अगले सत्र पर जारी रखें', zh: '继续下一次会话', ja: '次のセッションへ進む', ko: '다음 세션으로 계속', uk: 'Продовжити до наступної сесії', pl: 'Kontynuuj do następnej sesji' },
  resetProgressTitle: { en: 'Reset Progress', ka: 'პროგრესის გადატვირთვა', ru: 'Сбросить прогресс', hy: 'Վերականգնել առաջխաղացումը', tr: 'İlerlemeyi sıfırla', az: 'Tərəqqini sıfırla', es: 'Restablecer progreso', de: 'Fortschritt zurücksetzen', fr: 'Réinitialiser la progression', pt: 'Redefinir progresso', id: 'Setel ulang kemajuan', it: 'Ripristina progresso', ar: 'إعادة تعيين التقدم', hi: 'प्रगति रीसेट करें', zh: '重置进度', ja: '進行状況をリセット', ko: '진행 상황 초기화', uk: 'Скинути прогрес', pl: 'Resetuj postęp' },
  resetProgressMsg: { en: 'Are you sure you want to reset this session? All messages and progress will be deleted. This cannot be undone.', ka: 'დარწმუნებული ხართ რომ გსურთ ამ სესიის გადატვირთვა? ყველა მესიჯი და პროგრესი წაიშლება. ეს მოქმედება შეუქცევადია.', ru: 'Вы уверены, что хотите сбросить эту сессию? Все сообщения и прогресс будут удалены. Это действие нельзя отменить.', hy: 'Վստահ եք, որ ցանկանում եք վերականգնել այս սեանսը: Բոլոր հաղորդագրությունները և առաջխաղացումը կջնջվեն: Սա հնարավոր չէ հետ շրջել։', tr: 'Bu seansı sıfırlamak istediğinizden emin misiniz? Tüm mesajlar ve ilerleme silinecektir. Bu işlem geri alınamaz.', az: 'Bu sessiyanı sıfırlamaq istədiyinizdən əminsiniz? Bütün mesajlar və tərəqqi silinəcək. Bunu geri qaytarmaq mümkün deyil.', es: '¿Estás seguro de que quieres restablecer esta sesión? Todos los mensajes y el progreso se eliminarán. Esta acción no se puede deshacer.', de: 'Bist du sicher, dass du diese Sitzung zurücksetzen möchtest? Alle Nachrichten und Fortschritte werden gelöscht. Dies kann nicht rückgängig gemacht werden.', fr: 'Êtes-vous sûr de vouloir réinitialiser cette séance ? Tous les messages et la progression seront supprimés. Cette action est irréversible.', pt: 'Tem certeza de que deseja redefinir esta sessão? Todas as mensagens e o progresso serão excluídos. Isso não pode ser desfeito.', id: 'Apakah Anda yakin ingin mereset sesi ini? Semua pesan dan kemajuan akan dihapus. Tindakan ini tidak dapat dibatalkan.', it: 'Sei sicuro di voler ripristinare questa sessione? Tutti i messaggi e i progressi verranno eliminati. Questa azione non può essere annullata.', ar: 'هل أنت متأكد أنك تريد إعادة تعيين هذه الجلسة؟ سيتم حذف جميع الرسائل والتقدم. لا يمكن التراجع عن هذا الإجراء.', hi: 'क्या आप वाकई इस सत्र को रीसेट करना चाहते हैं? सभी संदेश और प्रगति हटा दी जाएगी। इसे पूर्ववत नहीं किया जा सकता।', zh: '您确定要重置此会话吗？所有消息和进度将被删除。此操作无法撤销。', ja: 'このセッションをリセットしてもよろしいですか？すべてのメッセージと進行状況が削除されます。この操作は元に戻せません。', ko: '이 세션을 초기화하시겠습니까? 모든 메시지와 진행 상황이 삭제됩니다. 이 작업은 취소할 수 없습니다.', uk: 'Ви впевнені, що хочете скинути цю сесію? Усі повідомлення та прогрес буде видалено. Цю дію неможливо скасувати.', pl: 'Czy na pewno chcesz zresetować tę sesję? Wszystkie wiadomości i postępy zostaną usunięte. Tej operacji nie można cofnąć.' },
  cancel: { en: 'Cancel', ka: 'გაუქმება', ru: 'Отмена', hy: 'Չեղարկել', tr: 'İptal', az: 'Ləğv et', es: 'Cancelar', de: 'Abbrechen', fr: 'Annuler', pt: 'Cancelar', id: 'Batal', it: 'Annulla', ar: 'إلغاء', hi: 'रद्द करें', zh: '取消', ja: 'キャンセル', ko: '취소', uk: 'Скасувати', pl: 'Anuluj' },
  reset: { en: 'Reset', ka: 'გადატვირთვა', ru: 'Сბросить', hy: 'Վերականգնել', tr: 'Sıfırla', az: 'Sıfırla', es: 'Restablecer', de: 'Zurücksetzen', fr: 'Réinitialiser', pt: 'Redefinir', id: 'Setel ulang', it: 'Ripristina', ar: 'إعادة تعيين', hi: 'रीसेट', zh: '重置', ja: 'リセット', ko: '초기화', uk: 'Скинути', pl: 'Resetuj' },
```

**დასამატებელი Function:** (line 802-ის შემდეგ, `getHeaderTitle`-ის შემდეგ)
```typescript
  // Reset session progress with confirmation
  const handleResetProgress = useCallback(() => {
    if (!currentSession) return;
    
    Alert.alert(
      pick(T.resetProgressTitle, language as AppLanguage),
      pick(T.resetProgressMsg, language as AppLanguage),
      [
        {
          text: pick(T.cancel, language as AppLanguage),
          style: 'cancel'
        },
        {
          text: pick(T.reset, language as AppLanguage),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear session progress
              await ArtTherapyProgramManager.saveProgress(currentSession.id, {
                chatHistory: [],
                phase: 0,
                completed: false,
                clinicalSummary: undefined,
                completedAt: undefined
              });
              
              // Reload session
              await loadSessionData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error('Failed to reset progress:', e);
              Alert.alert(pick(T.error, language as AppLanguage), 'Failed to reset progress');
            }
          }
        }
      ]
    );
  }, [currentSession, language]);
```

**Header-ში Reset ღილაკი:** (line 945-ის მახლობლად, CommonHeader-ში)
```typescript
<CommonHeader 
  title={getHeaderTitle()}
  subtitle={isSessionComplete ? pick(T.sessionCompletedTitle, language as AppLanguage) : undefined}
  rightActions={
    <>
      {!readOnly && (
        <TouchableOpacity onPress={handleResetProgress} style={{ marginRight: 12 }}>
          <FontAwesome5 name="redo" size={18} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
      )}
      {isSessionComplete && currentSession && (
        <View style={[styles.completeBadge, { backgroundColor: currentSession.color }]}>
          <Text style={styles.completeBadgeText}>✓</Text>
        </View>
      )}
    </>
  }
/>
```

## როგორ გავასწოროთ:

1. გახსენით `components/ArtTherapySessionChat.tsx`
2. დაამატეთ ზემოთ მოცემული strings line 69-ის შემდეგ
3. შეცვალეთ welcome message formation (line 336-351)
4. დაამატეთ `handleResetProgress` function (line 802-ის შემდეგ)
5. განაახლეთ CommonHeader rightActions (line 945)
