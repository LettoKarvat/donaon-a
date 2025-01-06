// Serviços relacionados à autenticação
import api from './api';

export const login = async (email, password) => {
    const response = await api.post('/functions/login', { email, password });
    return response.data.result;
};
