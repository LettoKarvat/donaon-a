// src/pages/PriceTable.jsx
import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Alert,
    Button
} from '@mui/material';
import Header from '../components/Header';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const PriceTable = () => {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchPrices = async () => {
        const token = localStorage.getItem('sessionToken');
        if (!token) { setError('Sessão expirada. Faça login novamente.'); return; }

        try {
            setLoading(true);
            const res = await api.post(
                '/functions/list-active-products',
                {},
                { headers: { 'X-Parse-Session-Token': token } }
            );
            setProducts(res.data.result || []);
        } catch (e) {
            console.error(e);
            setError('Erro ao carregar tabela de preços.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPrices(); }, []);

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
            <Header />

            <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mb: 4 }}>Tabela de Preços</Typography>

                {loading ? <CircularProgress /> : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <TableContainer component={Paper} sx={{ width: '100%', maxWidth: 800 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Produto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Preço Unitário</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {products.map(p => (
                                    <TableRow key={p.objectId}>
                                        <TableCell>{p.productName}</TableCell>
                                        <TableCell align="center">R${p.price.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                <Button sx={{ mt: 3 }} variant="outlined" onClick={() => navigate(-1)}>
                    Voltar
                </Button>
            </Box>
        </Box>
    );
};

export default PriceTable;
