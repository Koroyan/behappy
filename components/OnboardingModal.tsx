import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (userName: string) => void;
}

export default function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const goals = [
    { id: 'stress', title: 'სტრესის მართვა', icon: '😌' },
    { id: 'mood', title: 'განწყობის გაუმჯობესება', icon: '😊' },
    { id: 'anxiety', title: 'შფოთვის შემცირება', icon: '🧘‍♀️' },
    { id: 'sleep', title: 'ძილის ხარისხი', icon: '😴' },
    { id: 'confidence', title: 'თავდაჯერებულობა', icon: '💪' },
    { id: 'relationships', title: 'ურთიერთობები', icon: '❤️' },
  ];

  const handleGoalToggle = (goalId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter(id => id !== goalId));
    } else {
      setSelectedGoals([...selectedGoals, goalId]);
    }
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (currentStep === 0) {
      if (userName.trim().length < 2) {
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // შენახვა და დასრულება
      try {
        await AsyncStorage.setItem('userName', userName.trim());
        await AsyncStorage.setItem('userGoals', JSON.stringify(selectedGoals));
        await AsyncStorage.setItem('onboardingCompleted', 'true');
        onComplete(userName.trim());
      } catch (error) {
        console.error('Onboarding data save error:', error);
        onComplete(userName.trim());
      }
    }
  };

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.welcomeTitle}>კეთილი იყოს თქვენი მობრძანება! 👋</Text>
      <Text style={styles.welcomeSubtitle}>
        BeHappy არის თქვენი პერსონალური მენტალური ჯანმრთელობის ასისტენტი
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>როგორ გიყვართ, რომ მოგმართოთ?</Text>
        <TextInput
          style={styles.nameInput}
          value={userName}
          onChangeText={setUserName}
          placeholder="მაგ: ნინო, გიორგი..."
          placeholderTextColor="#999"
          maxLength={20}
        />
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>რას გთავაზობთ:</Text>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🤖</Text>
          <Text style={styles.featureText}>AI ფსიქოლოგი 24/7</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🎨</Text>
          <Text style={styles.featureText}>არტ თერაპია და ემოციური ანალიზი</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>პროგრესის თვალყურება</Text>
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>რა მიზნები გაქვთ? 🎯</Text>
      <Text style={styles.stepSubtitle}>
        შეარჩიეთ რაშიც გსურთ გაუმჯობესება (შეგიძლიათ რამდენიმე აირჩიოთ)
      </Text>
      
      <View style={styles.goalsGrid}>
        {goals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              selectedGoals.includes(goal.id) && styles.goalCardSelected
            ]}
            onPress={() => handleGoalToggle(goal.id)}
          >
            <Text style={styles.goalIcon}>{goal.icon}</Text>
            <Text style={[
              styles.goalText,
              selectedGoals.includes(goal.id) && styles.goalTextSelected
            ]}>
              {goal.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.goalHint}>
        არჩეული მიზნები: {selectedGoals.length} / {goals.length}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
      >
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${((currentStep + 1) / 2) * 100}%` }
                ]} />
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} / 2
              </Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {currentStep === 0 ? renderStep0() : renderStep1()}
            </View>

            {/* Navigation */}
            <View style={styles.navigationContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setCurrentStep(currentStep - 1)}
                >
                  <Text style={styles.backButtonText}>← უკან</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (currentStep === 0 && userName.trim().length < 2) && styles.nextButtonDisabled,
                  (currentStep === 1 && selectedGoals.length === 0) && styles.nextButtonDisabled
                ]}
                onPress={handleNext}
                disabled={
                  (currentStep === 0 && userName.trim().length < 2) ||
                  (currentStep === 1 && selectedGoals.length === 0)
                }
              >
                <LinearGradient
                  colors={['#00b894', '#00cec9']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === 1 ? 'დასრულება ✓' : 'შემდეგი →'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  progressText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
    fontWeight: '600',
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featuresContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  goalCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  goalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  goalTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  goalHint: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: 14,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
  backButton: {
    padding: 15,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    marginLeft: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
