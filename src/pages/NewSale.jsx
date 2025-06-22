// src/pages/NewSale.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Button,
    FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import api from '../services/api';
import Header from '../components/Header';

/* ───────── helper para moeda ───────── */
const fmtCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const NewSale = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSel] = useState('');
    const [quantity, setQuantity] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    /* ── produto atualmente selecionado ── */
    const current = useMemo(
        () => products.find((p) => p.productId === selectedProduct),
        [products, selectedProduct]
    );

    const fetchProducts = async () => {
        const token = localStorage.getItem('sessionToken');
        if (!token) return setError('Sessão expirada. Faça login novamente.');

        try {
            setLoading(true);
            const { data } = await api.post(
                '/functions/get-current-stock',
                {},
                { headers: { 'X-Parse-Session-Token': token } }
            );
            setProducts(data.result ?? data); // compatível com ambos os formatos
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar produtos do estoque.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSale = async () => {
        const token = localStorage.getItem('sessionToken');
        if (!token) return setError('Sessão expirada. Faça login novamente.');
        if (!selectedProduct || !quantity) return setError('Preencha todos os campos!');

        try {
            setLoading(true);
            await api.post(
                '/functions/add-sale',
                { productId: selectedProduct, quantitySold: parseInt(quantity, 10) },
                { headers: { 'X-Parse-Session-Token': token } }
            );
            setSuccess('Venda registrada com sucesso!');
            setError('');
            setQuantity('');
            setSel('');
            fetchProducts();
        } catch (err) {
            console.error(err);
            setError('Erro ao registrar venda.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProducts(); }, []);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                <Typography variant="h3" sx={{ mb: 4, fontFamily: "'Dancing Script', cursive", fontWeight: 'bold', color: '#FF1493' }}>
                    Registrar Nova Venda
                </Typography>

                <Paper elevation={3} sx={{ p: 3, maxWidth: 500, width: '100%', textAlign: 'center' }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    <Grid container spacing={3}>
                        {/* ─── seletor de produto ─── */}
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel id="product-select-label">Produto</InputLabel>
                                <Select
                                    labelId="product-select-label"
                                    label="Produto"
                                    value={selectedProduct}
                                    onChange={(e) => setSel(e.target.value)}
                                    disabled={loading || products.length === 0}
                                >
                                    {products.map((p) => (
                                        <MenuItem key={p.productId} value={p.productId}>
                                            {p.productName} — {fmtCurrency(p.price)} ({p.quantity} disp.)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* ─── preço unitário ─── */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Preço unitário"
                                value={current ? fmtCurrency(current.price) : ''}
                                disabled
                            />
                        </Grid>

                        {/* ─── quantidade ─── */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Quantidade"
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    if (!isNaN(v) && v >= 0) setQuantity(v);
                                    else if (e.target.value === '') setQuantity('');
                                }}
                                disabled={!selectedProduct || loading}
                                error={quantity < 0}
                                helperText={quantity < 0 ? 'A quantidade não pode ser negativa.' : ''}
                            />
                        </Grid>

                        {/* ─── total (opcional) ─── */}
                        {selectedProduct && quantity !== '' && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Total da venda"
                                    value={fmtCurrency((current?.price ?? 0) * quantity)}
                                    disabled
                                />
                            </Grid>
                        )}

                        {/* ─── botão ─── */}
                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                onClick={handleAddSale}
                                disabled={loading || !selectedProduct || quantity === ''}
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
