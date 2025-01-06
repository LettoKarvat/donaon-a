import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    Typography,
    CircularProgress,
    Button,
    Box,
    TextField,
    DialogActions,
} from '@mui/material';
import api from '../services/api';

const DeliveriesModal = ({ open, onClose, selectedSeller }) => {
    const [deliveries, setDeliveries] = useState({});
    const [loading, setLoading] = useState(false);
    const [editingDelivery, setEditingDelivery] = useState(null); // Estado para o item em edição
    const [editedQuantity, setEditedQuantity] = useState(0); // Nova quantidade para edição

    const fetchDeliveries = async () => {
        console.log('oi')
        if (!selectedSeller) return;
        console.log('oi')
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            alert('Você precisa estar logado!');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(
                '/functions/get-deliveries-report',
                { resellerId: selectedSeller.sellerId },
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            setDeliveries(response.data.result.products || {});
            setLoading(false);
        } catch (err) {
            console.error('Erro ao carregar entregas:', err.response ? err.response.data : err.message);
            alert('Erro ao carregar entregas!');
            setLoading(false);
        }
    };

    const handleDeleteDelivery = async (deliveryId) => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            alert('Você precisa estar logado!');
            return;
        }

        try {
            await api.post(
                '/functions/delete-delivery',
                { deliveryId },
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            alert('Entrega excluída com sucesso!');
            fetchDeliveries(); // Atualiza a lista de entregas
        } catch (err) {
            console.error('Erro ao excluir entrega:', err.response ? err.response.data : err.message);
            alert('Erro ao excluir entrega!');
        }
    };

    const handleEditDelivery = async () => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken || !editingDelivery) {
            alert('Você precisa estar logado!');
            return;
        }

        try {
            await api.post(
                '/functions/edit-delivery',
                {
                    deliveryId: editingDelivery.id,
                    newQuantity: editedQuantity,
                },
                {
                    headers: {
                        'X-Parse-Session-Token': sessionToken,
                    },
                }
            );
            alert('Entrega editada com sucesso!');
            setEditingDelivery(null); // Fecha o modal de edição
            fetchDeliveries(); // Atualiza a lista de entregas
        } catch (err) {
            console.error('Erro ao editar entrega:', err.response ? err.response.data : err.message);
            alert('Erro ao editar entrega!');
        }
    };

    useEffect(() => {
        if (open && selectedSeller) {
            fetchDeliveries();
        }
    }, [open, selectedSeller]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                Entregas de {selectedSeller?.sellerName || 'Revendedor'}
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <CircularProgress />
                ) : Object.keys(deliveries).length > 0 ? (
                    <List>
                        {Object.entries(deliveries).map(([productName, details]) => (
                            <ListItem key={productName} sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {details.productName}
                                    </Typography>
                                </Box>

                                {details.deliveryDetails.map((delivery, index) => (
                                    <Box
                                        key={delivery.id}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            width: '100%',
                                            mt: 1,
                                        }}
                                    >
                                        <Typography variant="body2">
                                            Quantidade: {delivery.quantity}, Data: {new Date(delivery.date.iso).toLocaleDateString('pt-BR')}
                                        </Typography>
                                        <Box>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                onClick={() => {
                                                    setEditingDelivery({
                                                        id: delivery.id, // Passa o ID correto da entrega
                                                        productName: details.productName,
                                                    });
                                                    setEditedQuantity(delivery.quantity);
                                                }}
                                                sx={{ mr: 1 }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleDeleteDelivery(delivery.id)} // Passa o ID correto da entrega
                                            >
                                                Excluir
                                            </Button>
                                        </Box>
                                    </Box>
                                ))}
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography>Este revendedor não possui registros de entregas.</Typography>
                )}
            </DialogContent>

            {/* Modal de edição */}
            {editingDelivery && (
                <Dialog open={!!editingDelivery} onClose={() => setEditingDelivery(null)} fullWidth maxWidth="sm">
                    <DialogTitle>
                        Editar entrega de {editingDelivery.productName}
                    </DialogTitle>
                    <br />
                    <DialogContent>
                        <TextField
                            label="Nova Quantidade"
                            type="number"
                            fullWidth
                            value={editedQuantity}
                            onChange={(e) => setEditedQuantity(parseInt(e.target.value, 10) || 0)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditingDelivery(null)} color="secondary">
                            Cancelar
                        </Button>
                        <Button onClick={handleEditDelivery} color="primary">
                            Salvar
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Dialog>
    );
};

export default DeliveriesModal;
