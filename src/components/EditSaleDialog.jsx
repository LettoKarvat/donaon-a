import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import api from "../services/api";

const EditSaleDialog = ({ sale, onClose, onUpdate }) => {
    const [editMode, setEditMode] = useState("quantity"); // "quantity" ou "product"
    const [newQuantity, setNewQuantity] = useState(sale?.quantitySold || 0);
    const [selectedProduct, setSelectedProduct] = useState(sale?.product?.objectId || "");
    const [products, setProducts] = useState([]);

    // Carrega os produtos em estoque
    useEffect(() => {
        const fetchProductsInStock = async () => {
            try {
                const response = await api.post(
                    "/functions/get-current-stock",
                    {},
                    {
                        headers: {
                            "X-Parse-Session-Token": localStorage.getItem("sessionToken"),
                        },
                    }
                );
                setProducts(response.data.result);
            } catch (err) {
                console.error("Erro ao buscar produtos em estoque:", err);
                alert("Não foi possível carregar os produtos em estoque.");
            }
        };

        fetchProductsInStock();
    }, []);

    useEffect(() => {
        if (sale) {
            setNewQuantity(sale.quantitySold || 0);
            setSelectedProduct(sale?.product?.objectId || "");
        }
    }, [sale]);

    const handleUpdate = async () => {
        if (!sale?.objectId) {
            alert("Erro: ID da venda não encontrado.");
            return;
        }

        try {
            if (editMode === "quantity") {
                const response = await api.post(
                    "/functions/update-sale",
                    { saleId: sale.objectId, newQuantitySold: newQuantity },
                    {
                        headers: {
                            "X-Parse-Session-Token": localStorage.getItem("sessionToken"),
                        },
                    }
                );
                onUpdate(response.data.result);
            } else if (editMode === "product") {
                if (!selectedProduct) {
                    alert("Por favor, selecione um produto válido.");
                    return;
                }

                const response = await api.post(
                    "/functions/change-sale-product",
                    { saleId: sale.objectId, newProductId: selectedProduct },
                    {
                        headers: {
                            "X-Parse-Session-Token": localStorage.getItem("sessionToken"),
                        },
                    }
                );
                onUpdate(response.data.result);
            }
            onClose();
        } catch (err) {
            console.error("Erro ao atualizar a venda:", err);
            alert("Não foi possível atualizar a venda.");
        }
    };

    return (
        <Dialog open={!!sale} onClose={onClose}>
            <DialogTitle>Editar Venda</DialogTitle>
            <DialogContent>
                {/* Seletor de Modo de Edição */}
                <br />
                <FormControl fullWidth sx={{ marginBottom: 2 }}>

                    <InputLabel id="edit-mode-label">Editar</InputLabel>
                    <Select
                        labelId="edit-mode-label"
                        label="Editar" // Adiciona a prop `label`
                        value={editMode}
                        onChange={(e) => setEditMode(e.target.value)}
                    >
                        <MenuItem value="quantity">Alterar Quantidade</MenuItem>
                        <MenuItem value="product">Alterar Produto</MenuItem>
                    </Select>
                </FormControl>

                {/* Campo para editar quantidade */}
                {editMode === "quantity" && (
                    <TextField
                        label="Nova Quantidade"
                        type="number"
                        fullWidth
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 0)}
                    />
                )}

                {/* Campo para alterar produto */}
                {editMode === "product" && (
                    <FormControl fullWidth>
                        <InputLabel id="product-select-label">Produto</InputLabel>
                        <Select
                            labelId="product-select-label"
                            label="Produto" // Adiciona a prop `label`
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                        >
                            {products.map((product) => (
                                <MenuItem key={product.productId} value={product.productId}>
                                    {product.productName} (Estoque: {product.quantity})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    Cancelar
                </Button>
                <Button onClick={handleUpdate} color="primary">
                    Salvar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditSaleDialog;
