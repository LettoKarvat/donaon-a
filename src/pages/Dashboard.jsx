// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

import {
    Box,
    Typography,
    Paper,
    Grid,
    Button,
} from '@mui/material';
import {
    Inventory2Outlined,
    AddShoppingCartOutlined,
    HistoryOutlined,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import api from '../services/api';

/* Converte qualquer saleDate (Date do Parse) para dayjs no fuso local */
const parseSaleDate = (d) => dayjs.utc(d?.iso ?? d).local();

const Dashboard = () => {
    const [userName, setUserName] = useState('');
    const [monthlySales, setMonthlySales] = useState(0);
    const navigate = useNavigate();

    /* ---------- carrega vendas do mês ---------- */
    const fetchDashboardData = async () => {
        try {
            setUserName(localStorage.getItem('fullname') || 'Revendedor');

            const { data } = await api.post(
                '/functions/list-sales-by-user',
                {},
                { headers: { 'X-Parse-Session-Token': localStorage.getItem('sessionToken') } },
            );

            const sales = data.result || [];
            const monthIndex = dayjs().month(); // mês atual (0-11) no fuso local

            const total = sales
                .filter((s) => parseSaleDate(s.saleDate).month() === monthIndex)
                .reduce((sum, s) => sum + (s.quantitySold || 0), 0);

            setMonthlySales(total);
        } catch (err) {
            console.error('Erro ao buscar dados do dashboard:', err);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    const handleNavigation = (path) => navigate(path);

    /* ---------- UI ---------- */
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
                    p: 2,
                    height: 'calc(100vh - 64px)',
                }}
            >
                <Typography
                    variant="h3"
                    sx={{
                        mb: 3,
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
                        p: 3,
                        mb: 3,
                        width: '100%',
                        maxWidth: 500,
                        backgroundColor: '#fff0f5',
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="h6">Vendas deste mês</Typography>
                    <Typography variant="h3" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
                        {monthlySales}
                    </Typography>
                </Paper>

                <Grid container spacing={3} sx={{ maxWidth: 500 }}>
                    <Grid item xs={12} sm={6}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            startIcon={<Inventory2Outlined />}
                            onClick={() => handleNavigation('/stock')}
                            sx={{
                                py: 1.5,
                                borderRadius: 1,
                                fontWeight: 'bold',
                                '&:hover': { backgroundColor: '#1976d2' },
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
                                py: 1.5,
                                borderRadius: 1,
                                fontWeight: 'bold',
                                '&:hover': { backgroundColor: '#7b1fa2' },
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
                                py: 1.5,
                                borderRadius: 1,
                                fontWeight: 'bold',
                                '&:hover': { backgroundColor: '#388e3c' },
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
