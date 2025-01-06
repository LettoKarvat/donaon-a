// Serviços relacionados aos relatórios
import api from './api';

export const fetchSalesByProduct = async () => {
    const response = await api.get('/functions/sales-by-product');
    return response.data.result;
};
