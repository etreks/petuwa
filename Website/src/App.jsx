import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { initStorage, getAllPets } from './services/storage';
import PhoneChassis from './components/PhoneChassis';
import SplashPage from './pages/SplashPage';
import LoginPage from './pages/LoginPage';
import OtpPage from './pages/OtpPage';
import RegisterPetPage from './pages/RegisterPetPage';
import QrTagPage from './pages/QrTagPage';
import PetProfilePage from './pages/PetProfilePage';
import './index.css';

// Toast Notification Sub-component
function Toast({ message }) {
  if (!message) return null;
  return <div className="toast-msg">{message}</div>;
}

// Global Nav & Route Switcher for Presentation & Testing
function AppRoutes({ onShowToast }) {
  const location = useLocation();

  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage onShowToast={onShowToast} />} />
      <Route path="/otp" element={<OtpPage onShowToast={onShowToast} />} />
      <Route path="/register" element={<RegisterPetPage onShowToast={onShowToast} />} />
      <Route path="/qr/:petId" element={<QrTagPage onShowToast={onShowToast} />} />
      <Route path="/p/:petId" element={<PetProfilePage onShowToast={onShowToast} />} />
      {/* Fallback for legacy query param '?pet=xxx' or unknown routes */}
      <Route path="*" element={<Navigate to="/p/ponya" replace />} />
    </Routes>
  );
}

// Global Deployable Shell
export default function App() {
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    initStorage();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <Router>
      <PhoneChassis>
        <Toast message={toastMessage} />
        <AppRoutes onShowToast={showToast} />
      </PhoneChassis>
    </Router>
  );
}
