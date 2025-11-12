import { useState, useCallback } from 'react';
import { wasteDetectionAPI } from '../services/api';
import { 
  DetectionResponse, 
  DetectionState,
  WebcamState,
  ApiResponse 
} from '../types/wasteDetection';

export const useWasteDetection = () => {
  const [detectionState, setDetectionState] = useState<DetectionState>({
    loading: false,
    results: null,
    error: null
  });

  const [webcamState, setWebcamState] = useState<WebcamState>({
    active: false,
    streaming: false,
    currentFrame: null,
    error: null
  });

  const detectImage = useCallback(async (imageUri: string, confidence: number = 0.5) => {
    setDetectionState(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await wasteDetectionAPI.detectFromFile(imageUri, confidence);
    
    if (result.success && result.data) {
      setDetectionState({
        loading: false,
        results: result.data,
        error: null
      });
      return result;
    } else {
      setDetectionState(prev => ({
        ...prev,
        loading: false,
        error: result.error || 'Detection failed'
      }));
      return result;
    }
  }, []);

  const detectBase64 = useCallback(async (base64Image: string, confidence: number = 0.5) => {
    setDetectionState(prev => ({ ...prev, loading: true, error: null }));
    
    const result = await wasteDetectionAPI.detectFromBase64(base64Image, confidence);
    
    if (result.success && result.data) {
      setDetectionState({
        loading: false,
        results: result.data,
        error: null
      });
      return result;
    } else {
      setDetectionState(prev => ({
        ...prev,
        loading: false,
        error: result.error || 'Detection failed'
      }));
      return result;
    }
  }, []);

  const startWebcam = useCallback(async (confidence: number = 0.5) => {
    setWebcamState(prev => ({ ...prev, error: null }));
    
    const result = await wasteDetectionAPI.startWebcam(confidence);
    
    if (result.success && result.data) {
      setWebcamState(prev => ({
        ...prev,
        active: true,
        streaming: true,
        error: null
      }));
      return result;
    } else {
      setWebcamState(prev => ({ 
        ...prev, 
        error: result.error || 'Failed to start webcam' 
      }));
      return result;
    }
  }, []);

  const stopWebcam = useCallback(async () => {
    const result = await wasteDetectionAPI.stopWebcam();
    
    if (result.success && result.data) {
      setWebcamState({
        active: false,
        streaming: false,
        currentFrame: null,
        error: null
      });
      return result;
    } else {
      setWebcamState(prev => ({ 
        ...prev, 
        error: result.error || 'Failed to stop webcam' 
      }));
      return result;
    }
  }, []);

  const resetDetection = useCallback(() => {
    setDetectionState({
      loading: false,
      results: null,
      error: null
    });
  }, []);

  const resetWebcam = useCallback(() => {
    setWebcamState({
      active: false,
      streaming: false,
      currentFrame: null,
      error: null
    });
  }, []);

  return {
    // Detection
    detectionState,
    detectImage,
    detectBase64,
    resetDetection,
    
    // Webcam
    webcamState,
    startWebcam,
    stopWebcam,
    resetWebcam,
    
    // Stream URL
    webcamStreamUrl: wasteDetectionAPI.getWebcamStreamUrl()
  };
};