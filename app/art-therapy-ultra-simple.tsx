import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function UltraSimpleArtTherapy() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    try {
      router.back();
    } catch (error) {
      console.log('Error going back:', error);
    }
  };

  const handleStart = () => {
    if (loading) return;
    
    setLoading(true);
    
    setTimeout(() => {
      try {
        Alert.alert(
          'არტ თერაპია', 
          'მალე ამ ფუნქციას დავამატებთ',
          [{ text: 'კარგი', onPress: () => setLoading(false) }]
        );
      } catch (error) {
        console.log('Alert error:', error);
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'არტ თერაპია',
          headerShown: true,
          headerBackTitle: 'უკან',
        }} 
      />
      
      <View style={styles.content}>
        <Text style={styles.icon}>🎨</Text>
        <Text style={styles.title}>არტ თერაპია</Text>
        <Text style={styles.subtitle}>მზად ხართ შემოქმედებითი სამკურნალო სესიისთვის?</Text>
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleStart}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'იტვირთება...' : 'დაწყება'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  icon: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});