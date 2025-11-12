export interface Detection {
    class: string;
    class_id: number;
    confidence: number;
    bbox: number[];
    bbox_pixels: number[];
  }
  
  export interface DetectionResponse {
    success: boolean;
    detections: Detection[];
    count: number;
    image_with_boxes?: string;
    message: string;
  }
  
  export interface WebcamStatus {
    active: boolean;
    message: string;
  }
  
  export interface VideoInfo {
    name: string;
    path: string;
    display_name: string;
  }
  
  export interface ModelInfo {
    model_name: string;
    classes: { [key: number]: string };
    input_size: number;
  }
  
  export interface HealthStatus {
    status: string;
    model_loaded: boolean;
    camera_active: boolean;
  }
  
  export interface ApiResponse<T> {
    data?: T;
    error?: string;
    success: boolean;
  }
  
  export interface DetectionRequest {
    confidence?: number;
    image?: string;
  }
  
  // State types for React components
  export interface DetectionState {
    loading: boolean;
    results: DetectionResponse | null;
    error: string | null;
  }
  
  export interface WebcamState {
    active: boolean;
    streaming: boolean;
    currentFrame: string | null;
    error: string | null;
  }
  
  // Camera types for Expo
  export interface CameraImage {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }