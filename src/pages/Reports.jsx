import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    TextField,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';

const AdminReports = () => {
    const [reports, setReports] = useState({});
    const [filteredReports, setFilteredReports] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const navigate = useNavigate();

    const fetchReports = async () => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                '/functions/get-admin-reports',
                {},
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            setReports(response.data.result || {});
            setFilteredReports(response.data.result || {});
            setLoading(false);
        } catch (err) {
            console.error('Erro ao buscar relatórios:', err);
            setError('Erro ao carregar os relatórios.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const calculateTotalsForMonth = (salesDetails) => {
        return salesDetails.reduce(
            (totals, sale) => {
                const saleDate = new Date(sale.saleDate.iso);
                const saleMonth = saleDate.getMonth() + 1;
                const saleYear = saleDate.getFullYear();

                if (
                    (selectedMonth === "all" || saleMonth === parseInt(selectedMonth, 10)) &&
                    saleYear === selectedYear
                ) {
                    totals.totalSales += sale.quantitySold;
                    totals.totalRevenue += sale.totalPrice;
                }
                return totals;
            },
            { totalSales: 0, totalRevenue: 0 }
        );
    };

    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);

        const filtered = Object.entries(reports).reduce((acc, [resellerName, report]) => {
            if (resellerName.toLowerCase().includes(term)) {
                acc[resellerName] = {
                    ...report,
                    salesDetails: report.salesDetails.filter((sale) => {
                        const saleDate = new Date(sale.saleDate.iso);
                        const saleMonth = saleDate.getMonth() + 1;
                        const saleYear = saleDate.getFullYear();
                        return (
                            (selectedMonth === "all" || saleMonth === parseInt(selectedMonth, 10)) &&
                            saleYear === selectedYear
                        );
                    }),
                };
            }
            return acc;
        }, {});

        setFilteredReports(filtered);
    };

    const handleMonthChange = (e) => {
        setSelectedMonth(e.target.value);
        applyFilters(e.target.value, selectedYear);
    };

    const handleYearChange = (e) => {
        setSelectedYear(parseInt(e.target.value, 10));
        applyFilters(selectedMonth, parseInt(e.target.value, 10));
    };

    const applyFilters = (month, year) => {
        const filtered = Object.entries(reports).reduce((acc, [resellerName, report]) => {
            acc[resellerName] = {
                ...report,
                salesDetails: report.salesDetails.filter((sale) => {
                    const saleDate = new Date(sale.saleDate.iso);
                    const saleMonth = saleDate.getMonth() + 1;
                    const saleYear = saleDate.getFullYear();
                    return (
                        (month === "all" || saleMonth === parseInt(month, 10)) &&
                        saleYear === year
                    );
                }),
            };
            return acc;
        }, {});

        setFilteredReports(filtered);
    };

    const handleViewDetails = (resellerId) => {
        navigate(`/admin/reports/${resellerId}`);
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <Box sx={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
                    Relatório de Vendas (Administrador)
                </Typography>

                {loading ? (
                    <CircularProgress />
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Paper sx={{ padding: '16px', width: '100%', maxWidth: '800px' }}>
                        <Box sx={{ display: 'flex', gap: '16px', mb: 3 }}>
                            <TextField
                                label="Buscar Revendedor"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            <FormControl fullWidth>
                                <InputLabel id="month-select-label">Mês</InputLabel>
                                <Select
                                    labelId="month-select-label"
                                    label="Mês"
                                    value={selectedMonth}
                                    onChange={handleMonthChange}
                                >
                                    <MenuItem value="all">Todos</MenuItem>
                                    {[...Array(12).keys()].map((month) => (
                                        <MenuItem key={month + 1} value={month + 1}>
                                            {new Date(0, month).toLocaleString('default', { month: 'long' })}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel id="year-select-label">Ano</InputLabel>
                                <Select
                                    labelId="year-select-label"
                                    label="Ano"
                                    value={selectedYear}
                                    onChange={handleYearChange}
                                >
                                    {[...Array(5).keys()].map((offset) => {
                                        const year = new Date().getFullYear() - offset;
                                        return (
                                            <MenuItem key={year} value={year}>
                                                {year}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Box>

                        {Object.entries(filteredReports).map(([resellerName, report]) => {
                            const { totalSales, totalRevenue } = calculateTotalsForMonth(report.salesDetails);

                            return (
                                <Box key={resellerName} sx={{ marginBottom: '32px' }}>
                                    <Typography variant="h6" gutterBottom>
                                        {resellerName}
                                    </Typography>
                                    <Typography variant="body1">
                                        <strong>Total de Vendas:</strong>{' '}
                                        <Button
                                            variant="text"
                                            color="primary"
                                            onClick={() => handleViewDetails(report.resellerId)}
                                        >
                                            {totalSales}
                                        </Button>
                                    </Typography>
                                    <Typography variant="body1">
                                        <strong>Receita Total:</strong> R${totalRevenue.toFixed(2)}
                                    </Typography>

                                    <TableContainer component={Paper} sx={{ marginTop: '16px' }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>Produto</strong></TableCell>
                                                    <TableCell align="center"><strong>Quantidade Vendida</strong></TableCell>
                                                    <TableCell align="center"><strong>Preço Total</strong></TableCell>
                                                    <TableCell align="center"><strong>Data da Venda</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {report.salesDetails.map((sale, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{sale.productName}</TableCell>
                                                        <TableCell align="center">{sale.quantitySold}</TableCell>
                                                        <TableCell align="center">R${sale.totalPrice.toFixed(2)}</TableCell>
                                                        <TableCell align="center">
                                                            {new Date(sale.saleDate.iso).toLocaleDateString('pt-BR')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            );
                        })}
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default AdminReports;
