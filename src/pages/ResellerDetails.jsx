import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Paper,
    Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';

const ResellerDetails = () => {
    const { resellerId } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDetails = async () => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        try {
            const response = await api.post(
                '/functions/get-deliveries-report',
                { resellerId },
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            setDetails(response.data.result);
            setLoading(false);
        } catch (err) {
            console.error('Erro ao buscar detalhes do revendedor:', err);
            setError('Erro ao carregar os detalhes.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [resellerId]);

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <Box sx={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
                    Detalhes do Revendedor
                </Typography>
                {loading ? (
                    <CircularProgress />
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Paper sx={{ padding: '24px', width: '100%', maxWidth: '800px' }}>
                        <Typography variant="h5" gutterBottom>
                            Revendedor: <strong>{details.resellerName}</strong>
                        </Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Produto</strong></TableCell>
                                        <TableCell align="center"><strong>Quantidade Vendida</strong></TableCell>
                                        <TableCell align="center"><strong>Estoque Atual</strong></TableCell>
                                        <TableCell align="left"><strong>Entregas</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.entries(details.products).map(([productId, data]) => (
                                        <TableRow key={productId}>
                                            <TableCell>{data.productName}</TableCell> {/* Exibe o nome real do produto */}
                                            <TableCell align="center">{data.sold}</TableCell>
                                            <TableCell align="center">{data.currentStock}</TableCell>
                                            <TableCell>
                                                {data.deliveryDetails.map((delivery, index) => (
                                                    <Typography key={index}>
                                                        {new Date(delivery.date.iso).toLocaleDateString('pt-BR')} -{' '}
                                                        {delivery.quantity} unidades
                                                    </Typography>
                                                ))}
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Box sx={{ marginTop: '16px', textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">
                                Dados carregados com sucesso.
                            </Typography>
                        </Box>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default ResellerDetails;
