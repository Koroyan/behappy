import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Minimal mobile-optimized component
export default function SimpleMobileArtTherapy() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    try {
      router.back();
    } catch (error) {
      console.log('Navigation error:', error);
      // Fallback navigation
      router.push('/');
    }
  };

  const handleStartTherapy = async () => {
    try {
      setLoading(true);
      
      // Add small delay to prevent memory spike
      setTimeout(() => {
        try {
          router.push('/art-therapy-session');
        } catch (error) {
          console.log('Navigation error:', error);
          Alert.alert('Error', 'Could not open art therapy');
        } finally {
          setLoading(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Start therapy error:', error);
      setLoading(false);
      Alert.alert('Error', 'Could not start therapy session');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>არტ თერაპია</Text>
        <View style={styles.spacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.mainIcon}>🎨</Text>
        </View>

        <Text style={styles.title}>
          მზად ხართ არტ თერაპიისთვის?
        </Text>

        <Text style={styles.description}>
          შექმენით ხატვა და ისაუბრეთ AI თერაპევტთან თქვენს განცდებზე
        </Text>

        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={handleStartTherapy}
          disabled={loading}
        >
          <FontAwesome5 name="play" size={16} color="#FFFFFF" />
          <Text style={styles.startButtonText}>
            {loading ? 'იტვირთება...' : 'დაწყება'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>რას გაკეთებთ:</Text>
          <Text style={styles.infoItem}>• 📸 გადაიღებთ ან აირჩევთ ფოტოს</Text>
          <Text style={styles.infoItem}>• 🤖 ისაუბრებთ AI თერაპევტთან</Text>
          <Text style={styles.infoItem}>• 💭 გააზიარებთ თქვენს განცდებს</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  mainIcon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 40,
  },
  startButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoContainer: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
});