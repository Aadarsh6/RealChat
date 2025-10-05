//! This file:
//* Creates a reusable axios instance called apiClient
//* Adds interceptors to automatically attach the user’s auth token and handle errors
//* Exposes ready-to-use API functions for messages and users

//!Think of an interceptor as a middleware for your HTTP requests and responses.
//!It lets you modify or inspect every request or response before it’s actually sent or received.

import axios from "axios";
import { error } from "console";
import { config } from "process";


const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 1000,
    headers:{
        'Content-Type': 'application/json'
    },
});

//auth interceptor

export const setupAuthInterceptors=(getToken: ()=> Promise<string | null>)=>{
    apiClient.interceptors.request.use(
        async (config)=>{
            try {
                const token = getToken()
                if(token){
                    config.headers.Authorization = `Bearer ${token}`
                }
            } catch (error) {
                console.error('Failed to get auth token:', error);
            }
            return config;
        },
        (error)=>{
            return Promise.reject(error);
        }
    );  apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                console.log('Unauthorized request');
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