/**
 * Get the base URL for API requests
 * - In development: uses Nest.js server running on localhost:8080
 * - In production: uses REACT_APP_API_URL from environment variables (Cloud Run URL)
 */
export const getApiBaseUrl = (): string => {
  // In development, use the Nest.js server running locally
  if (process.env.NODE_ENV === 'development') {
    const baseUrl = 'http://localhost:8080';
    console.log(`🔗 Using Nest.js server: ${baseUrl}`);
    return baseUrl;
  }
  
  // In production, use the API URL from environment variables
  // This should be set in .env.production and loaded during build
  // Example: https://wedding-api-xxxxx-uc.a.run.app
  const apiUrl = process.env.REACT_APP_API_URL;
  if (!apiUrl) {
    console.warn('⚠️ REACT_APP_API_URL not set in production build. NODE_ENV:', process.env.NODE_ENV);
    console.warn('⚠️ Available env vars:', Object.keys(process.env).filter(k => k.startsWith('REACT_APP_')));
    console.warn('⚠️ Falling back to localhost:8080');
    return 'http://localhost:8080';
  }
  
  console.log('✅ Using production API URL:', apiUrl);
  return apiUrl;
};

/**
 * Get the full URL for a specific API endpoint
 * For Nest.js server, the endpoint is just the path
 * Example: 
 *   - Development: getApiUrl('login') -> 'http://localhost:8080/login'
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

/**
 * Get the authentication hash from localStorage
 */
export const getAuthHash = (): string | null => {
  return localStorage.getItem('authHash');
};

/**
 * Get headers for authenticated API requests (POST/PUT/DELETE)
 * Includes the auth hash in the X-Auth-Hash header
 */
export const getAuthHeaders = (): HeadersInit => {
  const authHash = getAuthHash();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (authHash) {
    headers['X-Auth-Hash'] = authHash;
  }
  
  return headers;
};
