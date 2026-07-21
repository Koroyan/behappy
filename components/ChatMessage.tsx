import React from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { AppLanguage, useLanguage } from '../contexts/LanguageContext';
import { ChatMessage as ChatMessageType } from '../services/aiTherapyService';
import { TherapyBorderRadius, TherapyColors, therapyStyles } from '../styles/therapyStyles';
import TherapeuticAnimation from './TherapeuticAnimation';

const cmPick = (obj: Record<string, string>, lang: AppLanguage): string => obj[lang] ?? obj.en;

interface ChatMessageProps {
  message: ChatMessageType;
  onInteractionComplete?: (data: any) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onInteractionComplete,
}) => {
  const { language } = useLanguage();

  const isUser = message.type === 'user';
  const aiResponse = message.aiResponse;

  // Dynamic theme based on therapeutic method and emotion
  const getMessageTheme = () => {
    if (isUser) return null;
    if (!aiResponse) return null;

    const methodColors: { [key: string]: string } = {
      'CBT': '#E3F2FD', // Light blue - cognitive
      'DBT': '#F3E5F5', // Light purple - dialectical
      'EMDR': '#FFF3E0', // Light orange - processing
      'IFS': '#E8F5E9', // Light green - internal family
      'Somatic': '#FFF9C4', // Light yellow - body-based
      'Mindfulness': '#F1F8E9', // Very light green - calm
      'Crisis': '#FFEBEE', // Light red - urgent
    };

    const emotionBorder: { [key: string]: string } = {
      'anxious': '#4FC3F7', // calming blue
      'sad': '#BA68C8', // gentle purple
      'angry': '#FFB74D', // warm orange
      'positive': '#81C784', // uplifting green
      'calm': '#AED581', // peaceful green
      'welcoming': '#64B5F6', // friendly blue
    };

    const baseColor = methodColors[aiResponse.technique?.method] || '#F8F9FA';
    const borderColor = emotionBorder[aiResponse.detected_emotion] || '#E0E0E0';

    return {
      backgroundColor: baseColor,
      borderLeftColor: borderColor,
      borderLeftWidth: 3,
    };
  };

  const renderTechniqueBadge = () => null;

  const renderMessageContent = () => {
    const getAnimationType = (): 'breathing' | 'heart' | 'lotus' | 'waves' | 'gentle_pulse' | null => {
      if (!aiResponse) return null;
      
      const emotion = typeof aiResponse.detected_emotion === 'string'
        ? aiResponse.detected_emotion.toLowerCase()
        : '';
      const content = typeof message.content === 'string'
        ? message.content.toLowerCase()
        : JSON.stringify(message.content || '').toLowerCase();
      
      // Gentle animations based on emotional context
      if (emotion === 'anxious' && content.includes('breath')) return 'breathing';
      if (emotion === 'sad' || content.includes('support')) return 'heart';
      if (content.includes('mindful') || content.includes('meditat')) return 'lotus';
      if (content.includes('calm') || content.includes('peace')) return 'waves';
      if (content.includes('hope') || content.includes('strength')) return 'gentle_pulse';
      
      return null;
    };

    return (
      <View>
        {/* Gentle animation for supportive messages */}
        {!isUser && getAnimationType() && (
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <TherapeuticAnimation 
              type={getAnimationType()!}
              size={30}
              color={TherapyColors.healing}
            />
          </View>
        )}
        
        <Text style={isUser ? therapyStyles.userMessageText : therapyStyles.aiMessageText}>
          {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
        </Text>
        
        {message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            style={{
              width: 200,
              height: 200,
              borderRadius: TherapyBorderRadius.md,
              marginTop: 8,
            }}
            resizeMode="cover"
          />
        )}
      </View>
    );
  };

  const renderTimestamp = () => {
    const ts = typeof message.timestamp === 'string' ? new Date(message.timestamp) : (message.timestamp instanceof Date ? message.timestamp : new Date());
    const timeString = ts.toLocaleTimeString('en', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Text style={[
        therapyStyles.caption,
        {
          textAlign: isUser ? 'right' : 'left',
          marginTop: 4,
          marginHorizontal: 16,
        }
      ]}>
        {timeString}
      </Text>
    );
  };

  const renderEmergencyAlert = () => {
    if (!aiResponse?.emergency_info || !aiResponse.emergency_info.ui_alert) return null;

    const alertLevel = aiResponse.emergency_info.ui_alert;
    const alertColor = alertLevel === 'EMERGENCY' ? '#FF4444' : '#FF8800';

    return (
      <View style={[therapyStyles.emergencyAlert, { borderColor: alertColor }]}>
        <Text style={[therapyStyles.emergencyTitle, { color: alertColor }]}>
          {alertLevel === 'EMERGENCY'
            ? cmPick({ en: '🚨 Emergency', ru: '🚨 Экстренная помощь', ka: '🚨 სასწრაფო დახმარება', tr: '🚨 Acil Durum', az: '🚨 Təcili', es: '🚨 Emergencia', de: '🚨 Notfall', fr: '🚨 Urgence', pt: '🚨 Emergência', id: '🚨 Darurat', it: '🚨 Emergenza', ar: '🚨 طوارئ', hi: '🚨 आपात', zh: '🚨 紧急', ja: '🚨 緊急', ko: '🚨 긴급', uk: '🚨 Екстрена допомога', pl: '🚨 Nagły przypadek' } as Record<string,string>, language)
            : cmPick({ en: '🚨 Attention', ru: '🚨 Внимание', ka: '🚨 ყურადღება', tr: '🚨 Dikkat', az: '🚨 Diqqət', es: '🚨 Atención', de: '🚨 Achtung', fr: '🚨 Attention', pt: '🚨 Atenção', id: '🚨 Perhatian', it: '🚨 Attenzione', ar: '🚨 تنبيه', hi: '🚨 ध्यान', zh: '🚨 注意', ja: '🚨 注意', ko: '🚨 주의', uk: '🚨 Увага', pl: '🚨 Uwaga' } as Record<string,string>, language)}
        </Text>
        <Text style={therapyStyles.emergencyText}>
          {aiResponse.emergency_info.safety_plan}
        </Text>
        <Text style={therapyStyles.emergencyContacts}>
          📞 {aiResponse.emergency_info.emergency_contacts}
        </Text>
        <TouchableOpacity 
          style={[therapyStyles.emergencyButton, { backgroundColor: alertColor }]}
          onPress={() => {
            Alert.alert(
              cmPick({ en: 'Emergency Services', ru: 'Экстренные службы', ka: 'სასწრაფო სამსახური', tr: 'Acil Servis', az: 'Təcili Yardım', es: 'Emergencias', de: 'Notfall', fr: "Services d'Urgence", pt: 'Emergência', id: 'Darurat', it: 'Emergenza', ar: 'طوارئ', hi: 'आपात', zh: '紧急服务', ja: '緊急サービス', ko: '긴급 서비스', uk: 'Екстрені служби', pl: 'Ratownictwo' } as Record<string,string>, language),
              cmPick({ en: 'Do you want to call emergency services now?', ru: 'Хотите позвонить в экстренные службы?', ka: 'გსურთ ახლა დარეკვა სასწრაფო სამსახურში?', tr: 'Şimdi acil servisi aramak ister misiniz?', az: 'İndi təcili yardımı çağırmaq istəyirsiniz?', es: '¿Llamar a emergencias ahora?', de: 'Jetzt Notfalldienst anrufen?', fr: "Appeler les services d'urgence?", pt: 'Ligar para emergências agora?', id: 'Hubungi layanan darurat sekarang?', it: 'Chiamare i servizi di emergenza?', ar: 'هل تريد الاتصال بالطوارئ؟', hi: 'क्या अभी आपातकालीन सेवा को कॉल करें?', zh: '现在拨打紧急服务吗？', ja: '今すぐ緊急サービスに電話しますか？', ko: '지금 긴급 서비스에 전화하시겠습니까?', uk: 'Зателефонувати до екстрених служб?', pl: 'Zadzwonić do służb ratunkowych?' } as Record<string,string>, language),
              [
                { text: cmPick({ en: 'Cancel', ru: 'Отмена', ka: 'გაუქმება', tr: 'İptal', az: 'Ləğv et', es: 'Cancelar', de: 'Abbrechen', fr: 'Annuler', pt: 'Cancelar', id: 'Batal', it: 'Annulla', ar: 'إلغاء', hi: 'रद्द', zh: '取消', ja: 'キャンセル', ko: '취소', uk: 'Скасувати', pl: 'Anuluj' } as Record<string,string>, language), style: 'cancel' },
                { text: cmPick({ en: '📞 Call', ru: '📞 Позвонить', ka: '📞 დარეკვა', tr: '📞 Ara', az: '📞 Zəng', es: '📞 Llamar', de: '📞 Anrufen', fr: '📞 Appeler', pt: '📞 Ligar', id: '📞 Hubungi', it: '📞 Chiama', ar: '📞 اتصال', hi: '📞 कॉल', zh: '📞 拨打', ja: '📞 電話', ko: '📞 전화', uk: '📞 Подзвонити', pl: '📞 Zadzwoń' } as Record<string,string>, language), onPress: () => console.log('Calling emergency services') }
              ]
            );
          }}
        >
          <Text style={therapyStyles.emergencyButtonText}>
            {cmPick({ en: '📞 Call', ru: '📞 Позвонить', ka: '📞 დარეკვა', tr: '📞 Ara', az: '📞 Zəng', es: '📞 Llamar', de: '📞 Anrufen', fr: '📞 Appeler', pt: '📞 Ligar', id: '📞 Hubungi', it: '📞 Chiama', ar: '📞 اتصال', hi: '📞 कॉल', zh: '📞 拨打', ja: '📞 電話', ko: '📞 전화', uk: '📞 Подзвонити', pl: '📞 Zadzwoń' } as Record<string,string>, language)}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View>
      {/* Emergency alert for crisis situations */}
      {!isUser && renderEmergencyAlert()}

      {/* Main message bubble with dynamic theme */}
      <View style={[
        therapyStyles.messageBubble,
        isUser ? therapyStyles.userMessageBubble : therapyStyles.aiMessageBubble,
        !isUser && getMessageTheme(),
      ]}>
        {/* Technique badge removed - no longer shown to client */}
        {renderTechniqueBadge()}
        
        {/* Message content */}
        {renderMessageContent()}
        
        {/* Key insights hidden from user - only for internal processing */}
        {/* 
        {!isUser && aiResponse?.key_insights && aiResponse.key_insights.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={[therapyStyles.caption, { fontWeight: '600', marginBottom: 4 }]}>
              Insights:
            </Text>
            {aiResponse.key_insights.map((insight, index) => (
              <Text key={index} style={[therapyStyles.caption, { marginLeft: 8 }]}>
                • {insight}
              </Text>
            ))}
          </View>
        )}
        */}
      </View>

      {/* Timestamp */}
      {renderTimestamp()}

    </View>
  );
};

export default ChatMessage;