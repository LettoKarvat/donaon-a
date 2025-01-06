import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import Header from '../components/Header';
import api from '../services/api';

const CurrentStock = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStock = async () => {
        const sessionToken = localStorage.getItem('sessionToken'); // Obtém o token do revendedor autenticado

        if (!sessionToken) {
            console.error('Token de sessão não encontrado. Faça login novamente.');
            return;
        }

        try {
            const response = await api.post(
                '/functions/get-current-stock', // Chama uma função Cloud para filtrar o estoque
                {},
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken, // Passa o token no cabeçalho
                    },
                }
            );

            setStock(response.data.result); // Ajusta o estado com os dados retornados
            setLoading(false);
        } catch (error) {
            console.error('Erro ao carregar estoque:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f5f5f5',
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
                <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
                    Meu Estoque
                </Typography>

                {loading ? (
                    <CircularProgress />
                ) : (
                    <TableContainer component={Paper} sx={{ maxWidth: '800px', width: '100%' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell align="left" sx={{ fontWeight: 'bold' }}>
                                        Produto
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                        Quantidade
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stock.length > 0 ? (
                                    stock.map((item) => (
                                        <TableRow key={item.objectId}>
                                            <TableCell align="left">{item.productName}</TableCell>
                                            <TableCell align="center">{item.quantity}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center">
                                            Nenhum item encontrado no estoque.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Box>
    );
};

export default CurrentStock;
