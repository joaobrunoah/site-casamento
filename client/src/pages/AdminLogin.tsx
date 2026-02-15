import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';
import app from '../firebase';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
  const [user, setUser] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      // Get the function URL
      const functionsInstance = getFunctions(app);
      const projectId = app.options.projectId || '';
      const region = 'us-central1'; // Default region
      
      // For emulator, use localhost
      const isEmulator = process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true';
      const finalUrl = isEmulator 
        ? `http://localhost:5001/${projectId}/${region}/login`
        : `https://${region}-${projectId}.cloudfunctions.net/login`;

      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user, password }),
      });

      const result = await response.json();
      
      if (result.success) {
        login();
        navigate('/');
      } else {
        setErro('Usuário ou senha incorretos');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setErro('Erro ao fazer login. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="user">Usuário</label>
          <input
            type="text"
            id="user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {erro && <div className="error-message">{erro}</div>}
        <button type="submit" disabled={carregando} className="login-button">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
