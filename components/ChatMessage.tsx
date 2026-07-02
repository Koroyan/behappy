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
      
      {/* Motivational Card - shown above AI message */}
      {!isUser && aiResponse?.motivational_message && (
        <View style={{
          marginHorizontal: 16,
          marginBottom: 8,
          padding: 14,
          backgroundColor: aiResponse.motivational_message.tone === 'grounding' 
            ? '#F0F4F8'  // calm blue-gray for grounding
            : aiResponse.motivational_message.tone === 'gentle'
            ? '#FFF5F7'  // soft pink for gentle
            : aiResponse.motivational_message.tone === 'uplifting'
            ? '#FFFBF0'  // warm yellow for uplifting
            : '#F0FFF4', // fresh green for empowering
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: aiResponse.motivational_message.tone === 'grounding'
            ? '#64B5F6'  // blue
            : aiResponse.motivational_message.tone === 'gentle'
            ? '#E91E63'  // pink
            : aiResponse.motivational_message.tone === 'uplifting'
            ? '#FFB74D'  // orange
            : '#66BB6A', // green
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>
              {aiResponse.motivational_message.tone === 'grounding' ? '🌊' :
               aiResponse.motivational_message.tone === 'gentle' ? '💝' :
               aiResponse.motivational_message.tone === 'uplifting' ? '✨' : '💪'}
            </Text>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: aiResponse.motivational_message.tone === 'grounding'
                ? '#1976D2'
                : aiResponse.motivational_message.tone === 'gentle'
                ? '#C2185B'
                : aiResponse.motivational_message.tone === 'uplifting'
                ? '#F57C00'
                : '#388E3C',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}>
              {cmPick(({
                grounding: { en: 'Grounding', ru: 'Заземление', ka: 'დამყარება', hy: 'Հիմնում', tr: 'Dengeleme', az: 'Zəmin', es: 'Arraigo', de: 'Erdung', fr: 'Ancrage', pt: 'Aterramento', id: 'Pemijakan', it: 'Radicamento', ar: 'تأريض', hi: 'ग्राउंडिंग', zh: '入地', ja: 'グラウンディング', ko: '안정', uk: 'Заземлення', pl: 'Uziemienie' },
                gentle:    { en: 'Gentle Support', ru: 'Мягкая поддержка', ka: 'თბილი მხარდაჭერა', hy: 'Նուրբ Աջakцутyun', tr: 'Nazik Destek', az: 'Yumşaq Dəstək', es: 'Apoyo Suave', de: 'Sanfte Unterstützung', fr: 'Soutien Doux', pt: 'Apoio Gentil', id: 'Dukungan Lembut', it: 'Supporto Gentile', ar: 'دعم لطيف', hi: 'कोमल सहारा', zh: '温柔支持', ja: '優しいサポート', ko: '부드러운 지원', uk: "М'яка підтримка", pl: 'Delikatne Wsparcie' },
                uplifting: { en: 'Uplifting', ru: 'Воодушевляющее', ka: 'გამახალისებელი', hy: 'Ոգelnatnyun', tr: 'Yükseltici', az: 'Ruhlandırıcı', es: 'Elevador', de: 'Aufmunternd', fr: 'Édifiant', pt: 'Elevador', id: 'Membangkitkan', it: 'Edificante', ar: 'رافع', hi: 'उत्साहवर्धक', zh: '振奋', ja: '高揚感', ko: '업리프팅', uk: 'Підбадьорливе', pl: 'Wzniosły' },
                empowering: { en: 'Empowering', ru: 'Укрепляющее', ka: 'გაძლიერება', hy: 'Oozhegorcyun', tr: 'Güçlendirici', az: 'Gücləndirc', es: 'Potenciador', de: 'Stärkend', fr: 'Autonomisant', pt: 'Empoderador', id: 'Memberdayakan', it: 'Potenziante', ar: 'تمكيني', hi: 'सशक्तिकरण', zh: '赋能', ja: 'エンパワーメント', ko: '역량강화', uk: 'Надихаюче', pl: 'Wzmacniający' },
              } as Record<string, Record<string,string>>)[aiResponse.motivational_message.tone] || { en: aiResponse.motivational_message.tone }, language)}
            </Text>
          </View>
          <Text style={{
            fontSize: 15,
            lineHeight: 22,
            color: '#2D3748',
            fontStyle: 'italic',
            fontWeight: '500',
            letterSpacing: 0.2,
          }}>
            "{aiResponse.motivational_message.short_quote}"
          </Text>
          {aiResponse.motivational_message.psychological_basis && (
            <Text style={{
              fontSize: 10,
              color: '#718096',
              marginTop: 6,
              fontWeight: '500',
            }}>
              {`${cmPick({ en: 'Based on', ru: 'Основано на', ka: 'დაფუძნებულია', hy: 'Հիmnvaд', tr: 'Dayandığı', az: 'Əsaslanır', es: 'Basado en', de: 'Basierend auf', fr: 'Basé sur', pt: 'Baseado em', id: 'Berdasarkan', it: 'Basato su', ar: 'مستند إلى', hi: 'आधारित', zh: '基于', ja: '基づく：', ko: '기반으로', uk: 'Засноване на', pl: 'Na podstawie' } as Record<string,string>, language)} ${aiResponse.motivational_message.psychological_basis}`}
            </Text>
          )}
        </View>
      )}
      
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