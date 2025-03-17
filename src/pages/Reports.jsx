// Reports.jsx
import React, { useEffect, useState } from 'react';

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

    // Estado para paginação por revendedor:
    //   pageState = {
    //     [resellerId]: {
    //       page: number,
    //       rowsPerPage: number
    //     },
    //     ...
    //   }
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

    // Calcula total de vendas e receita para o período selecionado
    const calculateTotalsForPeriod = (salesDetails) => {
        return salesDetails.reduce(
            (totals, sale) => {
                const saleDate = dayjs(sale.saleDate.iso);
                if (saleDate.isBetween(startDate, endDate, 'day', '[]')) {
                    totals.totalSales += sale.quantitySold;
                    totals.totalRevenue += sale.totalPrice;
                }
                return totals;
            },
            { totalSales: 0, totalRevenue: 0 }
        );
    };

    // Aplica a busca (searchTerm) e o intervalo de datas (startDate/endDate)
    const applyFilters = (term, newStartDate, newEndDate) => {
        const filtered = Object.entries(reports).reduce((acc, [resellerName, report]) => {
            if (resellerName.toLowerCase().includes(term.toLowerCase())) {
                const filteredSales = report.salesDetails.filter((sale) => {
                    const saleDate = dayjs(sale.saleDate.iso);
                    return saleDate.isBetween(newStartDate, newEndDate, 'day', '[]');
                });

                acc[resellerName] = {
                    ...report,
                    salesDetails: filteredSales,
                };
            }
            return acc;
        }, {});

        setFilteredReports(filtered);
    };

    // Lida com a mudança no campo de busca
    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(term, startDate, endDate);
    };

    // Lida com a mudança da data inicial
    const handleStartDateChange = (date) => {
        setStartDate(date);
        applyFilters(searchTerm, date, endDate);
    };

    // Lida com a mudança da data final
    const handleEndDateChange = (date) => {
        setEndDate(date);
        applyFilters(searchTerm, startDate, date);
    };

    // Navega para a tela de detalhes do revendedor
    const handleViewDetails = (resellerId) => {
        navigate(`/admin/reports/${resellerId}`);
    };

    // Atualiza o estado de paginação (page) de cada revendedor individualmente
    const handleChangePage = (resellerId, newPage) => {
        setPageState((prev) => ({
            ...prev,
            [resellerId]: {
                ...prev[resellerId],
                page: newPage,
            },
        }));
    };

    // Atualiza o estado de paginação (rowsPerPage) de cada revendedor individualmente
    const handleChangeRowsPerPage = (resellerId, newRows) => {
        setPageState((prev) => ({
            ...prev,
            [resellerId]: {
                page: 0, // volta pra página 0 ao trocar o tamanho
                rowsPerPage: parseInt(newRows, 10),
            },
        }));
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                        <Paper sx={{ padding: '16px', width: '100%', maxWidth: '900px' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '16px', mb: 3 }}>
                                <TextField
                                    label="Buscar Revendedor"
                                    fullWidth
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

                            {Object.entries(filteredReports).map(([resellerName, report]) => {
                                const resellerId = report.resellerId;
                                // Calcula total de vendas e receita para o intervalo
                                const { totalSales, totalRevenue } = calculateTotalsForPeriod(report.salesDetails);

                                // Obter a página e o rowsPerPage atuais do estado
                                const { page = 0, rowsPerPage = 10 } = pageState[resellerId] || {};

                                // Paginação: slice nos salesDetails
                                const startIndex = page * rowsPerPage;
                                const endIndex = startIndex + rowsPerPage;
                                const paginatedSales = report.salesDetails.slice(startIndex, endIndex);

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
                                                    {paginatedSales.map((sale, index) => (
                                                        <TableRow key={index}>
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

                                            {/* Componente de paginação para cada tabela */}
                                            <TablePagination
                                                rowsPerPageOptions={[5, 10, 25]}
                                                component="div"
                                                count={report.salesDetails.length} // total de itens (sem slice)
                                                rowsPerPage={rowsPerPage}
                                                page={page}
                                                onPageChange={(event, newPage) => handleChangePage(resellerId, newPage)}
                                                onRowsPerPageChange={(event) => handleChangeRowsPerPage(resellerId, event.target.value)}
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
