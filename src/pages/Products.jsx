import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import { Edit, Delete, Assignment } from '@mui/icons-material';
import api from '../services/api';
import Header from '../components/Header';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newProduct, setNewProduct] = useState({ name: '', stock: '', price: '' });
    const [editingProduct, setEditingProduct] = useState(null);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [assignProduct, setAssignProduct] = useState({ resellerId: '', quantity: '' });
    const [resellers, setResellers] = useState([]);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const getSessionToken = () => localStorage.getItem('sessionToken');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.post("/functions/list-active-products", {}, {
                    headers: {
                        "X-Parse-Session-Token": localStorage.getItem("sessionToken"),
                    },
                });

                if (Array.isArray(response.data.result)) {
                    setProducts(response.data.result);
                } else {
                    console.error('A resposta não contém um array dentro de "result".');
                    setProducts([]);
                }
            } catch (err) {
                console.error("Erro ao buscar produtos ativos:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchResellers = async () => {
            const sessionToken = localStorage.getItem("sessionToken");
            if (!sessionToken) {
                console.error('Usuário não autenticado.');
                return;
            }

            try {
                const response = await api.post('/functions/list-resellers', {}, {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                });

                if (Array.isArray(response.data.result)) {
                    // Filtrar apenas revendedores que não estão deletados
                    const activeResellers = response.data.result.filter(reseller => !reseller.isDeleted);
                    setResellers(activeResellers);
                }
            } catch (error) {
                console.error('Erro ao carregar revendedores:', error);
            }
        };


        fetchProducts();
        fetchResellers();
    }, []);


    const handleAddProduct = async () => {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
            alert('Você precisa estar logado para adicionar um produto!');
            return;
        }

        try {
            if (!newProduct.name || !newProduct.stock || !newProduct.price) {
                alert('Preencha todos os campos!');
                return;
            }

            const response = await api.post('/functions/add-product', {
                productName: newProduct.name,
                stock: parseInt(newProduct.stock, 10),
                price: parseFloat(newProduct.price),
            }, {
                headers: {
                    'X-Parse-Session-Token': sessionToken,
                },
            });

            setProducts((prev) => [...prev, response.data.result]);
            setNewProduct({ name: '', stock: '', price: '' });
            alert('Produto adicionado com sucesso!');
        } catch (error) {
            console.error('Erro ao adicionar produto:', error);
            alert('Erro ao adicionar produto!');
        }
    };

    const handleUpdateProduct = async () => {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
            alert('Você precisa estar logado para editar um produto!');
            return;
        }

        try {
            const response = await api.post('/functions/update-product', {
                productId: editingProduct.objectId,
                productName: editingProduct.productName,
                stock: parseInt(editingProduct.stock, 10),
                price: parseFloat(editingProduct.price),
            }, {
                headers: {
                    'X-Parse-Session-Token': sessionToken,
                },
            });

            setProducts((prev) =>
                prev.map((product) =>
                    product.objectId === response.data.result.objectId
                        ? response.data.result
                        : product
                )
            );
            setOpenEditModal(false);
            alert('Produto atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao editar produto:', error);
            alert('Erro ao editar produto!');
        }
    };

    const handleDeleteProduct = async () => {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
            alert('Você precisa estar logado para excluir um produto!');
            return;
        }

        try {
            await api.post('/functions/soft-delete-product', { productId: productToDelete.objectId }, {
                headers: {
                    'X-Parse-Session-Token': sessionToken,
                },
            });

            setProducts((prev) => prev.filter((product) => product.objectId !== productToDelete.objectId));
            setOpenDeleteConfirm(false);
            alert('Produto excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            alert('Erro ao excluir produto!');
        }
    };

    const handleAssignProductToReseller = async () => {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
            alert('Você precisa estar logado para atribuir um produto!');
            return;
        }

        try {
            const { resellerId, quantity } = assignProduct;
            if (!resellerId || !quantity) {
                alert('Preencha todos os campos!');
                return;
            }

            await api.post('/functions/add-stock', {
                userId: resellerId,
                productId: editingProduct.objectId,
                stock: parseInt(quantity, 10),
            }, {
                headers: {
                    'X-Parse-Session-Token': sessionToken,
                },
            });

            setOpenAssignModal(false);
            alert('Produto atribuído ao revendedor com sucesso!');
        } catch (error) {
            console.error('Erro ao atribuir produto ao revendedor:', error);
            alert('Erro ao atribuir produto!');
        }
    };

    const handleOpenDeleteConfirm = (product) => {
        setProductToDelete(product);
        setOpenDeleteConfirm(true);
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
            <Header />
            <Box sx={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h4" sx={{ mb: 4 }}>
                    Gerenciar Produtos
                </Typography>

                <Box component="form" noValidate autoComplete="off" sx={{ display: 'flex', flexDirection: 'row', gap: '8px', mb: 4, maxWidth: '800px', width: '100%' }}>
                    <TextField
                        label="Nome do Produto"
                        fullWidth
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                    <TextField
                        label="Estoque"
                        type="number"
                        fullWidth
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    />
                    <TextField
                        label="Preço"
                        type="number"
                        fullWidth
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddProduct}
                    >
                        ADD
                    </Button>
                </Box>

                {loading ? (
                    <CircularProgress />
                ) : (
                    <TableContainer component={Paper} sx={{ maxWidth: '800px', width: '100%' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell align="left" sx={{ fontWeight: 'bold' }}>Nome do Produto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estoque</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Preço</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.objectId}>
                                        <TableCell align="left">{product.productName}</TableCell>
                                        <TableCell align="center">{product.stock}</TableCell>
                                        <TableCell align="center">R${product.price.toFixed(2)}</TableCell>
                                        <TableCell align="center">
                                            <IconButton color="primary" onClick={() => {
                                                setEditingProduct(product);
                                                setOpenEditModal(true);
                                            }}>
                                                <Edit />
                                            </IconButton>
                                            <IconButton color="primary" onClick={() => {
                                                setEditingProduct(product);
                                                setOpenAssignModal(true);
                                            }}>
                                                <Assignment />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => handleOpenDeleteConfirm(product)}>
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)}>
                    <DialogTitle>Editar Produto</DialogTitle>
                    <DialogContent>
                        <TextField
                            label="Nome do Produto"
                            fullWidth
                            margin="normal"
                            value={editingProduct?.productName || ''}
                            onChange={(e) =>
                                setEditingProduct({ ...editingProduct, productName: e.target.value })
                            }
                        />
                        <TextField
                            label="Estoque"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={editingProduct?.stock || ''}
                            onChange={(e) =>
                                setEditingProduct({ ...editingProduct, stock: e.target.value })
                            }
                        />
                        <TextField
                            label="Preço"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={editingProduct?.price || ''}
                            onChange={(e) =>
                                setEditingProduct({ ...editingProduct, price: e.target.value })
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenEditModal(false)} color="secondary">
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdateProduct} color="primary">
                            Salvar
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openAssignModal} onClose={() => setOpenAssignModal(false)}>
                    <DialogTitle>Atribuir Produto ao Revendedor</DialogTitle>
                    <DialogContent>
                        {/* Informações do produto selecionado */}
                        <Typography variant="subtitle1" gutterBottom>
                            Produto: <strong>{editingProduct?.productName}</strong>
                            <br />
                            Em estoque: <strong>{editingProduct?.stock}</strong>
                        </Typography>

                        {/* Campo de seleção de revendedor */}
                        <TextField
                            label="Revendedor"
                            select
                            fullWidth
                            margin="normal"
                            value={assignProduct.resellerId}
                            onChange={(e) => setAssignProduct({ ...assignProduct, resellerId: e.target.value })}
                            error={!assignProduct.resellerId}
                            helperText={!assignProduct.resellerId ? 'Por favor, selecione um revendedor.' : ''}
                        >
                            {resellers.map((reseller) => (
                                <MenuItem key={reseller.objectId} value={reseller.objectId}>
                                    {reseller.fullname}
                                </MenuItem>
                            ))}
                        </TextField>




                        {/* Campo de quantidade */}
                        <TextField
                            label="Quantidade"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={assignProduct.quantity}
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);

                                // Validação para impedir negativos e limitar ao estoque disponível
                                if (!isNaN(value)) {
                                    if (value >= 0 && value <= editingProduct?.stock) {
                                        setAssignProduct({ ...assignProduct, quantity: value });
                                    } else if (value > editingProduct?.stock) {
                                        setAssignProduct({ ...assignProduct, quantity: editingProduct?.stock });
                                    }
                                } else {
                                    setAssignProduct({ ...assignProduct, quantity: '' });
                                }
                            }}
                            error={
                                assignProduct.quantity !== '' &&
                                (assignProduct.quantity < 0 || assignProduct.quantity > editingProduct?.stock)
                            }
                            helperText={
                                assignProduct.quantity !== '' && assignProduct.quantity > editingProduct?.stock
                                    ? `A quantidade não pode exceder o estoque disponível (${editingProduct?.stock}).`
                                    : assignProduct.quantity !== '' && assignProduct.quantity < 0
                                        ? 'A quantidade não pode ser negativa.'
                                        : ''
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAssignModal(false)} color="secondary">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAssignProductToReseller}
                            color="primary"
                            disabled={
                                !assignProduct.resellerId ||
                                !assignProduct.quantity ||
                                assignProduct.quantity <= 0 ||
                                assignProduct.quantity > editingProduct?.stock
                            }
                        >
                            Atribuir
                        </Button>
                    </DialogActions>
                </Dialog>



                <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogContent>
                        Tem certeza que deseja excluir o produto <strong>{productToDelete?.productName}</strong>?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteConfirm(false)} color="secondary">
                            Cancelar
                        </Button>
                        <Button onClick={handleDeleteProduct} color="error">
                            Excluir
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Box>
    );
};

export default Products;
