import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1 className="noivos">João & Maria</h1>
          <p className="data-local">15 de Dezembro de 2024</p>
          <p className="local">Salão de Festas Jardim das Flores</p>
          <p className="cidade">São Paulo, SP</p>
        </div>
        <nav className="nav-menu">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
          >
            Início
          </Link>
          <Link 
            to="/hoteis" 
            className={location.pathname === '/hoteis' ? 'nav-link active' : 'nav-link'}
          >
            Hotéis
          </Link>
          <Link 
            to="/transporte" 
            className={location.pathname === '/transporte' ? 'nav-link active' : 'nav-link'}
          >
            Transporte
          </Link>
          <Link 
            to="/como-chegar" 
            className={location.pathname === '/como-chegar' ? 'nav-link active' : 'nav-link'}
          >
            Como Chegar
          </Link>
          <Link 
            to="/confirmar-presenca" 
            className={location.pathname === '/confirmar-presenca' ? 'nav-link active' : 'nav-link'}
          >
            Confirmar Presença
          </Link>
          <Link 
            to="/lista-presentes" 
            className={location.pathname === '/lista-presentes' ? 'nav-link active' : 'nav-link'}
          >
            Lista de Presentes
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
