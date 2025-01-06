import React, { useEffect, useState } from 'react';
import {
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    CircularProgress,
    Button,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import EditSaleDialog from '../components/EditSaleDialog';

const SalesHistory = () => {
    const [salesReport, setSalesReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentMonth, setCurrentMonth] = useState("todos");
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [editingSale, setEditingSale] = useState(null);

    const navigate = useNavigate();

    const handleUpdateSale = (updatedSale) => {
        setSalesReport((prev) => ({
            ...prev,
            salesDetails: prev.salesDetails.map((sale) =>
                sale.objectId === updatedSale.objectId ? updatedSale : sale
            ),
        }));
    };

    const fetchSalesReport = async (month, year) => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                '/functions/get-sales-report',
                {
                    month: month === "todos" ? "todos" : month,
                    year
                },
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            setSalesReport(response.data.result);
            setLoading(false);
        } catch (err) {
            console.error('Erro ao buscar relatório de vendas:', err);
            setError('Erro ao carregar o relatório de vendas.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalesReport(currentMonth === "todos" ? "todos" : currentMonth, currentYear);
    }, [currentMonth, currentYear]);

    const handleMonthChange = (event) => {
        setCurrentMonth(event.target.value);
    };

    const handleYearChange = (event) => {
        setCurrentYear(parseInt(event.target.value, 10));
    };

    const handleGeneratePDF = () => {
        if (!salesReport || !salesReport.salesDetails.length) {
            return;
        }

        const doc = new jsPDF();
        doc.text('Relatório de Vendas', 14, 20);

        const tableColumn = ['Produto', 'Quantidade Vendida', 'Preço Total', 'Data da Venda'];
        const tableRows = salesReport.salesDetails.map((sale) => [
            sale.productName,
            sale.quantitySold,
            `R$${sale.totalPrice.toFixed(2)}`,
            new Date(sale.saleDate.iso).toLocaleDateString('pt-BR'),
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });

        doc.save(`relatorio-vendas-${currentMonth}-${currentYear}.pdf`);
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
            {/* Cabeçalho */}
            <Header />

            {/* Conteúdo Principal */}
            <Box sx={{ flex: 1, padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <Paper sx={{ padding: '24px', width: '100%', maxWidth: '800px' }}>
                    <Typography variant="h4" gutterBottom align="center">
                        Histórico de Vendas
                    </Typography>

                    {loading ? (
                        <CircularProgress sx={{ display: 'block', margin: '16px auto' }} />
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : (
                        <>
                            {/* Filtro por mês e ano + botão para PDF */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                                <FormControl sx={{ minWidth: 150 }}>
                                    <InputLabel id="month-select-label">Mês</InputLabel>
                                    <Select
                                        labelId="month-select-label"
                                        value={currentMonth}
                                        onChange={handleMonthChange}
                                        label="Mês"
                                    >
                                        <MenuItem value="todos">Todos</MenuItem>
                                        {Array.from({ length: 12 }, (_, index) => (
                                            <MenuItem key={index + 1} value={index + 1}>
                                                {new Date(0, index).toLocaleString('pt-BR', {
                                                    month: 'long',
                                                })}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl sx={{ minWidth: 150 }}>
                                    <InputLabel id="year-select-label">Ano</InputLabel>
                                    <Select
                                        labelId="year-select-label"
                                        value={currentYear}
                                        onChange={handleYearChange}
                                        label="Ano"
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

                                <Button variant="contained" color="primary" onClick={handleGeneratePDF}>
                                    Exportar para PDF
                                </Button>
                            </Box>

                            {/* Resumo Geral */}
                            <Typography variant="h6" gutterBottom>
                                Resumo do Mês Selecionado
                            </Typography>
                            <Typography variant="body1">
                                <strong>Total de Vendas:</strong> {salesReport.totalSales}
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                <strong>Receita do Mês:</strong> R${salesReport.totalRevenue.toFixed(2)}
                            </Typography>

                            {/* Detalhes das Vendas */}
                            <Typography variant="h6" gutterBottom sx={{ marginTop: '24px' }}>
                                Detalhes das Vendas
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Produto</strong></TableCell>
                                            <TableCell align="center"><strong>Quantidade Vendida</strong></TableCell>
                                            <TableCell align="center"><strong>Preço Total</strong></TableCell>
                                            <TableCell align="center"><strong>Data da Venda</strong></TableCell>
                                            <TableCell align="center"><strong>Ações</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {salesReport.salesDetails.map((sale, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{sale.productName}</TableCell>
                                                <TableCell align="center">{sale.quantitySold}</TableCell>
                                                <TableCell align="center">R${sale.totalPrice.toFixed(2)}</TableCell>
                                                <TableCell align="center">
                                                    {new Date(sale.saleDate.iso).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        variant="outlined"
                                                        color="primary"
                                                        onClick={() =>
                                                            setEditingSale({
                                                                ...sale,
                                                                objectId: sale.objectId || index,
                                                            })
                                                        }
                                                    >
                                                        Editar
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            </Box>
            {editingSale && (
                <EditSaleDialog
                    sale={editingSale}
                    onClose={() => setEditingSale(null)}
                    onUpdate={handleUpdateSale}
                />
            )}
        </Box>
    );
};

export default SalesHistory;
