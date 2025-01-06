import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import api from '../services/api';
import { Inventory2Outlined, AddShoppingCartOutlined, HistoryOutlined } from '@mui/icons-material';

const Dashboard = () => {
    const [userName, setUserName] = useState('');
    const [monthlySales, setMonthlySales] = useState(0);
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        try {
            const fullname = localStorage.getItem('fullname');
            setUserName(fullname || 'Revendedor');

            const response = await api.post('/functions/list-sales-by-user', {}, {
                headers: {
                    'X-Parse-Session-Token': localStorage.getItem('sessionToken'),
                },
            });

            const salesArray = response.data.result;
            const currentMonth = new Date().getMonth();

            const filteredSales = salesArray.filter((sale) => {
                const saleDate = new Date(sale.saleDate.iso);
                return saleDate.getMonth() === currentMonth;
            });

            const totalProductsSold = filteredSales.reduce((acc, sale) => acc + sale.quantitySold, 0);
            setMonthlySales(totalProductsSold);
        } catch (err) {
            console.error('Erro ao buscar dados do dashboard:', err);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleNavigation = (path) => {
        navigate(path);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                background: 'linear-gradient(to bottom, #ffe4e1, #ffffff)',
            }}
        >
            <Header />

            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '16px',
                    height: 'calc(100vh - 64px)',
                }}
            >
                <Typography
                    variant="h3"
                    sx={{
                        marginBottom: '24px',
                        fontFamily: "'Dancing Script', cursive",
                        fontWeight: 'bold',
                        color: '#FF1493',
                    }}
                >
                    Bem-vindo(a), {userName}!
                </Typography>

                <Paper
                    elevation={3}
                    sx={{
                        padding: '24px',
                        marginBottom: '24px',
                        width: '100%',
                        maxWidth: '500px',
                        backgroundColor: '#fff0f5',
                        borderRadius: '12px',
                    }}
                >
                    <Typography variant="h6">Vendas deste mês</Typography>
                    <Typography
                        variant="h3"
                        color="primary"
                        sx={{ marginTop: '8px', fontWeight: 'bold' }}
                    >
                        {monthlySales}
                    </Typography>
                </Paper>

                <Grid container spacing={3} sx={{ maxWidth: '500px' }}>
                    <Grid item xs={12} sm={6}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            startIcon={<Inventory2Outlined />}
                            onClick={() => handleNavigation('/stock')}
                            sx={{
                                padding: '12px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: '#1976d2',
                                },
                            }}
                        >
                            Ver Estoque
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Button
                            variant="contained"
                            color="secondary"
                            fullWidth
                            startIcon={<AddShoppingCartOutlined />}
                            onClick={() => handleNavigation('/new-sale')}
                            sx={{
                                padding: '12px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: '#7b1fa2',
                                },
                            }}
                        >
                            Nova Venda
                        </Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            startIcon={<HistoryOutlined />}
                            onClick={() => handleNavigation('/sales-history')}
                            sx={{
                                padding: '12px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: '#388e3c',
                                },
                            }}
                        >
                            Histórico de Vendas
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default Dashboard;
