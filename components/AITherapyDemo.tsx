import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import aiTherapyService from '../services/aiTherapyService';
import { TherapyColors, therapyStyles } from '../styles/therapyStyles';

const AITherapyDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'found' | 'missing'>('checking');

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const apiKey = await aiTherapyService.getApiKeyPublic();
      setApiKeyStatus(apiKey ? 'found' : 'missing');
    } catch (error) {
      setApiKeyStatus('missing');
    }
  };

  const testMessages = [
    {
      title: "Anxiety Test",
      message: "I'm really nervous about my job interview tomorrow. I keep thinking about all the things that could go wrong and I can't sleep.",
      emotion: "anxious"
    },
    {
      title: "Art Therapy Test", 
      message: "I'm feeling so overwhelmed with emotions I can't put into words. Everything feels chaotic inside.",
      emotion: "confused"
    },
    {
      title: "Depression Test",
      message: "I've been feeling really down lately. Nothing seems to bring me joy anymore and I feel so empty.",
      emotion: "sad"
    },
    {
      title: "Georgian Test",
      message: "მე ძალიან ვღელავ და არ ვიცი რა უნდა გავაკეთო. ყველაფერი რთულია.",
      emotion: "anxious"
    }
  ];

  const handleTestMessage = async (testMsg: any) => {
    setIsLoading(true);
    setResponse(null);

    try {
      const result = await aiTherapyService.processMessage(testMsg.message);
      setResponse(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to process message: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (apiKeyStatus) {
      case 'found': return TherapyColors.healing;
      case 'missing': return TherapyColors.emotions.anger;
      default: return TherapyColors.textLight;
    }
  };

  const getStatusText = () => {
    switch (apiKeyStatus) {
      case 'found': return 'OpenAI API Connected';
      case 'missing': return 'Local Processing Only';
      default: return 'Checking...';
    }
  };

  return (
    <SafeAreaView style={therapyStyles.safeArea}>
      <ScrollView style={therapyStyles.container} contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={therapyStyles.card}>
          <Text style={therapyStyles.title}>🧠 AI Therapy Demo</Text>
          <Text style={therapyStyles.bodySecondary}>
            Test the enhanced AI therapy system with different scenarios.
          </Text>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 12,
            padding: 8,
            backgroundColor: TherapyColors.background,
            borderRadius: 8,
          }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: getStatusColor(),
              marginRight: 8,
            }} />
            <Text style={[therapyStyles.bodySecondary, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Test Messages */}
        <View style={therapyStyles.card}>
          <Text style={therapyStyles.subtitle}>Test Scenarios</Text>
          {testMessages.map((test, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleTestMessage(test)}
              disabled={isLoading}
              style={[
                therapyStyles.secondaryButton,
                { 
                  marginBottom: 8,
                  opacity: isLoading ? 0.5 : 1,
                  alignItems: 'flex-start',
                  paddingVertical: 12,
                }
              ]}
            >
              <Text style={[therapyStyles.secondaryButtonText, { fontWeight: '600', marginBottom: 4 }]}>
                {test.title}
              </Text>
              <Text style={[therapyStyles.bodySecondary, { fontSize: 12, textAlign: 'left' }]}>
                "{test.message.length > 80 ? test.message.substring(0, 80) + '...' : test.message}"
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={[therapyStyles.card, { alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={TherapyColors.primary} />
            <Text style={[therapyStyles.body, { marginTop: 8 }]}>
              Dr. Sophia is thinking...
            </Text>
          </View>
        )}

        {/* Response */}
        {response && (
          <View style={therapyStyles.card}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Text style={therapyStyles.subtitle}>AI Response</Text>
              <View style={{
                marginLeft: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: apiKeyStatus === 'found' ? TherapyColors.healing : TherapyColors.support,
                borderRadius: 12,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                  {apiKeyStatus === 'found' ? 'OpenAI Enhanced' : 'Local Processing'}
                </Text>
              </View>
            </View>

            {/* Response Text */}
            <View style={{
              backgroundColor: TherapyColors.background,
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: TherapyColors.primary,
            }}>
              <Text style={therapyStyles.body}>{response.response_text}</Text>
            </View>

            {/* Technique */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[therapyStyles.bodySecondary, { fontWeight: '600', marginBottom: 4 }]}>
                🎯 Therapeutic Approach:
              </Text>
              <View style={therapyStyles.techniqueBadge}>
                <Text style={therapyStyles.techniqueBadgeText}>
                  {response.technique.method}: {response.technique.name.replace('_', ' ')}
                </Text>
              </View>
              <Text style={[therapyStyles.bodySecondary, { marginTop: 4, fontStyle: 'italic' }]}>
                "{response.technique.description}"
              </Text>
            </View>

            {/* Detected Emotion */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[therapyStyles.bodySecondary, { fontWeight: '600' }]}>
                💭 Detected Emotion: 
              </Text>
              <Text style={[therapyStyles.body, { color: TherapyColors.emotions[response.detected_emotion as keyof typeof TherapyColors.emotions] || TherapyColors.primary }]}>
                {response.detected_emotion.charAt(0).toUpperCase() + response.detected_emotion.slice(1)}
              </Text>
            </View>

            {/* Key Insights */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[therapyStyles.bodySecondary, { fontWeight: '600', marginBottom: 8 }]}>
                💡 Therapeutic Insights:
              </Text>
              {response.key_insights.map((insight: string, index: number) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  marginBottom: 4,
                  alignItems: 'flex-start',
                }}>
                  <Text style={[therapyStyles.body, { color: TherapyColors.primary, marginRight: 8 }]}>•</Text>
                  <Text style={[therapyStyles.body, { flex: 1 }]}>{insight}</Text>
                </View>
              ))}
            </View>

            {/* Next Recommendation */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[therapyStyles.bodySecondary, { fontWeight: '600', marginBottom: 8 }]}>
                📋 Next Steps:
              </Text>
              <View style={{
                backgroundColor: TherapyColors.primary + '10',
                padding: 12,
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: TherapyColors.primary,
              }}>
                <Text style={therapyStyles.body}>{response.next_recommendation}</Text>
              </View>
            </View>

            {/* Interactive Component */}
            {response.interactive_component && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[therapyStyles.bodySecondary, { fontWeight: '600', marginBottom: 8 }]}>
                  🎮 Interactive Component:
                </Text>
                <View style={{
                  backgroundColor: TherapyColors.interactive[response.interactive_component as keyof typeof TherapyColors.interactive] || TherapyColors.primary,
                  padding: 12,
                  borderRadius: 20,
                  alignSelf: 'flex-start',
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', textTransform: 'capitalize' }}>
                    {response.interactive_component.replace('_', ' ')} Exercise
                  </Text>
                </View>
              </View>
            )}

            {/* Language */}
            <View>
              <Text style={[therapyStyles.bodySecondary, { fontWeight: '600' }]}>
                🌍 Language: 
              </Text>
              <Text style={therapyStyles.body}>
                {response.language.charAt(0).toUpperCase() + response.language.slice(1)}
              </Text>
            </View>
          </View>
        )}

        {/* API Key Info */}
        {apiKeyStatus === 'missing' && (
          <View style={[therapyStyles.card, { backgroundColor: TherapyColors.background }]}>
            <Text style={[therapyStyles.subtitle, { color: TherapyColors.emotions.anger }]}>
              ⚠️ OpenAI API Key Missing
            </Text>
            <Text style={therapyStyles.bodySecondary}>
              The system is using local processing. For enhanced responses, ensure your OpenAI API key is properly configured in the .env file.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AITherapyDemo;