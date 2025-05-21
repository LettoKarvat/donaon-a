// src/pages/Products.jsx
import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Button, TextField, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress, MenuItem
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
    Edit, Delete, Assignment, ArrowUpward, ArrowDownward
} from '@mui/icons-material';
import api from '../services/api';
import Header from '../components/Header';

const Products = () => {
    /* ───────── estados ───────── */
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    /* busca e ordenação */
    const [searchTerm, setSearchTerm] = useState('');
    const [currentSort, setCurrentSort] = useState('name'); // name | stock | price
    const [sortOrder, setSortOrder] = useState('asc');      // asc | desc

    const [newProduct, setNewProduct] = useState({ name: '', stock: '', price: '' });

    const [editingProduct, setEditingProduct] = useState(null);
    const [openEditModal, setOpenEditModal] = useState(false);

    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [assignProduct, setAssignProduct] = useState({ resellerId: '', quantity: '' });
    const [resellers, setResellers] = useState([]);

    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const tokenHeaders = () => ({
        headers: { 'X-Parse-Session-Token': localStorage.getItem('sessionToken') }
    });

    /* ───────── carga inicial ───────── */
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await api.post('/functions/list-active-products', {}, tokenHeaders());
                setProducts(Array.isArray(res.data.result) ? res.data.result : []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };

        const fetchResellers = async () => {
            try {
                const res = await api.post('/functions/list-resellers', {}, tokenHeaders());
                const actives = Array.isArray(res.data.result)
                    ? res.data.result.filter(r => !r.isDeleted)
                    : [];
                setResellers(actives);
            } catch (e) { console.error(e); }
        };

        fetchProducts();
        fetchResellers();
    }, []);

    /* ───────── utils de busca / ordenação ───────── */
    const filteredAndSorted = () => {
        const term = searchTerm.toLowerCase();
        return [...products]
            .filter(p => p.productName.toLowerCase().includes(term))
            .sort((a, b) => {
                const dir = sortOrder === 'asc' ? 1 : -1;
                if (currentSort === 'name')
                    return dir * a.productName.localeCompare(b.productName);
                if (currentSort === 'stock')
                    return dir * (a.stock - b.stock);
                return dir * (a.price - b.price); // price
            });
    };

    const toggleSort = field => {
        if (currentSort === field) {
            setSortOrder(p => (p === 'asc' ? 'desc' : 'asc'));
        } else {
            setCurrentSort(field);
            setSortOrder('asc');
        }
    };

    /* ───────── CRUD ───────── */
    const handleAddProduct = async () => {
        const { name, stock, price } = newProduct;
        if (!name || !stock || !price) { alert('Preencha todos os campos!'); return; }
        try {
            const res = await api.post('/functions/add-product',
                { productName: name, stock: +stock, price: +price }, tokenHeaders());
            setProducts(p => [...p, res.data.result]);
            setNewProduct({ name: '', stock: '', price: '' });
            alert('Produto adicionado!');
        } catch { alert('Erro ao adicionar produto'); }
    };

    const handleUpdateProduct = async () => {
        try {
            const res = await api.post('/functions/update-product',
                {
                    productId: editingProduct.objectId,
                    productName: editingProduct.productName,
                    stock: +editingProduct.stock,
                    price: +editingProduct.price
                }, tokenHeaders());
            setProducts(p =>
                p.map(prod => prod.objectId === res.data.result.objectId ? res.data.result : prod));
            setOpenEditModal(false);
        } catch { alert('Erro ao editar'); }
    };

    const handleDeleteProduct = async () => {
        try {
            await api.post('/functions/soft-delete-product',
                { productId: productToDelete.objectId }, tokenHeaders());
            setProducts(p => p.filter(prod => prod.objectId !== productToDelete.objectId));
            setOpenDeleteConfirm(false);
        } catch { alert('Erro ao excluir'); }
    };

    const handleAssignProductToReseller = async () => {
        const { resellerId, quantity } = assignProduct;
        if (!resellerId || !quantity) { alert('Preencha todos os campos!'); return; }
        try {
            await api.post('/functions/add-stock',
                { userId: resellerId, productId: editingProduct.objectId, stock: +quantity }, tokenHeaders());
            setOpenAssignModal(false);
            alert('Produto atribuído!');
        } catch { alert('Erro ao atribuir'); }
    };

    /* ───────── render ───────── */
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
            <Header />

            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mb: 4 }}>Gerenciar Produtos</Typography>

                {/* linha de cadastro + busca */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 900, mb: 4 }}>

                    {/* formulário de adição */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField label="Nome" fullWidth value={newProduct.name}
                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                        <TextField label="Estoque" type="number" fullWidth value={newProduct.stock}
                            onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} />
                        <TextField label="Preço" type="number" fullWidth value={newProduct.price}
                            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                        <Button variant="contained" onClick={handleAddProduct}>ADD</Button>
                    </Box>

                    {/* campo de busca */}
                    <TextField
                        label="Pesquisar produto"
                        fullWidth
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </Box>

                {loading ? <CircularProgress /> : (
                    <TableContainer component={Paper} sx={{ width: '100%', maxWidth: 900 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => toggleSort('name')}
                                    >
                                        Nome&nbsp;
                                        {currentSort === 'name' && (
                                            sortOrder === 'asc' ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => toggleSort('stock')}
                                    >
                                        Estoque&nbsp;
                                        {currentSort === 'stock' && (
                                            sortOrder === 'asc' ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        align="center"
                                        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                                        onClick={() => toggleSort('price')}
                                    >
                                        Preço&nbsp;
                                        {currentSort === 'price' && (
                                            sortOrder === 'asc' ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />
                                        )}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {filteredAndSorted().map(prod => (
                                    <TableRow key={prod.objectId}>
                                        <TableCell>{prod.productName}</TableCell>
                                        <TableCell align="center">{prod.stock}</TableCell>
                                        <TableCell align="center">R${prod.price.toFixed(2)}</TableCell>
                                        <TableCell align="center">
                                            <IconButton color="primary" onClick={() => { setEditingProduct(prod); setOpenEditModal(true); }}>
                                                <Edit />
                                            </IconButton>
                                            <IconButton color="primary" onClick={() => { setEditingProduct(prod); setOpenAssignModal(true); }}>
                                                <Assignment />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => { setProductToDelete(prod); setOpenDeleteConfirm(true); }}>
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* ───────── modal editar ───────── */}
                <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)}>
                    <DialogTitle>Editar Produto</DialogTitle>
                    <DialogContent>
                        <TextField label="Nome" fullWidth margin="normal"
                            value={editingProduct?.productName || ''}
                            onChange={e => setEditingProduct({ ...editingProduct, productName: e.target.value })} />
                        <TextField label="Estoque" type="number" fullWidth margin="normal"
                            value={editingProduct?.stock || ''}
                            onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })} />
                        <TextField label="Preço" type="number" fullWidth margin="normal"
                            value={editingProduct?.price || ''}
                            onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenEditModal(false)} color="secondary">Cancelar</Button>
                        <Button onClick={handleUpdateProduct} color="primary">Salvar</Button>
                    </DialogActions>
                </Dialog>

                {/* ───────── modal atribuir ───────── */}
                <Dialog open={openAssignModal} onClose={() => setOpenAssignModal(false)}>
                    <DialogTitle>Atribuir Produto ao Revendedor</DialogTitle>
                    <DialogContent sx={{ minWidth: 320 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2 }}>
                            Produto: <strong>{editingProduct?.productName}</strong><br />
                            Em estoque: <strong>{editingProduct?.stock}</strong>
                        </Typography>

                        {/* Autocomplete para revendedores */}
                        <Autocomplete
                            options={resellers.sort((a, b) => a.fullname.localeCompare(b.fullname))}
                            getOptionLabel={(opt) => opt.fullname}
                            isOptionEqualToValue={(opt, val) => opt.objectId === val.objectId}
                            value={resellers.find(r => r.objectId === assignProduct.resellerId) || null}
                            onChange={(_, newVal) =>
                                setAssignProduct({ ...assignProduct, resellerId: newVal ? newVal.objectId : '' })
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Revendedor" margin="normal" fullWidth />
                            )}
                        />

                        <TextField
                            label="Quantidade"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={assignProduct.quantity}
                            onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                setAssignProduct({ ...assignProduct, quantity: isNaN(v) ? '' : v });
                            }}
                            helperText={`Máx: ${editingProduct?.stock}`}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAssignModal(false)} color="secondary">Cancelar</Button>
                        <Button
                            onClick={handleAssignProductToReseller}
                            disabled={
                                !assignProduct.resellerId ||
                                !assignProduct.quantity ||
                                assignProduct.quantity <= 0 ||
                                assignProduct.quantity > editingProduct?.stock
                            }
                            color="primary">
                            Atribuir
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* ───────── modal excluir ───────── */}
                <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogContent>
                        Tem certeza que deseja excluir <strong>{productToDelete?.productName}</strong>?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteConfirm(false)} color="secondary">Cancelar</Button>
                        <Button onClick={handleDeleteProduct} color="error">Excluir</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Box>
    );
};

export default Products;
