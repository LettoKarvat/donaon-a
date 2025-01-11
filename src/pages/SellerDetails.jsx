import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    CircularProgress,
    Grid,
    List,
    ListItem,
    ListItemText,
    Divider,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { Save, CloudUpload, ArrowBack, Visibility, Delete, Edit } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const SellerDetails = () => {
    const { sellerId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [seller, setSeller] = useState(null);
    const [contact, setContact] = useState('');
    const [address, setAddress] = useState('');
    const [file, setFile] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [editingContractId, setEditingContractId] = useState(null); // ID do contrato em edição
    const [editedTitle, setEditedTitle] = useState(''); // Título editado do contrato

    useEffect(() => {
        const fetchSellerDetails = async () => {
            try {
                const detailsResponse = await api.post('/functions/get-seller-details', { sellerId });
                setSeller(detailsResponse.data.result);
                setContact(detailsResponse.data.result.contact || '');
                setAddress(detailsResponse.data.result.address || '');

                const contractsResponse = await api.post('/functions/get-seller-contracts', { sellerId });
                setContracts(contractsResponse.data.result || []);
            } catch (err) {
                console.error('Erro ao carregar detalhes do revendedor:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSellerDetails();
    }, [sellerId]);

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            await api.post('/functions/update-seller-details', { sellerId, contact, address });
            alert('Dados atualizados com sucesso!');
        } catch (err) {
            console.error('Erro ao atualizar os dados:', err);
            alert('Erro ao atualizar os dados.');
        } finally {
            setUpdating(false);
        }
    };

    const handleFileUpload = async () => {
        if (!file) {
            alert('Selecione um arquivo para enviar.');
            return;
        }

        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64File = reader.result.split(',')[1];
            try {
                await api.post('/functions/upload-seller-contract', {
                    sellerId,
                    title: 'Contrato de Revenda',
                    file: base64File,
                });
                alert('Contrato enviado com sucesso!');
                setFile(null);
                const response = await api.post('/functions/get-seller-contracts', { sellerId });
                setContracts(response.data.result || []);
            } catch (err) {
                console.error('Erro ao enviar o contrato:', err);
                alert('Erro ao enviar o contrato.');
            } finally {
                setUploading(false);
            }
        };

        reader.readAsDataURL(file);
    };

    const handleDeleteContract = async () => {
        if (!selectedContract) return;

        try {
            await api.post('/functions/delete-seller-contract', { contractId: selectedContract.id });
            alert('Contrato deletado com sucesso!');
            setContracts(contracts.filter((contract) => contract.id !== selectedContract.id));
            setOpenDeleteDialog(false);
            setSelectedContract(null);
        } catch (err) {
            console.error('Erro ao deletar contrato:', err);
            alert('Erro ao deletar contrato.');
        }
    };

    const confirmDeleteContract = (contract) => {
        setSelectedContract(contract);
        setOpenDeleteDialog(true);
    };

    const handleEditTitle = (contractId, currentTitle) => {
        setEditingContractId(contractId); // Define o contrato em edição
        setEditedTitle(currentTitle); // Preenche o campo com o título atual
    };

    const handleSaveTitle = async (contractId) => {
        try {
            await api.post('/functions/update-seller-contract', {
                contractId,
                title: editedTitle,
            });
            alert('Título atualizado com sucesso!');

            // Atualiza a lista de contratos com o novo título
            setContracts((prevContracts) =>
                prevContracts.map((contract) =>
                    contract.id === contractId ? { ...contract, title: editedTitle } : contract
                )
            );

            setEditingContractId(null); // Finaliza o modo de edição
        } catch (err) {
            console.error('Erro ao atualizar o título do contrato:', err);
            alert('Erro ao atualizar o título do contrato.');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                background: 'linear-gradient(180deg, #e3f2fd, #ffffff)',
            }}
        >
            <Typography
                variant="h4"
                sx={{ fontWeight: 'bold', color: '#1976d2', mb: 2, textAlign: 'center' }}
            >
                Detalhes do Revendedor
            </Typography>

            <Grid container spacing={2} sx={{ maxWidth: '600px', width: '100%' }}>
                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ padding: '16px' }}>
                        <TextField
                            label="Nome"
                            fullWidth
                            value={seller?.fullname || 'Sem nome'}
                            disabled
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="Contato"
                            fullWidth
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="Endereço"
                            fullWidth
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Save />}
                            onClick={handleUpdate}
                            disabled={updating}
                            fullWidth
                        >
                            {updating ? <CircularProgress size={20} /> : 'Atualizar Dados'}
                        </Button>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ padding: '16px' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                            Upload de Contratos
                        </Typography>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setFile(e.target.files[0])}
                            style={{ marginBottom: '16px' }}
                        />
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<CloudUpload />}
                            onClick={handleFileUpload}
                            disabled={uploading}
                            fullWidth
                        >
                            {uploading ? <CircularProgress size={20} /> : 'Enviar Contrato'}
                        </Button>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ padding: '16px' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Contratos
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        {contracts.length === 0 ? (
                            <Typography>Este revendedor não possui contratos.</Typography>
                        ) : (
                            <List>
                                {contracts.map((contract) => (
                                    <ListItem
                                        key={contract.id}
                                        sx={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}
                                    >
                                        {editingContractId === contract.id ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                <TextField
                                                    fullWidth
                                                    value={editedTitle}
                                                    onChange={(e) => setEditedTitle(e.target.value)}
                                                />
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => handleSaveTitle(contract.id)}
                                                >
                                                    <Save />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <ListItemText
                                                primary={
                                                    <Box
                                                        component="a"
                                                        href={contract.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        sx={{
                                                            textDecoration: 'none',
                                                            color: '#1976d2',
                                                            fontWeight: 'bold',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                        }}
                                                    >
                                                        {contract.title || 'Sem título'}
                                                        <Visibility sx={{ fontSize: '20px', opacity: 0.7 }} />
                                                    </Box>
                                                }
                                            />
                                        )}
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleEditTitle(contract.id, contract.title)}
                                            >
                                                <Edit />
                                            </IconButton>
                                            <IconButton
                                                edge="end"
                                                color="error"
                                                onClick={() => confirmDeleteContract(contract)}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/users')}
                        fullWidth
                    >
                        Voltar
                    </Button>
                </Grid>
            </Grid>

            {/* Dialog de confirmação de exclusão */}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <Typography>
                        Tem certeza que deseja excluir o contrato "{selectedContract?.title}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)} color="secondary">
                        Cancelar
                    </Button>
                    <Button onClick={handleDeleteContract} color="error" variant="contained">
                        Excluir
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SellerDetails;
