export const Config = {
    API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://172.20.248.252:8000',
    TIMEOUT: 30000,
  };
  
  // Validation de l'URL
  export const validateApiUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };