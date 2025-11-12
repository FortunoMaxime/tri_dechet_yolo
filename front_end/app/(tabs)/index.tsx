import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useWasteDetection } from '../../hooks/useWasteDetection';
import WasteDetector from '../../components/WasteDetector';
import { wasteDetectionAPI } from '../../services/api'; // ✅ Ajouter cet import
import { Config } from '../../constants/Config';

export default function HomeScreen() {
  const { detectionState, webcamState } = useWasteDetection();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Vérifier le statut de l'API au chargement
  React.useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const result = await wasteDetectionAPI.healthCheck();
        setApiStatus(result.success ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };

    checkApiStatus();
  }, []);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Waste Classification',
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView style={styles.container}>
        {/* Status Indicator */}
        <View style={[
          styles.statusBar,
          apiStatus === 'online' && styles.statusOnline,
          apiStatus === 'offline' && styles.statusOffline,
          apiStatus === 'checking' && styles.statusChecking
        ]}>
          <Text style={styles.statusText}>
            {apiStatus === 'online' && '✅ API Connected'}
            {apiStatus === 'offline' && '❌ API Offline'}
            {apiStatus === 'checking' && '⏳ Checking API...'}
          </Text>
        </View>

        {apiStatus === 'offline' && (
          <View style={styles.offlineContainer}>
            <Text style={styles.offlineText}>
              Please make sure your FastAPI server is running on:
            </Text>
            <Text style={styles.apiUrl}>
              {Config.API_BASE_URL}
            </Text>
            <Text style={styles.offlineHelp}>
              • Check if the server is running{'\n'}
              • Verify your network connection{'\n'}
              • Ensure correct IP address in Config.ts
            </Text>
          </View>
        )}

        {apiStatus === 'online' && <WasteDetector />}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    padding: 12,
    alignItems: 'center',
  },
  statusOnline: {
    backgroundColor: '#E8F5E8',
  },
  statusOffline: {
    backgroundColor: '#FFEBEE',
  },
  statusChecking: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
  },
  offlineContainer: {
    padding: 20,
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offlineText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  apiUrl: {
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    textAlign: 'center',
    marginBottom: 12,
  },
  offlineHelp: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});