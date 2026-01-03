// src/pages/Reports.jsx
import React, { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
dayjs.extend(isBetween);
dayjs.extend(utc);

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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
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

/* gera lista de anos disponíveis (de 2024 até o ano atual) */
const getAvailableYears = () => {
    const currentYear = dayjs().year();
    const startYear = 2024;
    const years = [];
    for (let y = currentYear; y >= startYear; y--) {
        years.push(y);
    }
    return years;
};

/* calcula data fim padrão para um ano */
const getDefaultEndDate = (year) => {
    const currentYear = dayjs().year();
    if (year < currentYear) {
        return dayjs(`${year}-12-31`).endOf('day');
    }
    return dayjs().endOf('day');
};

const AdminReports = () => {
    const [reports, setReports] = useState({});
    const [filteredReports, setFilteredReports] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    /* —— Seletor de ano —— */
    const [selectedYear, setSelectedYear] = useState(dayjs().year());
    const availableYears = useMemo(() => getAvailableYears(), []);

    /* —— datas —— */
    const [startDate, setStartDate] = useState(dayjs().startOf('year'));
    const [endDate, setEndDate] = useState(dayjs().endOf('day'));

    const [pageState, setPageState] = useState({});
    const navigate = useNavigate();

    /* ---------------- aplicar filtros ---------------- */
    const applyFilters = (term, dIni, dFim, base) => {
        console.log('[Reports] Aplicando filtros:', {
            termo: term,
            dataInicio: dIni?.format('DD/MM/YYYY'),
            dataFim: dFim?.format('DD/MM/YYYY'),
            totalRevendedores: Object.keys(base).length
        });

        const filtered = Object.entries(base).reduce((acc, [name, rep]) => {
            // Filtro por nome
            if (!name.toLowerCase().includes(term.toLowerCase())) {
                return acc;
            }

            // Filtro por data
            const filteredSales = rep.salesDetails.filter((s) => {
                const saleDate = parseSaleDate(s.saleDate);
                const isInRange = saleDate.isBetween(dIni, dFim, 'day', '[]');
                return isInRange;
            });

            // Inclui se tem vendas no período OU se está buscando por nome específico
            if (filteredSales.length > 0) {
                acc[name] = { ...rep, salesDetails: filteredSales };
            }

            return acc;
        }, {});

        console.log('[Reports] Após filtros:', Object.keys(filtered).length, 'revendedores');
        setFilteredReports(filtered);
    };

    /* ---------------- fetch de todos os meses do ano selecionado ---------------- */
    const fetchReports = async (year, filterStartDate, filterEndDate) => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) return setError('Sessão expirada. Faça login novamente.');

        try {
            setLoading(true);
            setError('');
            const headers = { 'X-Parse-Session-Token': sessionToken };

            const currentYear = dayjs().year();
            const currentMonth = dayjs().month() + 1;

            // Se for o ano atual, busca até o mês atual; senão, busca todos os 12 meses
            const maxMonth = year === currentYear ? currentMonth : 12;
            const months = Array.from({ length: maxMonth }, (_, i) => i + 1);

            console.log(`[Reports] Buscando dados de ${year}, meses 1 a ${maxMonth}`);

            /* faz todas as chamadas em paralelo */
            const monthlyData = await Promise.all(
                months.map(async (m) => {
                    try {
                        const { data } = await api.post(
                            '/functions/gett-admin-reports',
                            { month: m, year },
                            { headers },
                        );
                        console.log(`[Reports] Mês ${m}/${year}:`, Object.keys(data.result || {}).length, 'revendedores');
                        return data.result || {};
                    } catch (err) {
                        console.error(`[Reports] Erro no mês ${m}/${year}:`, err);
                        return {};
                    }
                }),
            );

            /* junta tudo */
            const merged = mergeMonthlyReports(monthlyData);
            console.log('[Reports] Total revendedores encontrados:', Object.keys(merged).length);

            setReports(merged);

            // Usa as datas passadas como parâmetro (não o state que pode estar desatualizado)
            applyFilters(searchTerm, filterStartDate, filterEndDate, merged);

        } catch (err) {
            console.error(err);
            setError('Erro ao carregar os relatórios.');
        } finally {
            setLoading(false);
        }
    };

    /* Atualiza quando o ano selecionado muda */
    useEffect(() => {
        // Calcula as novas datas
        const newStartDate = dayjs(`${selectedYear}-01-01`).startOf('day');
        const newEndDate = getDefaultEndDate(selectedYear);

        console.log('[Reports] Ano selecionado:', selectedYear);
        console.log('[Reports] Período:', newStartDate.format('DD/MM/YYYY'), 'até', newEndDate.format('DD/MM/YYYY'));

        // Atualiza o state das datas
        setStartDate(newStartDate);
        setEndDate(newEndDate);

        // Passa as datas calculadas diretamente para o fetch (não depende do state)
        fetchReports(selectedYear, newStartDate, newEndDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    /* ---------------- helpers ---------------- */
    const calcTotals = (sales) =>
        sales.reduce(
            (tot, s) => {
                tot.totalSales += s.quantitySold || 0;
                tot.totalRevenue += s.totalPrice || 0;
                return tot;
            },
            { totalSales: 0, totalRevenue: 0 },
        );

    /* ---------------- handlers ---------------- */
    const handleYearChange = (e) => {
        setSelectedYear(e.target.value);
    };

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(term, startDate, endDate, reports);
    };

    const handleStartDateChange = (d) => {
        const newStart = d ? d.startOf('day') : null;
        setStartDate(newStart);
        if (newStart && endDate) {
            applyFilters(searchTerm, newStart, endDate, reports);
        }
    };

    const handleEndDateChange = (d) => {
        const newEnd = d ? d.endOf('day') : null;
        setEndDate(newEnd);
        if (startDate && newEnd) {
            applyFilters(searchTerm, startDate, newEnd, reports);
        }
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
        [filteredReports],
    );

    /* Calcula totais gerais */
    const grandTotals = useMemo(() => {
        return sortedResellers.reduce(
            (acc, { totalSales, totalRevenue }) => ({
                totalSales: acc.totalSales + totalSales,
                totalRevenue: acc.totalRevenue + totalRevenue,
            }),
            { totalSales: 0, totalRevenue: 0 }
        );
    }, [sortedResellers]);

    /* ---------------- UI ---------------- */
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box
                sx={{
                    minHeight: '100vh',
                    background: '#f5f5f5',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Header />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="h4" sx={{ mb: 4 }}>
                        Relatório de Vendas (Administrador)
                    </Typography>

                    {loading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <CircularProgress />
                            <Typography variant="body2" color="textSecondary">
                                Carregando dados de {selectedYear}...
                            </Typography>
                        </Box>
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : (
                        <Paper sx={{ p: 2, width: '100%', maxWidth: 900 }}>
                            {/* Filtros */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
                                {/* Seletor de Ano */}
                                <FormControl sx={{ minWidth: 120 }}>
                                    <InputLabel id="year-select-label">Ano</InputLabel>
                                    <Select
                                        labelId="year-select-label"
                                        value={selectedYear}
                                        label="Ano"
                                        onChange={handleYearChange}
                                    >
                                        {availableYears.map((year) => (
                                            <MenuItem key={year} value={year}>
                                                {year}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    sx={{ flex: 1, minWidth: 200 }}
                                    label="Buscar Revendedor"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                <DatePicker
                                    label="Data Início"
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    format="DD/MM/YYYY"
                                />
                                <DatePicker
                                    label="Data Fim"
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                    format="DD/MM/YYYY"
                                />
                            </Box>

                            {/* Resumo Geral */}
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 2,
                                    mb: 3,
                                    backgroundColor: '#e3f2fd',
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    flexWrap: 'wrap',
                                    gap: 2
                                }}
                            >
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Revendedores
                                    </Typography>
                                    <Typography variant="h5" color="primary">
                                        {sortedResellers.length}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="textSecondary">
                                        Total de Vendas
                                    </Typography>
                                    <Typography variant="h5" color="primary">
                                        {grandTotals.totalSales}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="textSecondary">
                                        Receita Total
                                    </Typography>
                                    <Typography variant="h5" color="primary">
                                        R${grandTotals.totalRevenue.toFixed(2)}
                                    </Typography>
                                </Box>
                            </Paper>

                            {/* Lista vazia */}
                            {sortedResellers.length === 0 && (
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    Nenhuma venda encontrada para o período selecionado em {selectedYear}.
                                </Alert>
                            )}

                            {/* Lista de Revendedores */}
                            {sortedResellers.map(({ name, rep, totalSales, totalRevenue }) => {
                                const id = rep.resellerId;
                                const { page = 0, rowsPerPage = 10 } = pageState[id] || {};
                                const startIdx = page * rowsPerPage;
                                const paginated = rep.salesDetails.slice(startIdx, startIdx + rowsPerPage);

                                return (
                                    <Box key={name} sx={{ mb: 4 }}>
                                        <Typography variant="h6">{name}</Typography>
                                        <Typography>
                                            <strong>Total de Vendas:</strong>{' '}
                                            <Button onClick={() => handleViewDetails(id)}>{totalSales}</Button>
                                        </Typography>
                                        <Typography>
                                            <strong>Receita Total:</strong> R${totalRevenue.toFixed(2)}
                                        </Typography>

                                        {rep.salesDetails.length > 0 ? (
                                            <TableContainer component={Paper} sx={{ mt: 2 }}>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>
                                                                <strong>Produto</strong>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <strong>Quantidade</strong>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <strong>Preço Total</strong>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <strong>Data</strong>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {paginated.map((s, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell>{s.productName}</TableCell>
                                                                <TableCell align="center">{s.quantitySold}</TableCell>
                                                                <TableCell align="center">
                                                                    R${(s.totalPrice || 0).toFixed(2)}
                                                                </TableCell>
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
                                                    onRowsPerPageChange={(e) =>
                                                        handleChangeRowsPerPage(id, e.target.value)
                                                    }
                                                    labelRowsPerPage="Linhas por página"
                                                />
                                            </TableContainer>
                                        ) : (
                                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                                Sem vendas no período selecionado.
                                            </Typography>
                                        )}
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