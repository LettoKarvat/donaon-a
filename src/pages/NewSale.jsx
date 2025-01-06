import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
} from '@mui/material';
import api from '../services/api';
import Header from '../components/Header';

const NewSale = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchProducts = async () => {
        const sessionToken = localStorage.getItem('sessionToken');

        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                '/functions/get-current-stock',
                {},
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            setProducts(response.data.result);
            setLoading(false);
        } catch (err) {
            console.error('Erro ao buscar produtos:', err);
            setError('Erro ao carregar produtos do estoque.');
            setLoading(false);
        }
    };

    const handleAddSale = async () => {
        const sessionToken = localStorage.getItem('sessionToken');

        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        if (!selectedProduct || !quantity) {
            setError('Preencha todos os campos!');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                '/functions/add-sale',
                {
                    productId: selectedProduct, // ID do produto selecionado
                    quantitySold: parseInt(quantity, 10), // Quantidade vendida
                },
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            setSuccess('Venda registrada com sucesso!');
            setError('');
            setQuantity('');
            setSelectedProduct('');
            fetchProducts(); // Atualizar a lista de produtos
        } catch (err) {
            console.error('Erro ao registrar venda:', err);
            setError('Erro ao registrar venda. Verifique se os dados estão corretos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Cabeçalho */}
            <Header />

            {/* Conteúdo Principal */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '16px',
                }}
            >
                <Typography
                    variant="h3"
                    sx={{
                        mb: 4,
                        fontFamily: "'Dancing Script', cursive",
                        fontWeight: 'bold',
                        color: '#FF1493',
                    }}
                >
                    Registrar Nova Venda
                </Typography>
                <Paper
                    elevation={3}
                    sx={{
                        padding: '24px',
                        maxWidth: '500px',
                        width: '100%',
                        marginBottom: '24px',
                        textAlign: 'center',
                    }}
                >
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {success}
                        </Alert>
                    )}

                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <FormControl fullWidth sx={{ textAlign: 'left' }}>
                                <InputLabel id="product-select-label">Produto</InputLabel>
                                <Select
                                    labelId="product-select-label"
                                    label="Produto" // Adicionada a prop `label` para associar ao `InputLabel`
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                    disabled={loading || products.length === 0}
                                >
                                    {products.map((product) => (
                                        <MenuItem
                                            key={product.productId} // Use `productId` como `key` para evitar warnings
                                            value={product.productId} // Envie o `productId` no value
                                        >
                                            {product.productName} ({product.quantity} disponíveis)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Quantidade"
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value, 10);
                                    if (!isNaN(value) && value >= 0) {
                                        setQuantity(value);
                                    } else if (e.target.value === '') {
                                        setQuantity(''); // Permite limpar o campo
                                    }
                                }}
                                disabled={!selectedProduct || loading}
                                error={quantity < 0}
                                helperText={quantity < 0 ? 'A quantidade não pode ser negativa.' : ''}
                            />

                        </Grid>
                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                onClick={handleAddSale}
                                disabled={loading || !selectedProduct || !quantity}
                            >
                                Registrar Venda
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        </Box>
    );
};

export default NewSale;
