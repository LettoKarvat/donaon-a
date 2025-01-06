// Serviços relacionados aos produtos
import api from './api';

export const fetchProducts = async () => {
    const response = await api.get('/functions/list-products');
    return response.data.result;
};
