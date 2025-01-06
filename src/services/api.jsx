import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL_API,
    headers: {
        'X-Parse-Application-Id': import.meta.env.VITE_PARSE_APPLICATION_ID,
        'X-Parse-REST-API-Key': import.meta.env.VITE_PARSE_REST_API_KEY,
        'Content-Type': 'application/json',
    },
});

export default api;
