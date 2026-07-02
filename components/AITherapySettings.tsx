import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import aiTherapyService from '../services/aiTherapyService';
import { TherapyColors, therapyStyles } from '../styles/therapyStyles';

const AITherapySettings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useOpenAI, setUseOpenAI] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedApiKey = await aiTherapyService.getApiKeyPublic();
      if (savedApiKey) {
        setApiKey(savedApiKey);
        setUseOpenAI(true);
        // Test connection
        const connected = await aiTherapyService.testApiConnection();
        setIsConnected(connected);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      Alert.alert('Error', 'OpenAI API keys should start with "sk-"');
      return;
    }

    setIsLoading(true);
    try {
      await aiTherapyService.setApiKey(apiKey.trim());
      
      // Test the connection
      const connected = await aiTherapyService.testApiConnection();
      setIsConnected(connected);
      setUseOpenAI(true);
      
      if (connected) {
        Alert.alert(
          'Success!', 
          'OpenAI API key saved and tested successfully. You can now enjoy enhanced AI therapy responses.',
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        Alert.alert(
          'API Key Saved',
          'API key was saved but connection test failed. Please check your key and internet connection.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveApiKey = async () => {
    Alert.alert(
      'Remove API Key',
      'Are you sure you want to remove the OpenAI API key? The app will use local processing only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await aiTherapyService.removeApiKey();
            setApiKey('');
            setIsConnected(false);
            setUseOpenAI(false);
            Alert.alert('Removed', 'API key has been removed.');
          },
        },
      ]
    );
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key first');
      return;
    }

    setIsLoading(true);
    try {
      await aiTherapyService.setApiKey(apiKey.trim());
      const connected = await aiTherapyService.testApiConnection();
      setIsConnected(connected);
      
      Alert.alert(
        connected ? 'Connection Successful' : 'Connection Failed',
        connected 
          ? 'Your OpenAI API key is working correctly!'
          : 'Unable to connect to OpenAI. Please check your API key and internet connection.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Connection test failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <Ionicons name="settings" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={therapyStyles.subtitle}>AI Therapy Settings</Text>
            <Text style={therapyStyles.caption}>
              Configure OpenAI integration
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* OpenAI Integration Section */}
          <View style={therapyStyles.card}>
            <Text style={therapyStyles.subtitle}>OpenAI Integration</Text>
            <Text style={therapyStyles.bodySecondary}>
              Connect your OpenAI API key for enhanced therapeutic responses powered by GPT-4.
            </Text>
            
            {/* Use OpenAI Toggle */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              marginBottom: 12,
            }}>
              <Text style={therapyStyles.body}>Use OpenAI Enhancement</Text>
              <Switch
                value={useOpenAI}
                onValueChange={setUseOpenAI}
                trackColor={{ false: '#767577', true: TherapyColors.primaryLight }}
                thumbColor={useOpenAI ? TherapyColors.primary : '#f4f3f4'}
              />
            </View>

            {useOpenAI && (
              <>
                {/* API Key Input */}
                <Text style={[therapyStyles.body, { fontWeight: '600', marginBottom: 8 }]}>
                  OpenAI API Key
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <TextInput
                    style={[therapyStyles.chatInput, { flex: 1, marginRight: 8 }]}
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder="sk-..."
                    placeholderTextColor={TherapyColors.textLight}
                    secureTextEntry={!isApiKeyVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setIsApiKeyVisible(!isApiKeyVisible)}
                    style={{
                      padding: 12,
                      backgroundColor: TherapyColors.background,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons 
                      name={isApiKeyVisible ? "eye-off" : "eye"} 
                      size={20} 
                      color={TherapyColors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Connection Status */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 16,
                }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isConnected ? TherapyColors.healing : '#FF6B6B',
                    marginRight: 8,
                  }} />
                  <Text style={therapyStyles.bodySecondary}>
                    {isConnected ? 'Connected to OpenAI' : 'Not connected'}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={{
                  flexDirection: 'row',
                  gap: 12,
                }}>
                  <TouchableOpacity
                    onPress={handleTestConnection}
                    disabled={isLoading}
                    style={[
                      therapyStyles.secondaryButton,
                      { flex: 1, opacity: isLoading ? 0.5 : 1 },
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={TherapyColors.primary} />
                    ) : (
                      <Text style={therapyStyles.secondaryButtonText}>Test</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveApiKey}
                    disabled={isLoading || !apiKey.trim()}
                    style={[
                      therapyStyles.primaryButton,
                      { 
                        flex: 2, 
                        opacity: (isLoading || !apiKey.trim()) ? 0.5 : 1 
                      },
                    ]}
                  >
                    <Text style={therapyStyles.primaryButtonText}>
                      Save API Key
                    </Text>
                  </TouchableOpacity>
                </View>

                {apiKey && (
                  <TouchableOpacity
                    onPress={handleRemoveApiKey}
                    style={[
                      therapyStyles.secondaryButton,
                      { 
                        marginTop: 12,
                        borderColor: '#FF6B6B',
                      },
                    ]}
                  >
                    <Text style={[therapyStyles.secondaryButtonText, { color: '#FF6B6B' }]}>
                      Remove API Key
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Information Section */}
          <View style={therapyStyles.card}>
            <Text style={therapyStyles.subtitle}>How it Works</Text>
            <Text style={therapyStyles.body}>
              • <Text style={{ fontWeight: '600' }}>Local Processing:</Text> The app uses built-in therapeutic techniques and responses
            </Text>
            <Text style={therapyStyles.body}>
              • <Text style={{ fontWeight: '600' }}>OpenAI Enhancement:</Text> Your messages are analyzed by GPT-4 for more sophisticated therapeutic responses
            </Text>
            <Text style={therapyStyles.body}>
              • <Text style={{ fontWeight: '600' }}>Privacy:</Text> API key is stored locally on your device
            </Text>
            <Text style={therapyStyles.body}>
              • <Text style={{ fontWeight: '600' }}>Fallback:</Text> If OpenAI is unavailable, local processing continues seamlessly
            </Text>
          </View>

          {/* Get API Key Section */}
          <View style={therapyStyles.card}>
            <Text style={therapyStyles.subtitle}>Getting an OpenAI API Key</Text>
            <Text style={therapyStyles.bodySecondary}>
              1. Visit platform.openai.com{'\n'}
              2. Create an account or sign in{'\n'}
              3. Go to API Keys section{'\n'}
              4. Create a new secret key{'\n'}
              5. Copy and paste it above
            </Text>
            <Text style={[therapyStyles.caption, { fontStyle: 'italic', marginTop: 8 }]}>
              Note: OpenAI API usage incurs costs based on your usage. Check their pricing for details.
            </Text>
          </View>

          {/* Privacy Notice */}
          <View style={[therapyStyles.card, { backgroundColor: '#FFF9E6' }]}>
            <Text style={[therapyStyles.subtitle, { color: '#B45309' }]}>
              Privacy & Security
            </Text>
            <Text style={[therapyStyles.bodySecondary, { color: '#92400E' }]}>
              Your therapeutic conversations are processed to provide helpful responses. 
              When using OpenAI, messages are sent to their servers for processing. 
              Your API key is stored securely on your device only.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AITherapySettings;