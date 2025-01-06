import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography } from '@mui/material';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault(); // Evita o comportamento padrão do submit do formulário
        try {
            const response = await api.post('/functions/login', {
                email,
                password,
            });

            if (response.data.result && response.data.result.user) {
                const { token, role, fullname } = response.data.result.user;
                localStorage.setItem('sessionToken', token);
                localStorage.setItem('role', role);
                localStorage.setItem('fullname', fullname);

                // Redireciona para o dashboard adequado
                window.location.href = role === 'admin' ? '/admin-dashboard' : '/dashboard';
            } else {
                throw new Error('Login falhou. Verifique suas credenciais.');
            }
        } catch (err) {
            console.error(err);
            setError('Credenciais inválidas. Por favor, tente novamente.');
        }
    };

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#FFC0CB', // Fundo rosa claro
                padding: '16px',
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    padding: '32px',
                    maxWidth: '400px',
                    width: '100%',
                    borderRadius: '12px', // Bordas arredondadas
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF', // Fundo branco do formulário
                }}
            >
                <Typography
                    align="center"
                    gutterBottom
                    sx={{
                        fontFamily: "'Dancing Script', cursive",
                        fontWeight: 'bold',
                        color: '#FF1493',
                        fontSize: '2.5rem',
                    }}
                >
                    Dona Onça Gestão
                </Typography>
                <Typography
                    align="center"
                    sx={{
                        fontFamily: "'Dancing Script', cursive",
                        fontWeight: 'bold',
                        color: '#87CEFA',
                        fontSize: '1.8rem',
                        marginTop: '-12px',
                    }}
                >
                    Revendas
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Faça login para continuar
                </Typography>
                {error && (
                    <Typography variant="body2" color="error" gutterBottom>
                        {error}
                    </Typography>
                )}
                {/* Formulário que permite o submit com Enter */}
                <form onSubmit={handleLogin}>
                    <TextField
                        fullWidth
                        label="Email"
                        variant="outlined"
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                            },
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Senha"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                            },
                        }}
                    />
                    <Button
                        type="submit" // Define o botão como tipo submit para funcionar com Enter
                        fullWidth
                        variant="contained"
                        sx={{
                            mt: 3,
                            py: 1.5,
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            backgroundColor: '#FF69B4', // Cor rosa do botão
                            '&:hover': {
                                backgroundColor: '#FF1493', // Cor rosa mais escura ao passar o mouse
                            },
                        }}
                    >
                        Entrar
                    </Button>
                </form>
            </Paper>
        </Box>
    );
};

export default Login;
