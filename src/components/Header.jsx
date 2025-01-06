import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogoff = () => {
        // Limpa o localStorage
        localStorage.clear();

        // Recarrega a página para redefinir o estado da aplicação
        window.location.reload();
    };

    const handleGoBack = () => {
        navigate(-1); // Retorna à página anterior
    };

    // Define se o botão "Voltar" deve ser exibido
    const shouldShowBackButton = !['/dashboard', '/admin-dashboard'].includes(location.pathname);

    return (
        <AppBar position="static" sx={{ backgroundColor: '#ffc0cb', color: '#000' }}>
            <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                {shouldShowBackButton && (
                    <Button color="inherit" onClick={handleGoBack} sx={{ fontSize: '1rem' }}>
                        Voltar
                    </Button>
                )}
                <Typography
                    variant="h5"
                    sx={{
                        fontFamily: "'Dancing Script', cursive", // Fonte delicada
                        fontWeight: 'bold',
                        color: '#fff',
                        textAlign: 'center',
                        flexGrow: 1,
                    }}
                >
                    Dona Onça
                </Typography>
                <Box>
                    <Button
                        color="inherit"
                        onClick={handleLogoff}
                        sx={{ fontSize: '1rem', textTransform: 'none' }}
                    >
                        Sair
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
