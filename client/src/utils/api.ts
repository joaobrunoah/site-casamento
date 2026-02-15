/**
 * Get the base URL for API requests
 * - In development: uses localhost:5001
 * - In production: uses REACT_APP_API_URL from environment variables
 */
export const getApiBaseUrl = (): string => {
  // In development, always use localhost:5001
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5001';
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
 * Example: getApiUrl('login') -> http://localhost:5001/login (dev) or https://.../login (prod)
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Ensure baseUrl doesn't end with a slash
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/${cleanEndpoint}`;
};
