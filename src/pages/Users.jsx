// src/pages/Users.jsx
import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Button,
    TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    List, Paper as ListPaper
} from '@mui/material';
import {
    Delete, Edit, Inventory, LocalShipping, Restore,
    CleaningServices, KeyboardReturn
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import Header from '../components/Header';
import api from '../services/api';
import DeliveriesModal from '../components/DeliveriesModal';

/* cabeçalho com o token de sessão */
const tokenHeaders = () => ({
    headers: { 'X-Parse-Session-Token': localStorage.getItem('sessionToken') }
});

const Users = () => {
    /* ───────── estados principais ───────── */
    const [loading, setLoading] = useState(true);
    const [sellers, setSellers] = useState([]);
    const [filteredSellers, setFilteredSellers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyDeleted, setShowOnlyDeleted] = useState(false);

    const [currentSort, setCurrentSort] = useState('name');
    const [sortOrderName, setSortOrderName] = useState('asc');
    const [sortOrderSales, setSortOrderSales] = useState('asc');

    /* ───────── estados de modais ───────── */
    const [selectedStockSeller, setSelectedStockSeller] = useState(null);
    const [openStockModal, setOpenStockModal] = useState(false);

    const [selectedDeliverySeller, setSelectedDeliverySeller] = useState(null);
    const [openDeliveriesModal, setOpenDeliveriesModal] = useState(false);

    const [openAddUserModal, setOpenAddUserModal] = useState(false);
    const [newUser, setNewUser] = useState({ fullname: '', email: '', password: '' });
    const [addUserError, setAddUserError] = useState('');

    const [openEditUserModal, setOpenEditUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editUserError, setEditUserError] = useState('');

    const navigate = useNavigate();

    /* ───────── carregamento inicial ───────── */
    const fetchSellers = async () => {
        const token = localStorage.getItem('sessionToken');
        if (!token) return;

        setLoading(true);
        try {
            const resellers = (await api.post('/functions/get-resellers-summarys', {}, tokenHeaders())).data.result;
            const reports = (await api.post('/functions/get-admin-reports', {}, tokenHeaders())).data.result;

            const list = resellers.map(r => ({
                sellerId: r.resellerId,
                sellerName: r.fullname,
                email: r.email,
                isDeleted: r.isDeleted || false,
                salesCount: reports[r.fullname]?.totalSales || 0
            }));

            setSellers(list);
            setFilteredSellers(applyFilters(list, searchTerm, showOnlyDeleted));
        } catch (err) {
            console.error('Erro ao carregar revendedores:', err);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchSellers(); }, []);

    /* ───────── filtro & busca ───────── */
    const applyFilters = (base, term, onlyDeleted) =>
        base
            .filter(s => s.sellerName.toLowerCase().includes(term.toLowerCase()))
            .filter(s => (onlyDeleted ? s.isDeleted : !s.isDeleted));

    const handleSearch = e => {
        const term = e.target.value;
        setSearchTerm(term);
        setFilteredSellers(applyFilters(sellers, term, showOnlyDeleted));
    };

    const toggleShowDeleted = () => {
        const flag = !showOnlyDeleted;
        setShowOnlyDeleted(flag);
        setFilteredSellers(applyFilters(sellers, searchTerm, flag));
    };

    /* ───────── ordenação ───────── */
    const toggleSortName = () => { setCurrentSort('name'); setSortOrderName(p => p === 'asc' ? 'desc' : 'asc'); };
    const toggleSortSales = () => { setCurrentSort('sales'); setSortOrderSales(p => p === 'asc' ? 'desc' : 'asc'); };

    /* ───────── estoque / entregas ───────── */
    const fetchResellerStock = async resellerId => {
        try {
            const res = await api.post('/functions/get-reseller-stock', { resellerId }, tokenHeaders());
            return res.data.result;                                   // [{productId, productName, quantity}]
        } catch (e) { console.error('Erro estoque:', e); return []; }
    };

    const handleViewStock = async seller => {
        const stock = await fetchResellerStock(seller.sellerId);
        if (!stock.length) { alert('Este revendedor não possui estoque.'); return; }

        setSelectedStockSeller({
            ...seller,
            stock,
            stockInput: stock.reduce((acc, p) => ({ ...acc, [p.productId]: 0 }), {})
        });
        setOpenStockModal(true);
    };
    const closeStockModal = () => { setSelectedStockSeller(null); setOpenStockModal(false); };

    /* devolução unitária */
    const handleReturnStock = async (productId, quantity) => {
        if (!quantity) return;
        try {
            await api.post(
                '/functions/return-stock',
                { resellerId: selectedStockSeller.sellerId, productId, quantity: parseInt(quantity, 10) },
                tokenHeaders()
            );
            const updated = await fetchResellerStock(selectedStockSeller.sellerId);
            setSelectedStockSeller(prev => ({
                ...prev,
                stock: updated,
                stockInput: updated.reduce((acc, p) => ({ ...acc, [p.productId]: 0 }), {})
            }));
            fetchSellers();
        } catch { alert('Erro ao devolver estoque'); }
    };

    /* devolução em lote */
    const handleBatchReturn = async () => {
        if (!selectedStockSeller) return;
        const items = Object.entries(selectedStockSeller.stockInput)
            .filter(([, qty]) => qty > 0);
        if (!items.length) { alert('Defina ao menos uma quantidade.'); return; }

        try {
            await Promise.all(
                items.map(([productId, quantity]) =>
                    api.post('/functions/return-stock',
                        {
                            resellerId: selectedStockSeller.sellerId,
                            productId,
                            quantity: parseInt(quantity, 10)
                        },
                        tokenHeaders())
                )
            );
            alert('Itens devolvidos!');
            fetchSellers();
            closeStockModal();
        } catch { alert('Erro ao devolver em lote.'); }
    };

    /* devolução total */
    const handleReturnAll = async () => {
        if (!selectedStockSeller) return;
        if (!window.confirm('Deseja devolver TODO o estoque deste revendedor?')) return;
        try {
            const toReturn = selectedStockSeller.stock.filter(p => p.quantity > 0);
            if (!toReturn.length) { alert('Nenhum item com quantidade > 0.'); return; }

            await Promise.all(
                toReturn.map(({ productId, quantity }) =>
                    api.post('/functions/return-stock',
                        {
                            resellerId: selectedStockSeller.sellerId,
                            productId,
                            quantity: parseInt(quantity, 10)
                        },
                        tokenHeaders())
                )
            );
            alert('Estoque completo devolvido!');
            fetchSellers();
            closeStockModal();
        } catch { alert('Erro ao devolver tudo.'); }
    };

    /* ───────── entregas ───────── */
    const handleViewDeliveries = seller => {
        setSelectedDeliverySeller(seller);
        setOpenDeliveriesModal(true);
    };
    const closeDeliveriesModal = () => { setOpenDeliveriesModal(false); setSelectedDeliverySeller(null); };

    /* ───────── editar / deletar / restaurar ───────── */
    const handleEditUser = seller => {
        setSelectedUser({ sellerId: seller.sellerId, fullname: seller.sellerName, email: seller.email, password: '' });
        setOpenEditUserModal(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser.fullname || !selectedUser.email) { setEditUserError('Todos os campos são obrigatórios!'); return; }
        try {
            await api.post('/functions/update-user',
                { userId: selectedUser.sellerId, fullname: selectedUser.fullname, email: selectedUser.email, password: selectedUser.password },
                tokenHeaders());
            alert('Atualizado!');
            setOpenEditUserModal(false);
            fetchSellers();
        } catch { setEditUserError('Erro ao atualizar.'); }
    };

    const handleDeleteUser = async id => {
        if (!window.confirm('Desativar este revendedor?')) return;
        await api.post('/functions/soft-delete-user', { userId: id }, tokenHeaders());
        fetchSellers();
    };
    const handleRestoreUser = async id => {
        if (!window.confirm('Reativar este revendedor?')) return;
        await api.post('/functions/restore-user', { userId: id }, tokenHeaders());
        fetchSellers();
    };

    /* ───────── adicionar usuário ───────── */
    const handleAddUser = async () => {
        if (!newUser.fullname || !newUser.email || !newUser.password) { setAddUserError('Todos os campos são obrigatórios!'); return; }
        try {
            await api.post('/functions/signup', newUser);
            alert('Revendedor adicionado!');
            setOpenAddUserModal(false);
            setNewUser({ fullname: '', email: '', password: '' });
            fetchSellers();
        } catch { setAddUserError('Erro ao adicionar.'); }
    };

    /* ───────── render ───────── */
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
            <Header />

            {/* ======== CONTEÚDO PRINCIPAL ======== */}
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* título + adicionar */}
                <Box sx={{
                    display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between',
                    width: '100%', maxWidth: 900, mb: 3, gap: 2
                }}>
                    <Typography variant="h4" sx={{ textAlign: 'center', flexGrow: 1 }}>
                        Gerenciar Revendedores
                    </Typography>
                    <Button variant="contained" sx={{ backgroundColor: '#FF4081', fontWeight: 'bold' }}
                        onClick={() => setOpenAddUserModal(true)}>
                        + Adicionar Revendedor(a)
                    </Button>
                </Box>

                {/* busca + toggle inativos */}
                <Box sx={{
                    display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1,
                    width: '100%', maxWidth: 900, mb: 3
                }}>
                    <TextField label="Pesquisar Revendedor" fullWidth value={searchTerm} onChange={handleSearch} />
                    <Button variant={showOnlyDeleted ? 'contained' : 'outlined'} color="secondary" onClick={toggleShowDeleted}>
                        {showOnlyDeleted ? 'Mostrar Ativos' : 'Mostrar Inativos'}
                    </Button>
                </Box>

                {/* tabela */}
                {loading ? <CircularProgress /> : (
                    <TableContainer component={Paper} sx={{ width: '100%', maxWidth: 900 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={toggleSortName}>
                                        Revendedor {currentSort === 'name' && (sortOrderName === 'asc' ? '🔼' : '🔽')}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={toggleSortSales}>
                                        Número de Vendas {currentSort === 'sales' && (sortOrderSales === 'asc' ? '🔼' : '🔽')}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {[...filteredSellers]
                                    .sort((a, b) =>
                                        currentSort === 'name'
                                            ? (sortOrderName === 'asc' ? a.sellerName.localeCompare(b.sellerName) : b.sellerName.localeCompare(a.sellerName))
                                            : (sortOrderSales === 'asc' ? a.salesCount - b.salesCount : b.salesCount - a.salesCount))
                                    .map(seller => (
                                        <TableRow key={seller.sellerId} sx={{ opacity: seller.isDeleted ? 0.5 : 1 }}>
                                            <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer', color: 'blue' }}
                                                onClick={() => navigate(`/users/${seller.sellerId}`)}>
                                                {seller.sellerName || 'Sem nome'}
                                            </TableCell>
                                            <TableCell align="center">{seller.salesCount}</TableCell>
                                            <TableCell align="center">
                                                {seller.isDeleted ? (
                                                    <Button variant="outlined" color="success" startIcon={<Restore />}
                                                        onClick={() => handleRestoreUser(seller.sellerId)}>
                                                        Reativar
                                                    </Button>
                                                ) : (
                                                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
                                                        <Button variant="outlined" color="primary" fullWidth startIcon={<Inventory />}
                                                            onClick={() => handleViewStock(seller)}>Ver Estoque</Button>
                                                        <Button variant="outlined" color="secondary" fullWidth startIcon={<LocalShipping />}
                                                            onClick={() => handleViewDeliveries(seller)}>Entregas</Button>
                                                        <Button variant="outlined" color="primary" fullWidth startIcon={<Edit />}
                                                            onClick={() => handleEditUser(seller)}>Editar</Button>
                                                        <Button variant="outlined" color="error" fullWidth startIcon={<Delete />}
                                                            onClick={() => handleDeleteUser(seller.sellerId)}>Deletar</Button>
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            {/* ================ MODAL ESTOQUE ================ */}
            <Dialog open={openStockModal} onClose={closeStockModal} fullWidth maxWidth="sm">
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                    Estoque de {selectedStockSeller?.sellerName}
                </DialogTitle>

                <DialogContent dividers>
                    {selectedStockSeller?.stock?.length ? (
                        <List sx={{ p: 0 }}>
                            {selectedStockSeller.stock.map(prod => (
                                <ListPaper key={prod.productId} elevation={3} sx={{
                                    p: 2, mb: 2, borderRadius: 2, display: 'flex',
                                    flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 2
                                }}>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography fontWeight="bold">{prod.productName}</Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>Quantidade: {prod.quantity}</Typography>
                                        <TextField
                                            type="number" size="small" label="Quantidade a devolver" sx={{ maxWidth: 160 }}
                                            value={selectedStockSeller.stockInput[prod.productId] ?? ''}
                                            onChange={e => {
                                                const val = Math.min(parseInt(e.target.value || 0, 10), prod.quantity);
                                                setSelectedStockSeller(prev => ({
                                                    ...prev,
                                                    stockInput: { ...prev.stockInput, [prod.productId]: val }
                                                }));
                                            }}
                                        />
                                    </Box>

                                    <Button variant="contained" color="secondary"
                                        disabled={!selectedStockSeller.stockInput[prod.productId]}
                                        onClick={() =>
                                            handleReturnStock(prod.productId,
                                                selectedStockSeller.stockInput[prod.productId] || 0)}
                                    >
                                        Devolver
                                    </Button>
                                </ListPaper>
                            ))}
                        </List>
                    ) : <Typography>Sem estoque registrado.</Typography>}
                </DialogContent>

                {/* ações de lote */}
                {selectedStockSeller?.stock?.length ? (
                    <DialogActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Button
                            startIcon={<CleaningServices />}
                            onClick={() =>
                                setSelectedStockSeller(prev => ({
                                    ...prev,
                                    stockInput: Object.keys(prev.stockInput).reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
                                }))
                            }
                        >
                            Limpar Quantidades
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<KeyboardReturn />}
                                onClick={handleReturnAll}
                            >
                                Devolver Tudo
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                disabled={!Object.values(selectedStockSeller.stockInput).some(q => q > 0)}
                                onClick={handleBatchReturn}
                            >
                                Devolver Selecionados
                            </Button>
                            <Button onClick={closeStockModal} color="secondary">Cancelar</Button>
                        </Box>
                    </DialogActions>
                ) : null}
            </Dialog>

            {/* ================ MODAL ENTREGAS ================ */}
            <DeliveriesModal
                open={openDeliveriesModal}
                onClose={closeDeliveriesModal}
                selectedSeller={selectedDeliverySeller}
            />

            {/* ================ MODAL ADICIONAR ================ */}
            <Dialog open={openAddUserModal} onClose={() => setOpenAddUserModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Adicionar Revendedor</DialogTitle>
                <DialogContent dividers>
                    {addUserError && <Typography color="error" sx={{ mb: 2 }}>{addUserError}</Typography>}
                    <TextField fullWidth label="Nome Completo" sx={{ mb: 2 }}
                        value={newUser.fullname}
                        onChange={e => setNewUser({ ...newUser, fullname: e.target.value })} />
                    <TextField fullWidth label="Email" type="email" sx={{ mb: 2 }}
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    <TextField fullWidth label="Senha" type="password"
                        value={newUser.password}
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddUserModal(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleAddUser} variant="contained" color="primary">Adicionar</Button>
                </DialogActions>
            </Dialog>

            {/* ================ MODAL EDITAR ================ */}
            <Dialog open={openEditUserModal} onClose={() => setOpenEditUserModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Editar Revendedor</DialogTitle>
                <DialogContent dividers>
                    {editUserError && <Typography color="error" sx={{ mb: 2 }}>{editUserError}</Typography>}
                    <TextField fullWidth label="Nome Completo" sx={{ mb: 2 }}
                        value={selectedUser?.fullname || ''}
                        onChange={e => setSelectedUser({ ...selectedUser, fullname: e.target.value })} />
                    <TextField fullWidth label="Email" type="email" sx={{ mb: 2 }}
                        value={selectedUser?.email || ''}
                        onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })} />
                    <TextField fullWidth label="Senha" type="password"
                        value={selectedUser?.password || ''}
                        onChange={e => setSelectedUser({ ...selectedUser, password: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditUserModal(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleUpdateUser} variant="contained" color="primary">Atualizar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Users;
