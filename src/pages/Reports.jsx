// src/pages/Reports.jsx
import React, { useEffect, useState, useMemo } from 'react';

// dayjs + isBetween para filtrar por intervalo de datas
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

import {
    Box,
    Typography,
    Paper,
    TextField,
    Alert,
    Button,
    CircularProgress,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TablePagination,
} from '@mui/material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';

const AdminReports = () => {
    const [reports, setReports] = useState({});
    const [filteredReports, setFilteredReports] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de data para filtrar as vendas
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());

    // Estado de paginação por revendedor
    const [pageState, setPageState] = useState({});

    const navigate = useNavigate();

    const fetchReports = async () => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.post(
                '/functions/get-admin-reports',
                {},
                { headers: { 'X-Parse-Session-Token': sessionToken } },
            );
            setReports(data.result || {});
            setFilteredReports(data.result || {});
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

    // Calcula total de vendas e receita para o período selecionado
    const calculateTotalsForPeriod = (salesDetails) =>
        salesDetails.reduce(
            (totals, sale) => {
                const saleDate = dayjs(sale.saleDate.iso);
                if (saleDate.isBetween(startDate, endDate, 'day', '[]')) {
                    totals.totalSales += sale.quantitySold;
                    totals.totalRevenue += sale.totalPrice;
                }
                return totals;
            },
            { totalSales: 0, totalRevenue: 0 },
        );

    // Aplica a busca (searchTerm) e o intervalo de datas (startDate/endDate)
    const applyFilters = (term, newStartDate, newEndDate) => {
        const filtered = Object.entries(reports).reduce((acc, [resellerName, report]) => {
            if (resellerName.toLowerCase().includes(term.toLowerCase())) {
                const filteredSales = report.salesDetails.filter((sale) => {
                    const saleDate = dayjs(sale.saleDate.iso);
                    return saleDate.isBetween(newStartDate, newEndDate, 'day', '[]');
                });
                acc[resellerName] = { ...report, salesDetails: filteredSales };
            }
            return acc;
        }, {});
        setFilteredReports(filtered);
    };

    // Handlers de busca e data
    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(term, startDate, endDate);
    };
    const handleStartDateChange = (date) => {
        setStartDate(date);
        applyFilters(searchTerm, date, endDate);
    };
    const handleEndDateChange = (date) => {
        setEndDate(date);
        applyFilters(searchTerm, startDate, date);
    };

    // Navegar para detalhes
    const handleViewDetails = (resellerId) => navigate(`/admin/reports/${resellerId}`);

    // Paginação individual
    const handleChangePage = (resellerId, newPage) =>
        setPageState((prev) => ({
            ...prev,
            [resellerId]: { ...prev[resellerId], page: newPage },
        }));
    const handleChangeRowsPerPage = (resellerId, newRows) =>
        setPageState((prev) => ({
            ...prev,
            [resellerId]: { page: 0, rowsPerPage: parseInt(newRows, 10) },
        }));

    // ----------- NOVO: ordenar por total de vendas (desc) ---------------
    const sortedResellers = useMemo(() => {
        return Object.entries(filteredReports)
            .map(([name, rep]) => {
                const { totalSales, totalRevenue } = calculateTotalsForPeriod(rep.salesDetails);
                return { name, rep, totalSales, totalRevenue };
            })
            .sort((a, b) => {
                if (b.totalSales === a.totalSales) return a.name.localeCompare(b.name);
                return b.totalSales - a.totalSales;
            });
    }, [filteredReports, startDate, endDate]);
    // --------------------------------------------------------------------

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
                <Header />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
                        Relatório de Vendas (Administrador)
                    </Typography>

                    {loading ? (
                        <CircularProgress />
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : (
                        <Paper sx={{ p: 2, width: '100%', maxWidth: 900 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                                <TextField label="Buscar Revendedor" fullWidth value={searchTerm} onChange={handleSearch} />
                                <DatePicker label="Data Início" value={startDate} onChange={handleStartDateChange} format="DD/MM/YYYY" />
                                <DatePicker label="Data Fim" value={endDate} onChange={handleEndDateChange} format="DD/MM/YYYY" />
                            </Box>

                            {sortedResellers.map(({ name: resellerName, rep: report, totalSales, totalRevenue }) => {
                                const resellerId = report.resellerId;
                                const { page = 0, rowsPerPage = 10 } = pageState[resellerId] || {};

                                const startIdx = page * rowsPerPage;
                                const paginatedSales = report.salesDetails.slice(startIdx, startIdx + rowsPerPage);

                                return (
                                    <Box key={resellerName} sx={{ mb: 4 }}>
                                        <Typography variant="h6" gutterBottom>
                                            {resellerName}
                                        </Typography>

                                        <Typography variant="body1">
                                            <strong>Total de Vendas:</strong>{' '}
                                            <Button variant="text" color="primary" onClick={() => handleViewDetails(resellerId)}>
                                                {totalSales}
                                            </Button>
                                        </Typography>

                                        <Typography variant="body1">
                                            <strong>Receita Total:</strong> R${totalRevenue.toFixed(2)}
                                        </Typography>

                                        <TableContainer component={Paper} sx={{ mt: 2 }}>
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
                                                    {paginatedSales.map((sale, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>{sale.productName}</TableCell>
                                                            <TableCell align="center">{sale.quantitySold}</TableCell>
                                                            <TableCell align="center">R${sale.totalPrice.toFixed(2)}</TableCell>
                                                            <TableCell align="center">
                                                                {dayjs(sale.saleDate.iso).format('DD/MM/YYYY')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>

                                            <TablePagination
                                                rowsPerPageOptions={[5, 10, 25]}
                                                component="div"
                                                count={report.salesDetails.length}
                                                rowsPerPage={rowsPerPage}
                                                page={page}
                                                onPageChange={(e, newPage) => handleChangePage(resellerId, newPage)}
                                                onRowsPerPageChange={(e) => handleChangeRowsPerPage(resellerId, e.target.value)}
                                                labelRowsPerPage="Linhas por página"
                                            />
                                        </TableContainer>
                                    </Box>
                                );
                            })}
                        </Paper>
                    )}
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default AdminReports;
