import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useWasteDetection } from '../hooks/useWasteDetection';
import { Detection } from '../types/wasteDetection';

const { width: screenWidth } = Dimensions.get('window');

const WasteDetector: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0.5);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);

  const {
    detectionState,
    webcamState,
    detectImage,
    startWebcam,
    stopWebcam,
    resetDetection,
    webcamStreamUrl
  } = useWasteDetection();

  // Demander les permissions caméra
  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }, []);

  // Prendre une photo
  const takePhoto = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission required', 'Camera permission is needed to take photos');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await handleImageDetection(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  }, [confidence]);

  // Choisir une image depuis la galerie
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await handleImageDetection(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [confidence]);

  // Traitement de la détection
  const handleImageDetection = async (imageUri: string) => {
    try {
      resetDetection();
      const result = await detectImage(imageUri, confidence);
      
      if (!result.success) {
        Alert.alert('Detection Error', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process image');
    }
  };

  // Démarrer la webcam
  const handleStartWebcam = async () => {
    try {
      const result = await startWebcam(confidence);
      if (!result.success) {
        Alert.alert('Webcam Error', result.error || 'Failed to start webcam');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start webcam');
    }
  };

  // Arrêter la webcam
  const handleStopWebcam = async () => {
    try {
      const result = await stopWebcam();
      if (!result.success) {
        Alert.alert('Webcam Error', result.error || 'Failed to stop webcam');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop webcam');
    }
  };

  // Afficher les détails d'une détection
  const showDetectionDetails = (detection: Detection) => {
    setSelectedDetection(detection);
    setModalVisible(true);
  };

  // Rendu d'un élément de détection
  const renderDetectionItem = (detection: Detection, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.detectionItem}
      onPress={() => showDetectionDetails(detection)}
    >
      <View style={styles.detectionHeader}>
        <Text style={styles.detectionClass}>{detection.class}</Text>
        <Text style={styles.detectionConfidence}>
          {Math.round(detection.confidence * 100)}%
        </Text>
      </View>
      <View style={styles.confidenceBar}>
        <View 
          style={[
            styles.confidenceFill,
            { width: `${detection.confidence * 100}%` }
          ]} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Section Confiance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confidence Threshold</Text>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceValue}>
            {Math.round(confidence * 100)}%
          </Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>0%</Text>
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderFill,
                  { width: `${confidence * 100}%` }
                ]} 
              />
              <View 
                style={[
                  styles.sliderThumb,
                  { left: `${confidence * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.sliderLabel}>100%</Text>
          </View>
          <View style={styles.sliderButtons}>
            {[0.3, 0.5, 0.7, 0.9].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.confidenceButton,
                  Math.abs(confidence - value) < 0.01 && styles.confidenceButtonActive
                ]}
                onPress={() => setConfidence(value)}
              >
                <Text style={[
                  styles.confidenceButtonText,
                  Math.abs(confidence - value) < 0.01 && styles.confidenceButtonTextActive
                ]}>
                  {value * 100}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Section Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Image Detection</Text>
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={takePhoto}
            disabled={detectionState.loading}
          >
            <Text style={styles.buttonText}>📸 Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={pickImage}
            disabled={detectionState.loading}
          >
            <Text style={styles.buttonText}>🖼️ Choose Image</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Webcam */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Webcam</Text>
        <View style={styles.webcamStatus}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              webcamState.active ? styles.statusActive : styles.statusInactive
            ]} />
            <Text style={styles.statusText}>
              {webcamState.active ? 'Webcam Active' : 'Webcam Inactive'}
            </Text>
          </View>
        </View>
        
        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.successButton,
              webcamState.active && styles.buttonDisabled
            ]}
            onPress={handleStartWebcam}
            disabled={webcamState.active || detectionState.loading}
          >
            <Text style={styles.buttonText}>
              {webcamState.active ? '🎥 Started' : '🎥 Start Webcam'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button,
              styles.dangerButton,
              !webcamState.active && styles.buttonDisabled
            ]}
            onPress={handleStopWebcam}
            disabled={!webcamState.active}
          >
            <Text style={styles.buttonText}>⏹️ Stop Webcam</Text>
          </TouchableOpacity>
        </View>

        {webcamState.error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {webcamState.error}</Text>
          </View>
        )}
      </View>

      {/* Loading State */}
      {detectionState.loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Analyzing waste...</Text>
        </View>
      )}

      {/* Image sélectionnée */}
      {selectedImage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Image</Text>
          <Image 
            source={{ uri: selectedImage }} 
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Résultats de détection */}
      {detectionState.results && (
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>
              Detection Results
            </Text>
            <View style={styles.resultsBadge}>
              <Text style={styles.resultsCount}>
                {detectionState.results.count}
              </Text>
            </View>
          </View>
          
          <Text style={styles.resultsMessage}>
            {detectionState.results.message}
          </Text>

          {/* Liste des détections */}
          {detectionState.results.detections.length > 0 ? (
            <View style={styles.detectionsList}>
              {detectionState.results.detections.map(renderDetectionItem)}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No objects detected</Text>
            </View>
          )}

          {/* Image avec bounding boxes */}
          {detectionState.results.image_with_boxes && (
            <View style={styles.resultImageContainer}>
              <Text style={styles.sectionTitle}>Annotated Image</Text>
              <Image 
                source={{ 
                  uri: `data:image/jpeg;base64,${detectionState.results.image_with_boxes}` 
                }} 
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
      )}

      {/* Error State */}
      {detectionState.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>❌ {detectionState.error}</Text>
        </View>
      )}

      {/* Modal des détails de détection */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedDetection && (
              <>
                <Text style={styles.modalTitle}>Detection Details</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Class:</Text>
                  <Text style={styles.detailValue}>{selectedDetection.class}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Confidence:</Text>
                  <Text style={styles.detailValue}>
                    {Math.round(selectedDetection.confidence * 100)}%
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Class ID:</Text>
                  <Text style={styles.detailValue}>{selectedDetection.class_id}</Text>
                </View>

                <View style={styles.bboxContainer}>
                  <Text style={styles.detailLabel}>Bounding Box:</Text>
                  <Text style={styles.bboxText}>
                    {JSON.stringify(selectedDetection.bbox_pixels, null, 2)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    width: 30,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    marginHorizontal: 10,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    top: -7,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confidenceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  confidenceButtonActive: {
    backgroundColor: '#4CAF50',
  },
  confidenceButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  confidenceButtonTextActive: {
    color: 'white',
  },
  buttonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#95a5a6',
  },
  successButton: {
    backgroundColor: '#27ae60',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  webcamStatus: {
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#27ae60',
  },
  statusInactive: {
    backgroundColor: '#e74c3c',
  },
  statusText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsBadge: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultsCount: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  resultsMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  detectionsList: {
    gap: 8,
  },
  detectionItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detectionClass: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  detectionConfidence: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 3,
  },
  noResults: {
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  resultImageContainer: {
    marginTop: 16,
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorText: {
    color: '#c0392b',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  detailValue: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  bboxContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  bboxText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});

export default WasteDetector;