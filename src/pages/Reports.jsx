// src/pages/Reports.jsx
import React, { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
dayjs.extend(isBetween);
dayjs.extend(utc);

import {
    Box, Typography, Paper, TextField, Alert, Button, CircularProgress,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    TablePagination,
} from '@mui/material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';

/* converte qualquer formato de data vindo do Parse */
const parseSaleDate = (d) => dayjs.utc(d?.iso ?? d).local();

/* mescla resultados de vários meses */
const mergeMonthlyReports = (arrays) => {
    const merged = {};
    arrays.forEach((res) => {
        Object.entries(res).forEach(([name, rep]) => {
            if (merged[name]) {
                merged[name].salesDetails.push(...rep.salesDetails);
            } else {
                merged[name] = { ...rep, salesDetails: [...rep.salesDetails] };
            }
        });
    });
    return merged;
};

const AdminReports = () => {
    const [reports, setReports] = useState({});
    const [filteredReports, setFilteredReports] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [startDate, setStartDate] = useState(dayjs().startOf('year'));
    const [endDate, setEndDate] = useState(dayjs());

    const [pageState, setPageState] = useState({});
    const navigate = useNavigate();

    /* -------- fetch de janeiro até o mês corrente -------- */
    const fetchReports = async () => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) return setError('Sessão expirada. Faça login novamente.');

        try {
            setLoading(true);
            const headers = { 'X-Parse-Session-Token': sessionToken };
            const year = dayjs().year();
            const currentMonth = dayjs().month() + 1;                // 1-base

            const months = Array.from({ length: currentMonth }, (_, i) => i + 1);

            /* faz todas as chamadas em paralelo */
            const monthlyData = await Promise.all(
                months.map(async (m) => {
                    const { data } = await api.post(
                        '/functions/get-admin-reports',
                        { month: m, year },
                        { headers },
                    );
                    return data.result || {};
                }),
            );

            /* junta tudo */
            const merged = mergeMonthlyReports(monthlyData);
            setReports(merged);
            applyFilters(searchTerm, startDate, endDate, merged);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar os relatórios.');
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    /* -------- helpers -------- */
    const calcTotals = (sales) =>
        sales.reduce(
            (tot, s) => {
                const d = parseSaleDate(s.saleDate);
                if (d.isBetween(startDate, endDate, 'day', '[]')) {
                    tot.totalSales += s.quantitySold;
                    tot.totalRevenue += s.totalPrice;
                }
                return tot;
            },
            { totalSales: 0, totalRevenue: 0 },
        );

    const applyFilters = (term, dIni, dFim, base = reports) => {
        const filtered = Object.entries(base).reduce((acc, [name, rep]) => {
            if (name.toLowerCase().includes(term.toLowerCase())) {
                const filteredSales = rep.salesDetails.filter((s) =>
                    parseSaleDate(s.saleDate).isBetween(dIni, dFim, 'day', '[]'),
                );
                acc[name] = { ...rep, salesDetails: filteredSales };
            }
            return acc;
        }, {});
        setFilteredReports(filtered);
    };

    /* -------- handlers -------- */
    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(term, startDate, endDate);
    };
    const handleStartDateChange = (d) => {
        setStartDate(d);
        applyFilters(searchTerm, d, endDate);
    };
    const handleEndDateChange = (d) => {
        setEndDate(d);
        applyFilters(searchTerm, startDate, d);
    };

    const handleViewDetails = (id) => navigate(`/admin/reports/${id}`);
    const handleChangePage = (id, p) =>
        setPageState((st) => ({ ...st, [id]: { ...st[id], page: p } }));
    const handleChangeRowsPerPage = (id, n) =>
        setPageState((st) => ({ ...st, [id]: { page: 0, rowsPerPage: +n } }));

    /* ordena por total de vendas no período */
    const sortedResellers = useMemo(
        () =>
            Object.entries(filteredReports)
                .map(([name, rep]) => {
                    const { totalSales, totalRevenue } = calcTotals(rep.salesDetails);
                    return { name, rep, totalSales, totalRevenue };
                })
                .sort((a, b) =>
                    b.totalSales === a.totalSales
                        ? a.name.localeCompare(b.name)
                        : b.totalSales - a.totalSales,
                ),
        [filteredReports, startDate, endDate],
    );

    /* -------- UI -------- */
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
                <Header />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ mb: 4 }}>Relatório de Vendas (Administrador)</Typography>

                    {loading ? (
                        <CircularProgress />
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : (
                        <Paper sx={{ p: 2, width: '100%', maxWidth: 900 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                                <TextField fullWidth label="Buscar Revendedor" value={searchTerm} onChange={handleSearch} />
                                <DatePicker label="Data Início" value={startDate} onChange={handleStartDateChange} format="DD/MM/YYYY" />
                                <DatePicker label="Data Fim" value={endDate} onChange={handleEndDateChange} format="DD/MM/YYYY" />
                            </Box>

                            {sortedResellers.map(({ name, rep, totalSales, totalRevenue }) => {
                                const id = rep.resellerId;
                                const { page = 0, rowsPerPage = 10 } = pageState[id] || {};
                                const startIdx = page * rowsPerPage;
                                const paginated = rep.salesDetails.slice(startIdx, startIdx + rowsPerPage);

                                return (
                                    <Box key={name} sx={{ mb: 4 }}>
                                        <Typography variant="h6">{name}</Typography>
                                        <Typography><strong>Total de Vendas:</strong> <Button onClick={() => handleViewDetails(id)}>{totalSales}</Button></Typography>
                                        <Typography><strong>Receita Total:</strong> R${totalRevenue.toFixed(2)}</Typography>

                                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell><strong>Produto</strong></TableCell>
                                                        <TableCell align="center"><strong>Quantidade</strong></TableCell>
                                                        <TableCell align="center"><strong>Preço Total</strong></TableCell>
                                                        <TableCell align="center"><strong>Data</strong></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {paginated.map((s, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{s.productName}</TableCell>
                                                            <TableCell align="center">{s.quantitySold}</TableCell>
                                                            <TableCell align="center">R${s.totalPrice.toFixed(2)}</TableCell>
                                                            <TableCell align="center">
                                                                {parseSaleDate(s.saleDate).format('DD/MM/YYYY')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>

                                            <TablePagination
                                                rowsPerPageOptions={[5, 10, 25]}
                                                count={rep.salesDetails.length}
                                                rowsPerPage={rowsPerPage}
                                                page={page}
                                                onPageChange={(e, p) => handleChangePage(id, p)}
                                                onRowsPerPageChange={(e) => handleChangeRowsPerPage(id, e.target.value)}
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
