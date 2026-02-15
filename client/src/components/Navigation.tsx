import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleHomeClick = (sectionId?: string) => {
    navigate('/');
    setIsMenuOpen(false);
    if (sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* Desktop Menu */}
        <ul className="nav-menu desktop-menu">
          <li>
            <button onClick={() => handleHomeClick()}>
              Cerimônia e Festa
            </button>
          </li>
          <li>
            <button onClick={() => handleHomeClick('hotels')}>
              Hotéis
            </button>
          </li>
          <li>
            <button onClick={() => handleHomeClick('transport')}>
              Transporte
            </button>
          </li>
          <li>
            <Link to="/attending-form" onClick={closeMenu}>
              Confirme sua Presença
            </Link>
          </li>
          <li>
            <Link to="/gifts" onClick={closeMenu}>
              Lista de Presentes
            </Link>
          </li>
          {isAuthenticated && (
            <>
              <li>
                <Link to="/admin/attending-list" onClick={closeMenu}>
                  Lista de Convidados
                </Link>
              </li>
              <li>
                <Link to="/admin/gifts" onClick={closeMenu}>
                  Gerenciar Presentes
                </Link>
              </li>
            </>
          )}
          {!isAuthenticated && (
            <li>
              <Link to="/admin/login" onClick={closeMenu}>
                Login
              </Link>
            </li>
          )}
        </ul>

        {/* Mobile Hamburger Button */}
        <button 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu */}
      <ul className={`nav-menu mobile-menu ${isMenuOpen ? 'active' : ''}`}>
        <li>
          <button onClick={() => handleHomeClick()}>
            Cerimônia e Festa
          </button>
        </li>
        <li>
          <button onClick={() => handleHomeClick('hotels')}>
            Hotéis
          </button>
        </li>
        <li>
          <button onClick={() => handleHomeClick('transport')}>
            Transporte
          </button>
        </li>
        <li>
          <Link to="/attending-form" onClick={closeMenu}>
            Confirme sua Presença
          </Link>
        </li>
        <li>
          <Link to="/gifts" onClick={closeMenu}>
            Lista de Presentes
          </Link>
        </li>
        {isAuthenticated && (
          <>
            <li>
              <Link to="/admin/attending-list" onClick={closeMenu}>
                Lista de Convidados
              </Link>
            </li>
            <li>
              <Link to="/admin/gifts" onClick={closeMenu}>
                Gerenciar Presentes
              </Link>
            </li>
          </>
        )}
        {!isAuthenticated && (
          <li>
            <Link to="/admin/login" onClick={closeMenu}>
              Login
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navigation;
