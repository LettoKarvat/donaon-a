// Serviços relacionados ao estoque
import api from './api';

export const fetchStockByUser = async () => {
    const response = await api.get('/functions/list-stock-by-user');
    return response.data.result;
};
