// SalesHistory.jsx
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
    TablePagination,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import EditSaleDialog from '../components/EditSaleDialog';

// Import dayjs e plugin isBetween
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

// Import dos DatePickers do MUI X
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const SalesHistory = () => {
    // Armazena todas as vendas retornadas da API
    const [allSales, setAllSales] = useState([]);
    // Armazena apenas as vendas que passaram pelo filtro de datas
    const [filteredSales, setFilteredSales] = useState([]);

    // Estados para data de início e fim (filtro de período)
    const [startDate, setStartDate] = useState(dayjs().startOf('month'));
    const [endDate, setEndDate] = useState(dayjs());

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados para paginação
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Diálogo de edição
    const [editingSale, setEditingSale] = useState(null);

    const navigate = useNavigate();

    // Ao atualizar uma venda, substitui no array
    const handleUpdateSale = (updatedSale) => {
        setAllSales((prev) =>
            prev.map((sale) =>
                sale.objectId === updatedSale.objectId ? updatedSale : sale
            )
        );
    };

    // Busca todas as vendas no backend
    const fetchAllSales = async () => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                '/functions/get-all-sales',
                {},
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );

            const data = response.data.result;
            console.log('Resposta do back-end (data):', data); // <--- Veja a estrutura aqui

            if (data && data.salesDetails) {
                console.log('salesDetails:', data.salesDetails); // <--- checa cada venda
                setAllSales(data.salesDetails);
            } else {
                setAllSales([]);
            }
            setLoading(false);
        } catch (err) {
            console.error('Erro ao buscar relatório de vendas:', err);
            setError('Erro ao carregar o relatório de vendas.');
            setLoading(false);
        }
    };


    // Carrega todas as vendas na montagem do componente
    useEffect(() => {
        fetchAllSales();
    }, []);

    // Sempre que `allSales`, `startDate` ou `endDate` mudarem, refiltra:
    useEffect(() => {
        const newFilteredSales = allSales.filter((sale) => {
            if (!sale.saleDate?.iso) return false;
            const saleDate = dayjs(sale.saleDate.iso);

            // Verifica se a data da venda está entre startDate e endDate (inclusive)
            return saleDate.isBetween(startDate, endDate, 'day', '[]');
        });

        setFilteredSales(newFilteredSales);
        // Sempre que mudar o filtro, reseta para a primeira página
        setPage(0);
    }, [allSales, startDate, endDate]);

    // Calcula o total de vendas (soma de quantities)
    const totalSales = filteredSales.reduce(
        (sum, sale) => sum + sale.quantitySold,
        0
    );
    // Calcula a receita total (soma de totalPrice)
    const totalRevenue = filteredSales.reduce(
        (sum, sale) => sum + sale.totalPrice,
        0
    );

    // Gera PDF das vendas filtradas
    const handleGeneratePDF = () => {
        if (!filteredSales.length) return;

        const doc = new jsPDF();
        doc.text('Relatório de Vendas', 14, 20);

        const tableColumn = [
            'Produto',
            'Quantidade Vendida',
            'Preço Total',
            'Data da Venda',
        ];
        const tableRows = filteredSales.map((sale) => [
            sale.productName,
            sale.quantitySold,
            `R$${sale.totalPrice.toFixed(2)}`,
            dayjs(sale.saleDate.iso).format('DD/MM/YYYY'),
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });

        // Pode customizar o nome do arquivo como quiser
        const fileName = `relatorio-vendas-${startDate.format('DD-MM-YYYY')}-ate-${endDate.format('DD-MM-YYYY')}.pdf`;
        doc.save(fileName);
    };

    // Eventos de paginação
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box
                sx={{
                    minHeight: '100vh',
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Cabeçalho */}
                <Header />

                {/* Conteúdo Principal */}
                <Box
                    sx={{
                        flex: 1,
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Paper sx={{ padding: '24px', width: '100%', maxWidth: '900px' }}>
                        <Typography variant="h4" gutterBottom align="center">
                            Histórico de Vendas
                        </Typography>

                        {loading ? (
                            <CircularProgress sx={{ display: 'block', margin: '16px auto' }} />
                        ) : error ? (
                            <Alert severity="error">{error}</Alert>
                        ) : (
                            <>
                                {/* Filtro de datas + botão PDF */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 2,
                                        marginBottom: 2,
                                        alignItems: 'center',
                                    }}
                                >
                                    <DatePicker
                                        label="Data Início"
                                        value={startDate}
                                        onChange={(newValue) => setStartDate(newValue)}
                                        format="DD/MM/YYYY"
                                    />
                                    <DatePicker
                                        label="Data Fim"
                                        value={endDate}
                                        onChange={(newValue) => setEndDate(newValue)}
                                        format="DD/MM/YYYY"
                                    />
                                    <Button variant="contained" color="primary" onClick={handleGeneratePDF}>
                                        Exportar PDF
                                    </Button>
                                </Box>

                                {/* Resumo do Período */}
                                <Typography variant="h6" gutterBottom>
                                    Resumo do Período Selecionado
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Total de Vendas:</strong> {totalSales}
                                </Typography>
                                <Typography variant="body1" gutterBottom>
                                    <strong>Receita Total:</strong> R${totalRevenue.toFixed(2)}
                                </Typography>

                                {/* Tabela de vendas filtradas */}
                                <Typography variant="h6" gutterBottom sx={{ marginTop: '24px' }}>
                                    Detalhes das Vendas
                                </Typography>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    <strong>Produto</strong>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <strong>Quantidade Vendida</strong>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <strong>Preço Total</strong>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <strong>Data da Venda</strong>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <strong>Ações</strong>
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredSales
                                                .slice(
                                                    page * rowsPerPage,
                                                    page * rowsPerPage + rowsPerPage
                                                )
                                                .map((sale, index) => (
                                                    <TableRow key={sale.objectId || index}>
                                                        <TableCell>{sale.productName}</TableCell>
                                                        <TableCell align="center">
                                                            {sale.quantitySold}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            R${sale.totalPrice.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {dayjs(sale.saleDate.iso).format('DD/MM/YYYY')}
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

                                {/* Paginação */}
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={filteredSales.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                    labelRowsPerPage="Linhas por página"
                                />
                            </>
                        )}
                    </Paper>
                </Box>

                {/* Dialog de Edição */}
                {editingSale && (
                    <EditSaleDialog
                        sale={editingSale}
                        onClose={() => setEditingSale(null)}
                        onUpdate={handleUpdateSale}
                    />
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default SalesHistory;
