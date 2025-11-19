import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChatMessage as ChatMessageType } from '../services/aiTherapyService';
import { TherapyBorderRadius, TherapyColors, therapyStyles } from '../styles/therapyStyles';
import BreathingExercise from './BreathingExercise';
import EmotionTracker from './EmotionTracker';
import TherapeuticAnimation from './TherapeuticAnimation';

interface ChatMessageProps {
  message: ChatMessageType;
  onInteractionComplete?: (data: any) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onInteractionComplete,
}) => {
  const [journalText, setJournalText] = useState('');
  const [showInteractive, setShowInteractive] = useState(true);
  const [isJournalMode, setIsJournalMode] = useState(false);
  const [journalPrompt, setJournalPrompt] = useState('');

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

  const handleJournalSubmit = async () => {
    if (journalText.trim()) {
      // Save journal entry
      const journalEntry = {
        type: 'journal',
        content: journalText,
        timestamp: new Date(),
        prompt: journalPrompt,
      };

      // Save to AsyncStorage for later viewing in journal screens
      try {
        const existingEntries = await AsyncStorage.getItem('journal_entries') || '[]';
        const entries = JSON.parse(existingEntries);
        entries.push(journalEntry);
        await AsyncStorage.setItem('journal_entries', JSON.stringify(entries));
        
        // Show success feedback
        Alert.alert(
          '💙 Journal Saved',
          'Your thoughts have been safely stored in your personal journal.',
          [{ text: 'Thank you', style: 'default' }]
        );
        
      } catch (error) {
        console.error('Failed to save journal entry:', error);
      }

      // Reset states
      setIsJournalMode(false);
      setJournalText('');
      setShowInteractive(false);
      
      // Notify parent component
      onInteractionComplete?.(journalEntry);
    }
  };

  const handleBreathingComplete = (data: { cycles: number; totalTime: number }) => {
    const minutes = Math.floor(data.totalTime / 60);
    const seconds = data.totalTime % 60;
    
    onInteractionComplete?.({
      type: 'breathing',
      completed: true,
      cycles: data.cycles,
      totalTime: data.totalTime,
      duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      timestamp: new Date(),
    });
    setShowInteractive(false);
  };

  const handleDrawingComplete = (drawingData: string) => {
    onInteractionComplete?.({
      type: 'drawing',
      data: drawingData,
      timestamp: new Date(),
    });
    setShowInteractive(false);
  };

  const handleEmotionTrackerComplete = () => {
    onInteractionComplete?.({
      type: 'emotion_tracker',
      viewed: true,
      timestamp: new Date(),
    });
    setShowInteractive(false);
  };

  const renderTechniqueBadge = () => {
    // Badges removed - internal clinical info not shown to client
    return null;
  };

  const renderInteractiveComponent = () => {
    if (!aiResponse?.interactive_component || !showInteractive) return null;

    switch (aiResponse.interactive_component) {
      case 'breathing':
        return (
          <BreathingExercise
            onComplete={handleBreathingComplete}
            duration={120} // 2 minutes
            pattern={[4, 2, 6]}
          />
        );

      case 'drawing':
        return (
          <View style={therapyStyles.artTherapyContainer}>
            <Text style={therapyStyles.subtitle}>🎨 Art Therapy Exercise</Text>
            <Text style={therapyStyles.body}>
              Art therapy helps express emotions that are difficult to put into words. 
              Please take a moment to draw your feelings on paper, then upload a photo of your artwork.
            </Text>
            
            <View style={therapyStyles.artTherapyInstructions}>
              <Text style={therapyStyles.bodySecondary}>📝 Instructions:</Text>
              <Text style={therapyStyles.bodySecondary}>• Find paper and drawing materials (pencils, crayons, markers)</Text>
              <Text style={therapyStyles.bodySecondary}>• Draw whatever represents your current feelings</Text>
              <Text style={therapyStyles.bodySecondary}>• Don't worry about artistic skill - focus on expression</Text>
              <Text style={therapyStyles.bodySecondary}>• Take a clear photo and upload it using the camera button</Text>
            </View>

            <View style={{
              backgroundColor: TherapyColors.background,
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
              borderLeftWidth: 4,
              borderLeftColor: TherapyColors.interactive.drawing,
            }}>
              <Text style={[therapyStyles.bodySecondary, { fontStyle: 'italic' }]}>
                "{aiResponse.next_recommendation || 'Express what words cannot capture through your art...'}"
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowInteractive(false)}
              style={[therapyStyles.secondaryButton, { marginTop: 12 }]}
            >
              <Text style={therapyStyles.secondaryButtonText}>I'll draw and upload my artwork</Text>
            </TouchableOpacity>
          </View>
        );

      case 'journaling':
        return (
          <View style={[therapyStyles.card, { backgroundColor: TherapyColors.interactive.journaling + '15' }]}>
            <Text style={[therapyStyles.subtitle, { color: TherapyColors.interactive.journaling, marginBottom: 8 }]}>
              📝 Personal Reflection Space
            </Text>
            
            {!isJournalMode ? (
              // Initial invitation
              <View>
                <Text style={therapyStyles.body}>
                  {aiResponse?.next_recommendation || "Sometimes writing helps us process complex emotions and thoughts."}
                </Text>
                
                <View style={{
                  backgroundColor: TherapyColors.background,
                  padding: 12,
                  borderRadius: 8,
                  marginVertical: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: TherapyColors.interactive.journaling,
                }}>
                  <Text style={[therapyStyles.bodySecondary, { fontStyle: 'italic' }]}>
                    "Write here in a safe space. Your thoughts will be saved for your personal reflection."
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setIsJournalMode(true);
                    setJournalPrompt(aiResponse?.next_recommendation || "What's on your mind right now?");
                  }}
                  style={[therapyStyles.primaryButton, { marginTop: 8 }]}
                >
                  <Text style={therapyStyles.primaryButtonText}>
                    ✍️ Start Writing
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowInteractive(false)}
                  style={[therapyStyles.secondaryButton, { marginTop: 8 }]}
                >
                  <Text style={therapyStyles.secondaryButtonText}>
                    Not right now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Journal writing interface
              <View>
                <Text style={[therapyStyles.bodySecondary, { marginBottom: 12, fontStyle: 'italic' }]}>
                  {journalPrompt}
                </Text>
                
                <TextInput
                  style={{
                    height: 120,
                    textAlignVertical: 'top',
                    backgroundColor: 'white',
                    borderColor: TherapyColors.interactive.journaling,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    lineHeight: 24,
                    fontFamily: 'System',
                  }}
                  placeholder="Let your thoughts flow freely here... 💭"
                  placeholderTextColor={TherapyColors.textSecondary}
                  value={journalText}
                  onChangeText={setJournalText}
                  multiline
                  autoFocus
                />
                
                <Text style={[therapyStyles.caption, { 
                  textAlign: 'center', 
                  marginTop: 8, 
                  color: TherapyColors.textSecondary,
                  fontStyle: 'italic'
                }]}>
                  💙 Your words are private and will be saved to your personal journal
                </Text>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={handleJournalSubmit}
                    disabled={!journalText.trim()}
                    style={[
                      therapyStyles.primaryButton,
                      { 
                        flex: 1,
                        opacity: journalText.trim() ? 1 : 0.6,
                        backgroundColor: TherapyColors.healing,
                      }
                    ]}
                  >
                    <Text style={therapyStyles.primaryButtonText}>
                      � Save Entry
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsJournalMode(false);
                      setJournalText('');
                    }}
                    style={[therapyStyles.secondaryButton, { flex: 1 }]}
                  >
                    <Text style={therapyStyles.secondaryButtonText}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );

      case 'emotion_tracker':
        return (
          <EmotionTracker
            onComplete={handleEmotionTrackerComplete}
            showCurrentSession={true}
          />
        );

      default:
        return null;
    }
  };

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
          🚨 {alertLevel === 'EMERGENCY' ? 'სასწრაფო დახმარება' : 'ყურადღება'}
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
              'სასწრაფო დახმარება',
              'გსურთ ახლავე დარეკვა სასწრაფო სამსახურში?',
              [
                { text: 'გაუქმება', style: 'cancel' },
                { text: 'დარეკვა', onPress: () => console.log('Calling emergency services') }
              ]
            );
          }}
        >
          <Text style={therapyStyles.emergencyButtonText}>📞 დარეკვა</Text>
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
              {aiResponse.motivational_message.tone === 'grounding' ? 'Grounding' :
               aiResponse.motivational_message.tone === 'gentle' ? 'Gentle Support' :
               aiResponse.motivational_message.tone === 'uplifting' ? 'Uplifting' : 'Empowering'}
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
              Based on {aiResponse.motivational_message.psychological_basis}
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

      {/* Interactive component - not shown during crisis */}
      {!isUser && !aiResponse?.emergency_info && renderInteractiveComponent()}

      {/* Next recommendation for completed interactions */}
      {!isUser && !showInteractive && aiResponse?.next_recommendation && (
        <View style={[therapyStyles.card, { marginTop: 8 }]}>
          <Text style={[therapyStyles.bodySecondary, { fontStyle: 'italic' }]}>
            💡 {aiResponse.next_recommendation}
          </Text>
        </View>
      )}
    </View>
  );
};

export default ChatMessage;