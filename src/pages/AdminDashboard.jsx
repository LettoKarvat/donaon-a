import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { ShoppingCart, Group, BarChart } from '@mui/icons-material';
import api from '../services/api';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);
    const [totalSellers, setTotalSellers] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                setLoading(true);

                const productsResponse = await api.post('/functions/list-active-products', {}, {
                    headers: {
                        'X-Parse-Session-Token': localStorage.getItem('sessionToken'),
                    },
                });
                setTotalProducts(productsResponse.data.result.length);

                const sellersResponse = await api.post('/functions/get-total-sellers', {}, {
                    headers: {
                        'X-Parse-Session-Token': localStorage.getItem('sessionToken'),
                    },
                });

                setTotalSellers(sellersResponse.data.result.totalSellers);


                const salesResponse = await api.get('/classes/Sales');
                const salesData = salesResponse.data.results;
                const totalProductsSold = salesData.reduce((sum, sale) => sum + sale.quantitySold, 0);
                setTotalSales(totalProductsSold);

                setLoading(false);
            } catch (err) {
                console.error('Erro ao carregar dados do admin:', err);
                setLoading(false);
            }
        };


        fetchAdminData();
    }, []);

    const handleNavigation = (path) => {
        navigate(path);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, #ffe6f0, #ffffff)',
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
                    padding: '16px',
                }}
            >
                <Typography
                    variant="h3"
                    sx={{
                        fontFamily: "'Dancing Script', cursive",
                        fontWeight: 'bold',
                        color: '#e91e63',
                        mb: 2,
                    }}
                >
                    Dona Onça Gestão
                </Typography>
                <Typography variant="h5" sx={{ mb: 4 }}>
                    Dashboard do Administrador
                </Typography>

                {loading ? (
                    <CircularProgress />
                ) : (
                    <Grid container spacing={4} sx={{ maxWidth: '900px', width: '100%' }}>
                        <Grid item xs={12} sm={4}>
                            <Paper
                                elevation={3}
                                sx={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    backgroundColor: '#e3f2fd',
                                    transition: 'transform 0.3s',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                    },
                                }}
                            >
                                <ShoppingCart fontSize="large" color="primary" />
                                <Typography variant="h6" sx={{ mt: 1 }}>
                                    Total de Produtos
                                </Typography>
                                <Typography variant="h3" color="primary">
                                    {totalProducts}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Paper
                                elevation={3}
                                sx={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    backgroundColor: '#e8f5e9',
                                    transition: 'transform 0.3s',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                    },
                                }}
                            >
                                <Group fontSize="large" color="success" />
                                <Typography variant="h6" sx={{ mt: 1 }}>
                                    Total de Revendedores
                                </Typography>
                                <Typography variant="h3" color="success">
                                    {totalSellers}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Paper
                                elevation={3}
                                sx={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    backgroundColor: '#fbe9e7',
                                    transition: 'transform 0.3s',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                    },
                                }}
                            >
                                <BarChart fontSize="large" color="error" />
                                <Typography variant="h6" sx={{ mt: 1 }}>
                                    Total de Produtos Vendidos
                                </Typography>
                                <Typography variant="h3" color="error">
                                    {totalSales}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                onClick={() => handleNavigation('/products')}
                            >
                                Gerenciar Produtos
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="secondary"
                                onClick={() => handleNavigation('/users')}
                            >
                                Gerenciar Revendedores
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="success"
                                onClick={() => handleNavigation('/reports')}
                            >
                                Relatórios
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </Box>
        </Box>
    );
};

export default AdminDashboard;
