import axios from 'axios';

// IMPORTANT: Use backend URL, not frontend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

console.log('🔗 API Base URL:', API_BASE_URL); // Debug log

// Create axios instance
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true
});

// Auth token interceptor
let getTokenFunction: (() => Promise<string | null>) | null = null;

export const setupApiInterceptors = (getToken: () => Promise<string | null>) => {
    getTokenFunction = getToken;
    
    // Request interceptor
    apiClient.interceptors.request.use(
        async (config) => {
            try {
                if (getTokenFunction) {
                    const token = await getTokenFunction();
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                        console.log('✅ Token added to request');
                    }
                }
            } catch (error) {
                console.error('❌ Failed to get auth token:', error);
            }
            console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor
    apiClient.interceptors.response.use(
        (response) => {
            console.log('📥 API Response:', response.status, response.config.url);
            return response;
        },
        (error) => {
            console.error('❌ API Error:', error.response?.status, error.config?.url);
            if (error.response?.status === 401) {
                console.log('🔒 Unauthorized - token may be invalid');
            }
            return Promise.reject(error);
        }
    );
};

// API functions
export const messagesApi = {
    send: (data: { receiverId: string; content: string }) =>
        apiClient.post('/api/messages', data),
    
    getConversation: (userId: string) =>
        apiClient.get(`/api/messages?with=${userId}`),
};

export const usersApi = {
    getAll: () => apiClient.get('/api/users'),
    getById: (userId: string) => apiClient.get(`/api/users/${userId}`),
    checkOnline: (userId: string) => apiClient.get(`/api/users/online?userId=${userId}`),
};