// This file contains the fixed handleSendMessage and handleImagePicker
// to prevent refresh issues when uploading images

// The fix: Remove `messages` from useCallback dependencies and use functional updates everywhere

const handleSendMessage = useCallback(async (imageUri?: string, imageBase64?: string) => {
  if (readOnly) {
    Alert.alert(
      pick(T.sessionCompletedTitle, language as AppLanguage),
      pick(T.readOnlyMsg, language as AppLanguage)
    );
    return;
  }
  if (!inputText.trim() && !imageUri && !imageBase64) return;

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    content: inputText.trim(),
    timestamp: new Date(),
    role: 'user',
    imageUri,
    imageBase64
  };

  // Use functional update to get latest messages
  setMessages(prev => [...prev, userMessage]);
  setInputText('');
  setIsTyping(true);
  setIsStreaming(true);
  setReceivedFirstDelta(false);

  try {
    // Get current messages state for persistence
    setMessages(currentMsgs => {
      const newMessages = [...currentMsgs];
      
      // Persist user message immediately (async but don't await here)
      if (currentSession) {
        persistMessages(currentSession.id, newMessages, (sessionProgress?.phase ?? 0) as 0 | 1 | 2);
      }

      // Create placeholder assistant message to stream into
      const aiId = (Date.now() + 1).toString();
      const placeholder: ChatMessage = {
        id: aiId,
        content: '',
        timestamp: new Date(),
        role: 'assistant'
      };
      
      // Add placeholder and continue async processing outside setState
      setTimeout(async () => {
        try {
          const sessionTheme = currentSession
            ? ((currentSession.theme as any)[language as AppLanguage] ?? currentSession.theme.en)
            : 'General Art Therapy';

          const longitudinalCtx = await buildMemoryContext();
          const response = await artTherapyService.sendMessageStream(
            newMessages,
            sessionTheme,
            language as AppLanguage,
            (sessionProgress?.phase ?? 0) as 0 | 1 | 2,
            (partial) => {
              // Stream partial response_text into placeholder
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: partial } : m));
              if (!receivedFirstDelta) {
                setReceivedFirstDelta(true);
                setIsTyping(false);
              }
            },
            longitudinalCtx
          );

          // Finalize assistant message with clinical data
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: response.response_text, clinicalData: response } : m));

          // Persist AI message and phase progression
          if (currentSession) {
            const updated = [...newMessages, { ...placeholder, content: response.response_text, clinicalData: response }];
            await persistMessages(currentSession.id, updated, (response.session_phase ?? 0) as 0 | 1 | 2, response);
          }

          // Check for session completion
          if (response.session_complete && currentSession && !isSessionComplete) {
            await ArtTherapyProgramManager.completeSession(
              currentSession.id,
              response,
              [...newMessages, { ...placeholder, content: response.response_text, clinicalData: response }]
            );
            setIsSessionComplete(true);
            setInputText('');
            setIsTyping(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch (error) {
          console.error('Error sending message:', error);
          Alert.alert(pick(T.error, language as AppLanguage), pick(T.failedToSend, language as AppLanguage));
        } finally {
          setIsTyping(false);
          setIsStreaming(false);
        }
      }, 0);
      
      return [...newMessages, placeholder];
    });
  } catch (error) {
    console.error('Error preparing message:', error);
    setIsTyping(false);
    setIsStreaming(false);
  }
}, [inputText, currentSession, language, sessionProgress, isSessionComplete, readOnly, buildMemoryContext]);

// handleImagePicker stays the same but now dependencies are correct
const handleImagePicker = useCallback(async () => {
  if (readOnly) {
    Alert.alert(
      pick(T.sessionCompletedTitle, language as AppLanguage),
      pick(T.readOnlyMsg, language as AppLanguage)
    );
    return;
  }
  try {
    if (Platform.OS !== 'web') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          pick(T.needPermissionTitle, language as AppLanguage),
          pick(T.needGalleryAccess, language as AppLanguage)
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const prepared = await artTherapyService.prepareImageForAPI(asset as any);
      setLastImage(prepared);
      await handleSendMessage(prepared.displayUri, prepared.base64);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert(pick(T.error, language as AppLanguage), pick(T.imagePickFailed, language as AppLanguage));
  }
}, [handleSendMessage, language, readOnly]);
