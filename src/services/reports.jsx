// Serviços relacionados aos relatórios
import api from './api';

export const fetchSalesByProduct = async () => {
    const response = await api.get('/functions/sales-by-product');
    console.log('Sales by product response:', response);
    return response.data.result;
};
