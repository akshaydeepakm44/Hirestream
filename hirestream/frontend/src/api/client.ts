import axios from 'axios';

// In dev, use '' so Vite proxy handles requests (works via ngrok/external URLs too)
// In production, set VITE_API_URL to your deployed backend URL
export const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

//what will axios take as input is the url of the backend and the method of the request and the data to be sent to the backend
//the method will be get, post, put, delete
//the data will be in the form of json
//the url will be the url of the backend
//the token will be the token of the user

