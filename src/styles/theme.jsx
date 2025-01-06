import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2', // Azul
        },
        secondary: {
            main: '#9c27b0', // Roxo
        },
        error: {
            main: '#d32f2f', // Vermelho para erros
        },
        background: {
            default: '#ffffff', // Branco para o fundo principal
        },
    },
    typography: {
        fontFamily: 'Roboto, Arial, sans-serif',
    },
});

export default theme;
