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
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    DialogActions,
} from '@mui/material';
import { Delete, Edit, Inventory, LocalShipping } from '@mui/icons-material';

import Header from '../components/Header';
import api from '../services/api';
import DeliveriesModal from '../components/DeliveriesModal';

const Users = () => {
    const [loading, setLoading] = useState(true);
    const [sellers, setSellers] = useState([]);
    const [filteredSellers, setFilteredSellers] = useState([]);
    const [selectedStockSeller, setSelectedStockSeller] = useState(null);
    const [selectedDeliverySeller, setSelectedDeliverySeller] = useState(null);
    const [openStockModal, setOpenStockModal] = useState(false);
    const [openDeliveriesModal, setOpenDeliveriesModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openAddUserModal, setOpenAddUserModal] = useState(false);
    const [newUser, setNewUser] = useState({ fullname: '', email: '', password: '' });
    const [addUserError, setAddUserError] = useState('');
    const [openEditUserModal, setOpenEditUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editUserError, setEditUserError] = useState('');


    const fetchSellers = async () => {
        const sessionToken = localStorage.getItem('sessionToken');

        if (!sessionToken) {
            console.error('Token de sessão não encontrado!');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                '/functions/list-sellers-with-sales',
                {},
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );

            // Filtra apenas os revendedores que não foram deletados (isDeleted: false ou isDeleted inexistente)
            const activeSellers = response.data.result.filter(
                (seller) => !seller.isDeleted
            );

            setSellers(activeSellers);
            setFilteredSellers(activeSellers);
            setLoading(false);
        } catch (err) {
            console.error('Erro ao carregar revendedores:', err.response ? err.response.data : err.message);
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchSellers();
    }, []);

    const handleViewStock = (seller) => {
        setSelectedStockSeller({
            ...seller,
            stockInput: Object.keys(seller.stock).reduce((acc, productId) => {
                acc[productId] = 0;
                return acc;
            }, {}),
        });
        setOpenStockModal(true);
    };

    const handleViewDeliveries = (seller) => {
        setSelectedDeliverySeller(seller);
        setOpenDeliveriesModal(true);
    };

    const closeStockModal = () => {
        setSelectedStockSeller(null);
        setOpenStockModal(false);
    };

    const closeDeliveriesModal = () => {
        setSelectedDeliverySeller(null);
        setOpenDeliveriesModal(false);
    };

    const handleEditUser = (seller) => {
        console.log(seller.email)
        setSelectedUser({
            sellerId: seller.sellerId,
            fullname: seller.sellerName,
            email: seller.email, // Preenche o campo de e-mail
            password: '', // Deixe a senha vazia inicialmente
        });
        setOpenEditUserModal(true);
    };



    const closeEditUserModal = () => {
        setSelectedEditSeller(null);
        setOpenEditUserModal(false);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser.fullname || !selectedUser.email) {
            setEditUserError('Todos os campos são obrigatórios!');
            return;
        }

        try {
            await api.post(
                '/functions/update-user',
                {
                    userId: selectedUser.sellerId, // Enviar o ID do usuário
                    fullname: selectedUser.fullname,
                    email: selectedUser.email,
                    password: selectedUser.password, // Enviar a senha se ela for preenchida
                },
                {
                    headers: {
                        'X-Parse-Session-Token': localStorage.getItem('sessionToken'),
                    },
                }
            );
            alert('Revendedor atualizado com sucesso!');
            setOpenEditUserModal(false);
            setSelectedUser(null);
            fetchSellers();
        } catch (err) {
            console.error('Erro ao atualizar revendedor:', err);
            setEditUserError('Erro ao atualizar revendedor. Verifique os dados e tente novamente.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Tem certeza que deseja deletar este revendedor?")) {
            return;
        }

        try {
            await api.post(
                '/functions/soft-delete-user',
                { userId },
                {
                    headers: {
                        'X-Parse-Session-Token': localStorage.getItem('sessionToken'),
                    },
                }
            );
            alert('Revendedor deletado com sucesso!');
            fetchSellers(); // Atualiza a lista de revendedores
        } catch (err) {
            console.error('Erro ao deletar revendedor:', err);
            alert('Erro ao deletar revendedor. Tente novamente.');
        }
    };



    const handleReturnStock = async (productId, quantity) => {
        if (!selectedStockSeller) return;

        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            alert('Você precisa estar logado para devolver o estoque!');
            return;
        }

        try {
            await api.post(
                '/functions/return-stock',
                {
                    resellerId: selectedStockSeller.sellerId,
                    productId,
                    quantity,
                },
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            alert('Produto devolvido com sucesso!');
            fetchSellers();
            closeStockModal();
        } catch (err) {
            console.error('Erro ao devolver estoque:', err.response ? err.response.data : err.message);
            alert('Erro ao devolver estoque!');
        }
    };

    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        setFilteredSellers(
            sellers.filter((seller) =>
                seller.sellerName?.toLowerCase().includes(term)
            )
        );
    };

    const handleAddUser = async () => {
        if (!newUser.fullname || !newUser.email || !newUser.password) {
            setAddUserError('Todos os campos são obrigatórios!');
            return;
        }

        try {
            await api.post('/functions/signup', newUser);
            alert('Revendedor adicionado com sucesso!');
            setOpenAddUserModal(false);
            setNewUser({ fullname: '', email: '', password: '' });
            fetchSellers();
        } catch (err) {
            console.error('Erro ao adicionar revendedor:', err);
            setAddUserError('Erro ao adicionar revendedor. Verifique os dados e tente novamente.');
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
            <Header />

            <Box sx={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        maxWidth: '900px',
                        mb: 3,
                        gap: 2,
                    }}
                >
                    <Typography variant="h4" sx={{ textAlign: 'center', flexGrow: 1 }}>
                        Gerenciar Revendedores
                    </Typography>
                    <Button
                        variant="contained"
                        sx={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            width: { xs: '100%', sm: 'auto' },
                            maxWidth: '300px',
                            backgroundColor: '#FF4081',
                            color: '#fff',
                            boxShadow: '0px 4px 10px rgba(255, 64, 129, 0.5)',
                        }}
                        onClick={() => setOpenAddUserModal(true)}
                    >
                        + Adicionar Revendedor(a)
                    </Button>
                </Box>




                <TextField
                    label="Pesquisar Revendedor"
                    variant="outlined"
                    fullWidth
                    sx={{ maxWidth: '900px', mb: 3 }}
                    value={searchTerm}
                    onChange={handleSearch}
                />

                {loading ? (
                    <CircularProgress />
                ) : (
                    <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '900px' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Revendedor</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Número de Vendas</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredSellers.map((seller) => (
                                    <TableRow key={seller.sellerId}>
                                        <TableCell>{seller.sellerName || 'Sem nome'}</TableCell>
                                        <TableCell align="center">{seller.salesCount}</TableCell>
                                        <TableCell align="center">
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: { xs: 'column', sm: 'row' },
                                                    gap: 1,
                                                }}
                                            >
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    fullWidth
                                                    onClick={() => handleViewStock(seller)}
                                                    startIcon={<Inventory />}
                                                >
                                                    Ver Estoque
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    color="secondary"
                                                    fullWidth
                                                    onClick={() => handleViewDeliveries(seller)}
                                                    startIcon={<LocalShipping />}
                                                >
                                                    Entregas
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    fullWidth
                                                    onClick={() => handleEditUser(seller)}
                                                    startIcon={<Edit />}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    fullWidth
                                                    onClick={() => handleDeleteUser(seller.sellerId)}
                                                    startIcon={<Delete />}
                                                >
                                                    Deletar
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>


                        </Table>
                    </TableContainer>
                )}
            </Box>

            <Dialog open={openStockModal} onClose={closeStockModal} fullWidth maxWidth="sm">
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                    Estoque de {selectedStockSeller?.sellerName || 'Revendedor'}
                </DialogTitle>
                <DialogContent dividers>
                    {selectedStockSeller?.stock ? (
                        <List sx={{ padding: 0 }}>
                            {Object.entries(selectedStockSeller.stock).map(([productId, productData]) => (
                                <Paper
                                    key={productId}
                                    elevation={3}
                                    sx={{
                                        padding: '16px',
                                        mb: 2,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 2,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                            {productData.productName}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            Quantidade: {productData.quantity}
                                        </Typography>
                                        <TextField
                                            type="number"
                                            label="Quantidade a devolver"
                                            size="small"
                                            sx={{ maxWidth: '150px' }}
                                            value={selectedStockSeller.stockInput[productId] || ''}
                                            onChange={(e) => {
                                                const inputQuantity = Math.min(
                                                    parseInt(e.target.value, 10) || 0,
                                                    productData.quantity
                                                );
                                                setSelectedStockSeller((prev) => ({
                                                    ...prev,
                                                    stockInput: {
                                                        ...prev.stockInput,
                                                        [productId]: inputQuantity,
                                                    },
                                                }));
                                            }}
                                        />
                                    </Box>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        sx={{ mt: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}
                                        onClick={() => handleReturnStock(productId, selectedStockSeller.stockInput[productId] || 0)}
                                        disabled={!selectedStockSeller.stockInput[productId] || selectedStockSeller.stockInput[productId] <= 0}
                                    >
                                        Devolver
                                    </Button>
                                </Paper>
                            ))}
                        </List>
                    ) : (
                        <Typography>Este revendedor não possui estoque registrado.</Typography>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={openAddUserModal} onClose={() => setOpenAddUserModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Adicionar Revendedor</DialogTitle>
                <DialogContent dividers>
                    {addUserError && <Typography color="error" sx={{ mb: 2 }}>{addUserError}</Typography>}
                    <TextField
                        fullWidth
                        label="Nome Completo"
                        value={newUser.fullname}
                        onChange={(e) => setNewUser({ ...newUser, fullname: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Senha"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddUserModal(false)} color="secondary">
                        Cancelar
                    </Button>
                    <Button onClick={handleAddUser} color="primary" variant="contained">
                        Adicionar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEditUserModal} onClose={() => setOpenEditUserModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Editar Revendedor</DialogTitle>
                <DialogContent dividers>
                    {editUserError && <Typography color="error" sx={{ mb: 2 }}>{editUserError}</Typography>}
                    <TextField
                        fullWidth
                        label="Nome Completo"
                        value={selectedUser?.fullname || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, fullname: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={selectedUser?.email || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Senha"
                        type="password"
                        value={selectedUser?.password || ''}
                        onChange={(e) => setSelectedUser({ ...selectedUser, password: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditUserModal(false)} color="secondary">
                        Cancelar
                    </Button>
                    <Button onClick={handleUpdateUser} color="primary" variant="contained">
                        Atualizar
                    </Button>
                </DialogActions>
            </Dialog>


            <DeliveriesModal
                open={openDeliveriesModal}
                onClose={closeDeliveriesModal}
                selectedSeller={selectedDeliverySeller}
            />
        </Box>
    );
};

export default Users;
