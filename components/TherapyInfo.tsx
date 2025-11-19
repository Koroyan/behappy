import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ScrollView,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TherapyColors, therapyStyles } from '../styles/therapyStyles';

const TherapyInfo: React.FC = () => {
  return (
    <SafeAreaView style={therapyStyles.safeArea}>
      <LinearGradient
        colors={[TherapyColors.background, '#FFFFFF']}
        style={therapyStyles.container}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E1E8ED',
        }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: TherapyColors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <Ionicons name="information-circle" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={therapyStyles.subtitle}>About AI Therapy</Text>
            <Text style={therapyStyles.caption}>
              Powered by GPT-5 Clinical Specialist
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Therapeutic Approach */}
          <View style={therapyStyles.card}>
            <Text style={therapyStyles.subtitle}>🌸 Our Therapeutic Approach</Text>
            <Text style={therapyStyles.body}>
              This AI therapy assistant is powered by an advanced clinical psychotherapy system based on 
              evidence-based modalities including:
            </Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={therapyStyles.body}>• <Text style={{ fontWeight: '600' }}>CBT</Text> - Cognitive Behavioral Therapy</Text>
              <Text style={therapyStyles.body}>• <Text style={{ fontWeight: '600' }}>DBT</Text> - Dialectical Behavior Therapy</Text>
              <Text style={therapyStyles.body}>• <Text style={{ fontWeight: '600' }}>EMDR</Text> - Eye Movement Desensitization</Text>
              <Text style={therapyStyles.body}>• <Text style={{ fontWeight: '600' }}>IFS</Text> - Internal Family Systems</Text>
              <Text style={therapyStyles.body}>• <Text style={{ fontWeight: '600' }}>Somatic Therapy</Text> - Body-based approaches</Text>
              <Text style={therapyStyles.body}>• <Text style={{ fontWeight: '600' }}>Mindfulness</Text> - Present-moment awareness</Text>
            </View>
          </View>

          {/* Clinical Features */}
          <View style={therapyStyles.card}>
            <Text style={therapyStyles.subtitle}>✨ Clinical Features</Text>
            <View style={{ marginTop: 8, gap: 12 }}>
              <View>
                <Text style={[therapyStyles.body, { fontWeight: '600' }]}>🧠 Clinical Assessment</Text>
                <Text style={therapyStyles.bodySecondary}>
                  Real-time emotional state analysis and window of tolerance monitoring
                </Text>
              </View>
              <View>
                <Text style={[therapyStyles.body, { fontWeight: '600' }]}>💚 Trauma-Informed Care</Text>
                <Text style={therapyStyles.bodySecondary}>
                  Gentle, safety-focused approach respecting your unique experiences
                </Text>
              </View>
              <View>
                <Text style={[therapyStyles.body, { fontWeight: '600' }]}>🌍 Cultural Adaptation</Text>
                <Text style={therapyStyles.bodySecondary}>
                  Support for Georgian, Russian, Armenian, and English languages
                </Text>
              </View>
              <View>
                <Text style={[therapyStyles.body, { fontWeight: '600' }]}>🚨 Crisis Support</Text>
                <Text style={therapyStyles.bodySecondary}>
                  Automatic risk assessment and emergency resource activation
                </Text>
              </View>
              <View>
                <Text style={[therapyStyles.body, { fontWeight: '600' }]}>🎨 Interactive Tools</Text>
                <Text style={therapyStyles.bodySecondary}>
                  Breathing exercises, art therapy, journaling, and emotion tracking
                </Text>
              </View>
            </View>
          </View>

          {/* How Sessions Work */}
          <View style={therapyStyles.card}>
            <Text style={therapyStyles.subtitle}>💬 How Sessions Work</Text>
            <Text style={therapyStyles.body}>
              1. <Text style={{ fontWeight: '600' }}>Share your thoughts</Text> - Express whatever is on your mind in a judgment-free space
            </Text>
            <Text style={therapyStyles.body}>
              2. <Text style={{ fontWeight: '600' }}>Receive guidance</Text> - Get therapeutic responses tailored to your emotional state
            </Text>
            <Text style={therapyStyles.body}>
              3. <Text style={{ fontWeight: '600' }}>Engage with tools</Text> - Use suggested exercises like breathing, journaling, or art
            </Text>
            <Text style={therapyStyles.body}>
              4. <Text style={{ fontWeight: '600' }}>Track progress</Text> - Your sessions are saved for reflection and growth monitoring
            </Text>
          </View>

          {/* Privacy & Ethics */}
          <View style={[therapyStyles.card, { backgroundColor: '#FFF9E6' }]}>
            <Text style={[therapyStyles.subtitle, { color: '#B45309' }]}>
              🔒 Privacy & Ethics
            </Text>
            <Text style={[therapyStyles.body, { color: '#92400E' }]}>
              • Your conversations are processed to provide helpful therapeutic responses
            </Text>
            <Text style={[therapyStyles.body, { color: '#92400E' }]}>
              • Sessions are stored locally on your device
            </Text>
            <Text style={[therapyStyles.body, { color: '#92400E' }]}>
              • API key is managed via secure environment configuration
            </Text>
            <Text style={[therapyStyles.body, { color: '#92400E' }]}>
              • This is a supportive tool, not a replacement for professional mental health care
            </Text>
          </View>

          {/* Emergency Resources */}
          <View style={[therapyStyles.card, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[therapyStyles.subtitle, { color: '#DC2626' }]}>
              🚨 Emergency Resources
            </Text>
            <Text style={[therapyStyles.body, { color: '#991B1B' }]}>
              If you're in crisis or having thoughts of self-harm:
            </Text>
            <Text style={[therapyStyles.body, { color: '#991B1B', fontWeight: '600' }]}>
              • Call emergency services: 112
            </Text>
            <Text style={[therapyStyles.body, { color: '#991B1B', fontWeight: '600' }]}>
              • Contact a crisis helpline in your country
            </Text>
            <Text style={[therapyStyles.body, { color: '#991B1B', fontWeight: '600' }]}>
              • Reach out to a trusted friend or family member
            </Text>
            <Text style={[therapyStyles.body, { color: '#991B1B', fontWeight: '600' }]}>
              • Go to the nearest hospital emergency room
            </Text>
          </View>

          {/* Technical Info */}
          <View style={therapyStyles.card}>
            <Text style={therapyStyles.subtitle}>⚙️ Technical Information</Text>
            <Text style={therapyStyles.bodySecondary}>
              • <Text style={{ fontWeight: '600' }}>Model:</Text> GPT-5 Clinical Specialist with custom therapeutic prompt
            </Text>
            <Text style={therapyStyles.bodySecondary}>
              • <Text style={{ fontWeight: '600' }}>API:</Text> OpenAI Responses API with structured clinical output
            </Text>
            <Text style={therapyStyles.bodySecondary}>
              • <Text style={{ fontWeight: '600' }}>Configuration:</Text> Environment-based secure key management
            </Text>
            <Text style={therapyStyles.bodySecondary}>
              • <Text style={{ fontWeight: '600' }}>Version:</Text> beHappy v1.0.0 - Professional Therapy Edition
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default TherapyInfo;
