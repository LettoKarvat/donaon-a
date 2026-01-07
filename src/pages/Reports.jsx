// src/pages/Reports.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
} from '@mui/material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/* converte qualquer formato de data vindo do Parse */
const parseSaleDate = (d) => dayjs.utc(d?.iso ?? d).local();

/* mescla resultados de vários meses/anos */
const mergeReports = (arrays) => {
    const merged = {};
    arrays.forEach((res) => {
        if (!res) return;
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

    /* —— datas: padrão = mês atual —— */
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs().endOf('day'));

    const [pageState, setPageState] = useState({});
    const navigate = useNavigate();

    /* ---------------- aplicar filtros ---------------- */
    const applyFilters = useCallback((term, dIni, dFim, base) => {
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
                return saleDate.isBetween(dIni, dFim, 'day', '[]');
            });

            if (filteredSales.length > 0) {
                acc[name] = { ...rep, salesDetails: filteredSales };
            }

            return acc;
        }, {});

        console.log('[Reports] Após filtros:', Object.keys(filtered).length, 'revendedores');
        setFilteredReports(filtered);
    }, []);

    /* ---------------- buscar dados de um ano/mês específico ---------------- */
    const fetchYearMonthData = async (year, month, headers) => {
        try {
            const { data } = await api.post(
                '/functions/gett-admin-reports',
                { month, year },
                { headers },
            );
            return data.result || {};
        } catch (err) {
            console.error(`[Reports] Erro no mês ${month}/${year}:`, err);
            return {};
        }
    };

    /* ---------------- fetch baseado no range de datas ---------------- */
    const fetchReports = useCallback(async (dIni, dFim) => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const headers = { 'X-Parse-Session-Token': sessionToken };

            // Calcula quais anos/meses precisamos buscar
            const startYear = dIni.year();
            const startMonth = dIni.month() + 1; // 1-based
            const endYear = dFim.year();
            const endMonth = dFim.month() + 1;

            console.log(`[Reports] Buscando de ${startMonth}/${startYear} até ${endMonth}/${endYear}`);

            // Gera lista de todos os meses que precisamos buscar
            const monthsToFetch = [];
            let currentDate = dIni.startOf('month');
            const lastDate = dFim.endOf('month');

            while (currentDate.isBefore(lastDate) || currentDate.isSame(lastDate, 'month')) {
                monthsToFetch.push({
                    year: currentDate.year(),
                    month: currentDate.month() + 1
                });
                currentDate = currentDate.add(1, 'month');
            }

            console.log('[Reports] Meses a buscar:', monthsToFetch);

            // Busca todos os meses em paralelo
            const monthlyData = await Promise.all(
                monthsToFetch.map(({ year, month }) =>
                    fetchYearMonthData(year, month, headers)
                )
            );

            // Junta tudo
            const merged = mergeReports(monthlyData);
            console.log('[Reports] Total revendedores encontrados:', Object.keys(merged).length);

            setReports(merged);
            applyFilters(searchTerm, dIni, dFim, merged);

        } catch (err) {
            console.error(err);
            setError('Erro ao carregar os relatórios.');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, applyFilters]);

    /* Carrega dados iniciais */
    useEffect(() => {
        fetchReports(startDate, endDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---------------- handlers ---------------- */
    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(term, startDate, endDate, reports);
    };

    const handleStartDateChange = (d) => {
        if (!d) return;
        const newStart = d.startOf('day');
        setStartDate(newStart);

        // Se a nova data inicial é de um ano/mês diferente, rebusca os dados
        const needsRefetch = newStart.year() !== startDate.year() ||
            newStart.month() !== startDate.month();

        if (needsRefetch) {
            fetchReports(newStart, endDate);
        } else {
            applyFilters(searchTerm, newStart, endDate, reports);
        }
    };

    const handleEndDateChange = (d) => {
        if (!d) return;
        const newEnd = d.endOf('day');
        setEndDate(newEnd);

        // Se a nova data final é de um ano/mês diferente, rebusca os dados
        const needsRefetch = newEnd.year() !== endDate.year() ||
            newEnd.month() !== endDate.month();

        if (needsRefetch) {
            fetchReports(startDate, newEnd);
        } else {
            applyFilters(searchTerm, startDate, newEnd, reports);
        }
    };

    const handleViewDetails = (id) => navigate(`/admin/reports/${id}`);

    const handleChangePage = (id, p) =>
        setPageState((st) => ({ ...st, [id]: { ...st[id], page: p } }));

    const handleChangeRowsPerPage = (id, n) =>
        setPageState((st) => ({ ...st, [id]: { page: 0, rowsPerPage: +n } }));

    /* ---------------- helpers de cálculo ---------------- */
    const calcTotals = (sales) =>
        sales.reduce(
            (tot, s) => {
                tot.totalSales += s.quantitySold || 0;
                tot.totalRevenue += s.totalPrice || 0;
                return tot;
            },
            { totalSales: 0, totalRevenue: 0 },
        );

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

    /* ---------------- Exportar PDF ---------------- */
    const handleGeneratePDF = () => {
        if (sortedResellers.length === 0) return;

        const doc = new jsPDF();
        doc.text('Relatório de Vendas - Admin', 14, 20);
        doc.setFontSize(10);
        doc.text(`Período: ${startDate.format('DD/MM/YYYY')} até ${endDate.format('DD/MM/YYYY')}`, 14, 28);

        let yPos = 40;

        sortedResellers.forEach(({ name, rep, totalSales, totalRevenue }) => {
            // Verifica se precisa de nova página
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.text(`${name} - Vendas: ${totalSales} | Receita: R$${totalRevenue.toFixed(2)}`, 14, yPos);
            yPos += 8;

            const tableColumn = ['Produto', 'Qtd', 'Preço', 'Data'];
            const tableRows = rep.salesDetails.map((s) => [
                s.productName,
                s.quantitySold,
                `R$${(s.totalPrice || 0).toFixed(2)}`,
                parseSaleDate(s.saleDate).format('DD/MM/YYYY'),
            ]);

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: yPos,
                margin: { left: 14 },
                styles: { fontSize: 8 },
            });

            yPos = doc.lastAutoTable.finalY + 15;
        });

        const fileName = `relatorio-admin-${startDate.format('DD-MM-YYYY')}-ate-${endDate.format('DD-MM-YYYY')}.pdf`;
        doc.save(fileName);
    };

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
                                Carregando dados...
                            </Typography>
                        </Box>
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : (
                        <Paper sx={{ p: 2, width: '100%', maxWidth: 900 }}>
                            {/* Filtros */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
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
                                <TextField
                                    sx={{ flex: 1, minWidth: 200 }}
                                    label="Buscar Revendedor"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleGeneratePDF}
                                    disabled={sortedResellers.length === 0}
                                >
                                    Exportar PDF
                                </Button>
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
                                    Nenhuma venda encontrada para o período de {startDate.format('DD/MM/YYYY')} até {endDate.format('DD/MM/YYYY')}.
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