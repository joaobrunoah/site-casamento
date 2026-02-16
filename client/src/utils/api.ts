/**
 * Get the base URL for API requests
 * - In development: uses Firebase Functions emulator URL with project ID and region
 * - In production: uses REACT_APP_API_URL from environment variables
 */
export const getApiBaseUrl = (): string => {
  // In development, construct the Firebase Functions emulator URL
  // Firebase Functions emulator exposes functions at:
  // http://localhost:5001/{project-id}/{region}/{function-name}
  if (process.env.NODE_ENV === 'development') {
    const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
    
    if (!projectId || projectId === 'your-project-id') {
      console.warn(
        '⚠️ REACT_APP_FIREBASE_PROJECT_ID is not set or is using placeholder value.\n' +
        'Please set it in your client/.env.local file:\n' +
        'REACT_APP_FIREBASE_PROJECT_ID=your-actual-project-id\n\n' +
        'You can find your project ID in .firebaserc or Firebase Console.\n' +
        'Falling back to demo-project for emulator.'
      );
      // Fallback to demo-project which is commonly used by Firebase emulators
      return 'http://localhost:5001/demo-project/us-central1';
    }
    
    const region = 'us-central1'; // Default region for Firebase Functions
    const baseUrl = `http://localhost:5001/${projectId}/${region}`;
    console.log(`🔗 Using Firebase Functions emulator: ${baseUrl}`);
    return baseUrl;
  }
  
  // In production, use the API URL from environment variables
  // This should be set in .env.prod and loaded during build
  // Example: https://us-central1-your-project-id.cloudfunctions.net
  const apiUrl = process.env.REACT_APP_API_URL;
  if (!apiUrl) {
    console.warn('REACT_APP_API_URL not set, falling back to localhost');
    return 'http://localhost:5001';
  }
  
  return apiUrl;
};

/**
 * Get the full URL for a specific API endpoint
 * For Firebase Functions, the endpoint should be just the function name
 * Example: 
 *   - Development: getApiUrl('login') -> 'http://localhost:5001/{project-id}/us-central1/login'
 *   - Production: getApiUrl('login') -> 'https://.../login'
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Ensure baseUrl doesn't end with a slash
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const fullUrl = `${cleanBaseUrl}/${cleanEndpoint}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📡 API URL for ${endpoint}: ${fullUrl}`);
  }
  
  return fullUrl;
};
