import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Paper } from '@mui/material';
import api from '../services/api';

const Register = () => {
    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleRegister = async () => {
        try {
            await api.post('/functions/signup', {
                fullname,
                email,
                password,
            });
            setSuccess('Cadastro realizado com sucesso! Agora você pode fazer login.');
            setFullname('');
            setEmail('');
            setPassword('');
            setError('');
        } catch (err) {
            setError('Erro ao cadastrar. Por favor, verifique os dados e tente novamente.');
            setSuccess('');
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f5f5f5',
                padding: '16px',
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    padding: 3,
                    width: { xs: '100%', sm: '400px' },
                    textAlign: 'center',
                }}
            >
                <Typography variant="h5" component="h1" gutterBottom>
                    Cadastro
                </Typography>
                {error && (
                    <Typography variant="body2" color="error" gutterBottom>
                        {error}
                    </Typography>
                )}
                {success && (
                    <Typography variant="body2" color="success.main" gutterBottom>
                        {success}
                    </Typography>
                )}
                <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
                    <TextField
                        label="Nome Completo"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                    />
                    <TextField
                        label="Email"
                        type="email"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        label="Senha"
                        type="password"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={handleRegister}
                    >
                        Registrar
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default Register;
