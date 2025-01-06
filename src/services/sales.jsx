// Serviços relacionados às vendas
import api from './api';

export const addSale = async (productId, quantitySold) => {
    const response = await api.post('/functions/add-sale', { productId, quantitySold });
    return response.data.result;
};
