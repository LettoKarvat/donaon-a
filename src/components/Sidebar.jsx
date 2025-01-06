// Componente para o menu lateral
import React from 'react';

const Sidebar = () => {
    return (
        <div className="sidebar">
            <h2>Menu</h2>
            <ul>
                <li><a href="/dashboard">Dashboard</a></li>
                <li><a href="/products">Produtos</a></li>
                <li><a href="/stock">Estoque</a></li>
                <li><a href="/sales">Vendas</a></li>
                <li><a href="/reports">Relatórios</a></li>
            </ul>
        </div>
    );
};

export default Sidebar;
