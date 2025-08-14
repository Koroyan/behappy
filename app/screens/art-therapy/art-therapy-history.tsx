import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Type definition for art therapy sessions
interface ArtTherapySession {
  id: string;
  imageUri: string;
  date: string;
  conversation: string[];
}

export default function ArtTherapyHistoryScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [sessions, setSessions] = useState<ArtTherapySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ArtTherapySession | null>(null);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [isConversationViewVisible, setIsConversationViewVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const storedSessions = await AsyncStorage.getItem('artTherapySessions');
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю сеансов');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (id: string) => {      Alert.alert(
      'Удаление',
      'Вы уверены, что хотите удалить этот сеанс?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedSessions = sessions.filter(session => session.id !== id);
              await AsyncStorage.setItem('artTherapySessions', JSON.stringify(updatedSessions));
              setSessions(updatedSessions);
            } catch (error) {
              console.error('Failed to save after deletion:', error);
              Alert.alert('Ошибка', 'Не удалось удалить сеанс');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: ArtTherapySession }) => (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: theme.colors.card }]}
      onPress={() => {
        setSelectedSession(item);
        setIsConversationViewVisible(true);
      }}
    >
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => {
          setSelectedSession(item);
          if (item.imageUri && item.imageUri !== 'web') {
            setIsImageViewVisible(true);
          } else {
            setIsConversationViewVisible(true);
          }
        }}
      >
        {item.imageUri && item.imageUri !== 'web' ? (
          <>
            <Image 
              source={{ uri: item.imageUri }} 
              style={styles.thumbnail}
              onError={(error) => console.error('Image loading error:', error)} 
            />
            <View style={styles.viewOverlay}>
              <Text style={styles.viewText}>Просмотр</Text>
            </View>
          </>
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.colors.border }]}>
            <FontAwesome5 name="paint-brush" size={24} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' }}>
              Веб-версия
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.sessionInfo}>
        <Text style={[styles.sessionDate, { color: theme.colors.text }]}>{item.date}</Text>
        <Text style={[styles.sessionSummary, { color: theme.colors.textSecondary }]}>
          {`${item.conversation.length} შეტყობინება`}
        </Text>
        <View style={styles.messagePreview}>
          <Text style={[styles.previewText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.conversation[0]?.substring(0, 100)}...
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => {
              setSelectedSession(item);
              setIsConversationViewVisible(true);
            }}
          >
            <FontAwesome5 name="comments" size={12} color="#ffffff" />
            <Text style={styles.actionText}>Диалог</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={() => {
              Alert.alert(
                'Предупреждение',
                'Вы уверены, что хотите удалить этот сеанс?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => deleteSession(item.id)
                  }
                ],
                { cancelable: true }
              );
            }}
          >
            <FontAwesome5 name="trash" size={12} color="#ffffff" />
            <Text style={styles.actionText}>Удалить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
      backgroundColor: theme.colors.header,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    backButton: {
      padding: 8,
    },
    placeholderRight: {
      width: 40,
    },
    sessionCard: {
      flexDirection: 'row',
      margin: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    imageContainer: {
      width: 100,
      height: 120,
      backgroundColor: theme.colors.border,
    },
    thumbnail: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    placeholderImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.border,
    },
    viewOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 4,
    },
    viewText: {
      color: '#ffffff',
      fontSize: 12,
      textAlign: 'center',
    },
    sessionInfo: {
      flex: 1,
      padding: 12,
      justifyContent: 'space-between',
    },
    sessionDate: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    sessionSummary: {
      fontSize: 14,
      marginBottom: 8,
    },
    messagePreview: {
      marginBottom: 8,
    },
    previewText: {
      fontSize: 13,
      lineHeight: 18,
      opacity: 0.8,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    actionText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: {
      width: width * 0.9,
      height: width * 0.9,
      borderRadius: 12,
    },
    closeButton: {
      position: 'absolute',
      top: 40,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 12,
      borderRadius: 20,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    conversationContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    conversationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
      backgroundColor: theme.colors.header,
    },
    conversationTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    conversationContent: {
      padding: 16,
    },
    message: {
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      maxWidth: '90%',
    },
    therapistMessage: {
      backgroundColor: theme.colors.card,
      alignSelf: 'flex-start',
      borderTopLeftRadius: 4,
    },
    userMessage: {
      backgroundColor: theme.colors.accent,
      alignSelf: 'flex-end',
      borderTopRightRadius: 4,
    },
    therapistText: {
      color: theme.colors.text,
      fontSize: 16,
    },
    userText: {
      color: '#ffffff',
      fontSize: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>История арт-терапии</Text>
        <View style={styles.placeholderRight} />
      </View>

      {/* List of Sessions */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="spinner" size={40} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Загрузка истории сеансов...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="paint-brush" size={40} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>У вас пока нет сохраненных сеансов арт-терапии.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: theme.spacing.md }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Full-screen Image Modal */}
      <Modal
        visible={isImageViewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageViewVisible(false)}
      >
        <View style={styles.modalContainer}>
          {selectedSession && selectedSession.imageUri && selectedSession.imageUri !== 'web' && (
            <Image
              source={{ uri: selectedSession.imageUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsImageViewVisible(false)}
          >
            <FontAwesome5 name="times" size={20} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 40,
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 20,
            }}
            onPress={() => {
              setIsImageViewVisible(false);
              setTimeout(() => setIsConversationViewVisible(true), 300);
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 16 }}>
              Просмотреть диалог
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Conversation View Modal */}
      <Modal
        visible={isConversationViewVisible}
        animationType="slide"
        onRequestClose={() => setIsConversationViewVisible(false)}
      >
        <SafeAreaView style={styles.conversationContainer}>
          <View style={styles.conversationHeader}>
            <TouchableOpacity onPress={() => setIsConversationViewVisible(false)}>
              <FontAwesome5 name="arrow-left" size={18} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.conversationTitle}>Диалог терапии</Text>
            <View style={{ width: 18 }} />
          </View>

          {selectedSession && (
            <FlatList
              data={selectedSession.conversation}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.conversationContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <>
                  <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
                    {selectedSession.imageUri && selectedSession.imageUri !== 'web' ? (
                      <TouchableOpacity 
                        onPress={() => {
                          setIsConversationViewVisible(false);
                          setTimeout(() => setIsImageViewVisible(true), 300);
                        }}
                      >
                        <Image source={{ uri: selectedSession.imageUri }} style={styles.thumbnail} />
                        <View style={styles.viewOverlay}>
                          <Text style={styles.viewText}>Увеличить</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.placeholderImage, { backgroundColor: theme.colors.border }]}>
                        <FontAwesome5 name="paint-brush" size={24} color={theme.colors.textSecondary} />
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                          Рисунок недоступен
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={{
                        marginTop: 8,
                        backgroundColor: theme.colors.accent,
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        borderRadius: 16,
                      }}
                      onPress={() => {
                        if (selectedSession.imageUri && selectedSession.imageUri !== 'web') {
                          setIsConversationViewVisible(false);
                          setTimeout(() => setIsImageViewVisible(true), 300);
                        }
                      }}
                      disabled={!selectedSession.imageUri || selectedSession.imageUri === 'web'}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 14 }}>
                        {selectedSession.imageUri && selectedSession.imageUri !== 'web' ? 'Просмотреть рисунок' : 'Рисунок недоступен'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              renderItem={({ item, index }) => (
                <View style={[
                  styles.message,
                  index % 2 === 0 ? styles.therapistMessage : styles.userMessage
                ]}>
                  <Text style={index % 2 === 0 ? styles.therapistText : styles.userText}>
                    {item}
                  </Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
