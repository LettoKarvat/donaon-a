import axios from 'axios';

// Exibe no console a URL base configurada a partir das variáveis de ambiente
console.log('Base URL:', import.meta.env.VITE_BASE_URL_API);

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL_API,
    headers: {
        'X-Parse-Application-Id': import.meta.env.VITE_PARSE_APPLICATION_ID,
        'X-Parse-REST-API-Key': import.meta.env.VITE_PARSE_REST_API_KEY,
        'Content-Type': 'application/json',
    },
});

export default api;
