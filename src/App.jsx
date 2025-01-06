import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './styles/theme';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CurrentStock from './pages/CurrentStock';
import SalesHistory from './pages/SalesHistory';
import NewSale from './pages/NewSale';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Users from './pages/Users'; // Importando o componente de gerenciar revendedores
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';
import ResellerDetails from './pages/ResellerDetails';

const App = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <Routes>
                    {/* Rota Pública */}
                    <Route path="/" element={<Login />} />

                    {/* Rota do Revendedor */}
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute element={<Dashboard />} allowedRoles={['revendedor']} />
                        }
                    />
                    <Route
                        path="/stock"
                        element={
                            <PrivateRoute element={<CurrentStock />} allowedRoles={['revendedor']} />
                        }
                    />
                    <Route
                        path="/sales-history"
                        element={
                            <PrivateRoute element={<SalesHistory />} allowedRoles={['revendedor']} />
                        }
                    />
                    <Route
                        path="/new-sale"
                        element={
                            <PrivateRoute element={<NewSale />} allowedRoles={['revendedor']} />
                        }
                    />

                    {/* Rota do Administrador */}
                    <Route
                        path="/admin-dashboard"
                        element={
                            <PrivateRoute element={<AdminDashboard />} allowedRoles={['admin']} />
                        }
                    />
                    <Route
                        path="/products"
                        element={<PrivateRoute element={<Products />} allowedRoles={['admin']} />}
                    />
                    <Route
                        path="/reports"
                        element={<PrivateRoute element={<Reports />} allowedRoles={['admin']} />}
                    />
                    <Route
                        path="/users" // Rota para gerenciar os revendedores
                        element={<PrivateRoute element={<Users />} allowedRoles={['admin']} />}
                    />
                    <Route path="/admin/reports/:resellerId" element={<ResellerDetails />} />


                    {/* Página de rota inexistente */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
};

export default App;
