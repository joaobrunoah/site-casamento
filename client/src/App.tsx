import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { CartProvider } from './contexts/CartContext';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import AttendingForm from './pages/AttendingForm';
import Gifts from './pages/Gifts';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import AdminLogin from './pages/AdminLogin';
import AdminAttendingList from './pages/AdminAttendingList';
import AdminGifts from './pages/AdminGifts';
import './App.css';

function App(): JSX.Element {
  return (
    <AuthProvider>
      <ConfigProvider>
        <CartProvider>
          <Router>
            <div className="App">
              <Navigation />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/attending-form" element={<AttendingForm />} />
                  <Route path="/gifts" element={<Gifts />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/success" element={<PaymentSuccess />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/attending-list" element={<AdminAttendingList />} />
                  <Route path="/admin/gifts" element={<AdminGifts />} />
                </Routes>
              </main>
            </div>
          </Router>
        </CartProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
