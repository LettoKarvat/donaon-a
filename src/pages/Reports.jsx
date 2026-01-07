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
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
} from '@mui/material';

import {
    Cancel as CancelIcon,
    Undo as UndoIcon,
} from '@mui/icons-material';

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

    /* —— Modal de cancelamento —— */
    const [cancelDialog, setCancelDialog] = useState({ open: false, sale: null });
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    /* —— Snackbar de feedback —— */
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    /* ---------------- aplicar filtros ---------------- */
    const applyFilters = useCallback((term, dIni, dFim, base) => {
        const filtered = Object.entries(base).reduce((acc, [name, rep]) => {
            if (!name.toLowerCase().includes(term.toLowerCase())) {
                return acc;
            }

            const filteredSales = rep.salesDetails.filter((s) => {
                const saleDate = parseSaleDate(s.saleDate);
                return saleDate.isBetween(dIni, dFim, 'day', '[]');
            });

            if (filteredSales.length > 0) {
                acc[name] = { ...rep, salesDetails: filteredSales };
            }

            return acc;
        }, {});

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

            // Busca todos os meses em paralelo
            const monthlyData = await Promise.all(
                monthsToFetch.map(({ year, month }) =>
                    fetchYearMonthData(year, month, headers)
                )
            );

            // Junta tudo
            const merged = mergeReports(monthlyData);

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

    /* ---------------- CANCELAR VENDA ---------------- */
    const handleOpenCancelDialog = (sale, resellerName) => {
        setCancelDialog({ open: true, sale: { ...sale, resellerName } });
        setCancelReason('');
    };

    const handleCloseCancelDialog = () => {
        setCancelDialog({ open: false, sale: null });
        setCancelReason('');
    };

    const handleCancelSale = async () => {
        if (!cancelDialog.sale) return;

        const sessionToken = localStorage.getItem('sessionToken');
        setCancelling(true);

        try {
            await api.post(
                '/functions/cancel-sale',
                {
                    saleId: cancelDialog.sale.saleId,
                    reason: cancelReason || 'Cancelado pelo administrador'
                },
                { headers: { 'X-Parse-Session-Token': sessionToken } }
            );

            setSnackbar({
                open: true,
                message: 'Venda cancelada com sucesso! Estoque devolvido ao revendedor.',
                severity: 'success'
            });

            // Recarrega os dados
            fetchReports(startDate, endDate);
            handleCloseCancelDialog();

        } catch (err) {
            console.error('Erro ao cancelar venda:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.error || 'Erro ao cancelar venda.',
                severity: 'error'
            });
        } finally {
            setCancelling(false);
        }
    };

    /* ---------------- DESFAZER CANCELAMENTO ---------------- */
    const handleUndoCancel = async (saleId) => {
        const sessionToken = localStorage.getItem('sessionToken');

        try {
            await api.post(
                '/functions/undo-cancel-sale',
                { saleId },
                { headers: { 'X-Parse-Session-Token': sessionToken } }
            );

            setSnackbar({
                open: true,
                message: 'Cancelamento desfeito! Venda restaurada.',
                severity: 'success'
            });

            fetchReports(startDate, endDate);

        } catch (err) {
            console.error('Erro ao desfazer cancelamento:', err);
            setSnackbar({
                open: true,
                message: err.response?.data?.error || 'Erro ao desfazer cancelamento.',
                severity: 'error'
            });
        }
    };

    /* ---------------- handlers de filtro ---------------- */
    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(term, startDate, endDate, reports);
    };

    const handleStartDateChange = (d) => {
        if (!d) return;
        const newStart = d.startOf('day');
        setStartDate(newStart);

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
        sales
            .filter(s => !s.isCancelled) // Só conta vendas ATIVAS
            .reduce(
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
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.text(`${name} - Vendas: ${totalSales} | Receita: R$${totalRevenue.toFixed(2)}`, 14, yPos);
            yPos += 8;

            const tableColumn = ['Produto', 'Qtd', 'Preço', 'Data', 'Status'];
            const tableRows = rep.salesDetails.map((s) => [
                s.productName,
                s.quantitySold,
                `R$${(s.totalPrice || 0).toFixed(2)}`,
                parseSaleDate(s.saleDate).format('DD/MM/YYYY'),
                s.isCancelled ? 'CANCELADA' : 'OK',
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
                        <Paper sx={{ p: 2, width: '100%', maxWidth: 1000 }}>
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
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell><strong>Produto</strong></TableCell>
                                                            <TableCell align="center"><strong>Qtd</strong></TableCell>
                                                            <TableCell align="center"><strong>Preço</strong></TableCell>
                                                            <TableCell align="center"><strong>Data</strong></TableCell>
                                                            <TableCell align="center"><strong>Status</strong></TableCell>
                                                            <TableCell align="center"><strong>Ações</strong></TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {paginated.map((s, i) => (
                                                            <TableRow
                                                                key={i}
                                                                sx={{
                                                                    backgroundColor: s.isCancelled ? '#ffebee' : 'inherit',
                                                                    opacity: s.isCancelled ? 0.7 : 1,
                                                                }}
                                                            >
                                                                <TableCell
                                                                    sx={{
                                                                        textDecoration: s.isCancelled ? 'line-through' : 'none',
                                                                    }}
                                                                >
                                                                    {s.productName}
                                                                </TableCell>
                                                                <TableCell
                                                                    align="center"
                                                                    sx={{ textDecoration: s.isCancelled ? 'line-through' : 'none' }}
                                                                >
                                                                    {s.quantitySold}
                                                                </TableCell>
                                                                <TableCell
                                                                    align="center"
                                                                    sx={{ textDecoration: s.isCancelled ? 'line-through' : 'none' }}
                                                                >
                                                                    R${(s.totalPrice || 0).toFixed(2)}
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    {parseSaleDate(s.saleDate).format('DD/MM/YYYY')}
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    {s.isCancelled ? (
                                                                        <Tooltip title={`Cancelado por: ${s.cancelledBy || 'Admin'}\nMotivo: ${s.cancellationReason || '-'}`}>
                                                                            <Chip
                                                                                label="CANCELADA"
                                                                                color="error"
                                                                                size="small"
                                                                            />
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Chip label="OK" color="success" size="small" />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    {s.isCancelled ? (
                                                                        <Tooltip title="Desfazer cancelamento">
                                                                            <IconButton
                                                                                size="small"
                                                                                color="primary"
                                                                                onClick={() => handleUndoCancel(s.saleId)}
                                                                            >
                                                                                <UndoIcon fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Tooltip title="Cancelar venda">
                                                                            <IconButton
                                                                                size="small"
                                                                                color="error"
                                                                                onClick={() => handleOpenCancelDialog(s, name)}
                                                                            >
                                                                                <CancelIcon fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
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

                {/* Dialog de Cancelamento */}
                <Dialog open={cancelDialog.open} onClose={handleCloseCancelDialog} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ color: 'error.main' }}>
                        Cancelar Venda
                    </DialogTitle>
                    <DialogContent>
                        {cancelDialog.sale && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body1" gutterBottom>
                                    <strong>Revendedor:</strong> {cancelDialog.sale.resellerName}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    <strong>Produto:</strong> {cancelDialog.sale.productName}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    <strong>Quantidade:</strong> {cancelDialog.sale.quantitySold}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    <strong>Valor:</strong> R${(cancelDialog.sale.totalPrice || 0).toFixed(2)}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    <strong>Data:</strong> {parseSaleDate(cancelDialog.sale.saleDate).format('DD/MM/YYYY')}
                                </Typography>
                            </Box>
                        )}

                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Ao cancelar, {cancelDialog.sale?.quantitySold || 0} unidades serão devolvidas ao estoque do revendedor.
                        </Alert>

                        <TextField
                            label="Motivo do cancelamento (opcional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Ex: Cliente desistiu, erro de registro..."
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseCancelDialog} disabled={cancelling}>
                            Voltar
                        </Button>
                        <Button
                            onClick={handleCancelSale}
                            color="error"
                            variant="contained"
                            disabled={cancelling}
                        >
                            {cancelling ? <CircularProgress size={20} /> : 'Confirmar Cancelamento'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar de feedback */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    );
};

export default AdminReports;