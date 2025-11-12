import axios, { AxiosResponse, AxiosError } from 'axios';
import { Config } from '../constants/Config';
import {
  DetectionResponse,
  WebcamStatus,
  VideoInfo,
  ModelInfo,
  HealthStatus,
  DetectionRequest,
  ApiResponse
} from '../types/wasteDetection';

const api = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: Config.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

class WasteDetectionAPI {
  private handleError(error: AxiosError): string {
    if (error.response) {
      const data = error.response.data as any;
      return data.detail || data.error || `API Error: ${error.response.status}`;
    } else if (error.request) {
      return 'Network Error: Cannot reach server. Check your connection and server URL.';
    } else {
      return error.message || 'Unknown error occurred';
    }
  }

  async healthCheck(): Promise<ApiResponse<HealthStatus>> {
    try {
      const response: AxiosResponse<HealthStatus> = await api.get('/api/health');
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }

  async getModelInfo(): Promise<ApiResponse<ModelInfo>> {
    try {
      const response: AxiosResponse<ModelInfo> = await api.get('/api/model/info');
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }

  async detectFromBase64(
    base64Image: string, 
    confidence: number = 0.5
  ): Promise<ApiResponse<DetectionResponse>> {
    try {
      const requestData: DetectionRequest = {
        image: base64Image,
        confidence
      };

      const response: AxiosResponse<DetectionResponse> = await api.post(
        '/api/detect/image', 
        requestData
      );
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }

  async detectFromFile(
    fileUri: string, 
    confidence: number = 0.5
  ): Promise<ApiResponse<DetectionResponse>> {
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: 'waste_photo.jpg'
      } as any);
      formData.append('confidence', confidence.toString());

      const response: AxiosResponse<DetectionResponse> = await api.post(
        '/api/detect/upload', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 45000, // Longer timeout for file uploads
        }
      );
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }

  async startWebcam(confidence: number = 0.5): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse = await api.post('/api/webcam/start', null, {
        params: { confidence }
      });
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }

  async stopWebcam(): Promise<ApiResponse<any>> {
    try {
      const response: AxiosResponse = await api.post('/api/webcam/stop');
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }

  async getWebcamStatus(): Promise<ApiResponse<WebcamStatus>> {
    try {
      const response: AxiosResponse<WebcamStatus> = await api.get('/api/webcam/status');
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }

  getWebcamStreamUrl(): string {
    return `${Config.API_BASE_URL}/api/webcam/stream`;
  }

  async listVideos(): Promise<ApiResponse<{ videos: VideoInfo[] }>> {
    try {
      const response: AxiosResponse<{ videos: VideoInfo[] }> = await api.get('/api/videos/list');
      return { data: response.data, success: true };
    } catch (error) {
      return { error: this.handleError(error as AxiosError), success: false };
    }
  }
}

export const wasteDetectionAPI = new WasteDetectionAPI();