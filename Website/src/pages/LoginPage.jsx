import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiSendOtp } from '../services/api';

export default function LoginPage({ onShowToast }) {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 10 && (digits.startsWith('91') || digits.startsWith('0'))) {
      digits = digits.slice(digits.startsWith('91') ? 2 : 1);
    }
    if (digits.length > 10) digits = digits.slice(0, 10);
    setPhoneNumber(digits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      onShowToast?.('Please enter your phone number');
      return;
    }
    if (phoneNumber.length < 10) {
      onShowToast?.('Please enter a valid 10-digit number');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiSendOtp(phoneNumber);
      setIsLoading(false);
      if (res.success) {
        onShowToast?.(res.demoOtp ? `OTP sent: ${res.demoOtp}` : 'OTP sent successfully');
        navigate('/otp', { state: { phoneNumber } });
      } else {
        onShowToast?.(res.error || 'Failed to send OTP');
      }
    } catch {
      setIsLoading(false);
      navigate('/otp', { state: { phoneNumber } });
    }
  };

  return (
    <div className="figma-login-screen">
      <div className="figma-frame-23">
        {/* PURR */}
        <div className="figma-purr-title">PURR</div>

        {/* Your Pet’s town */}
        <div className="figma-purr-subtitle">Your Pet’s town</div>

        <form onSubmit={handleSubmit}>
          {/* Phone no */}
          <label className="figma-phone-label" htmlFor="phone-input">Phone no</label>

          {/* Frame 28 - input */}
          <input
            id="phone-input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            className="figma-frame-28"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={handlePhoneChange}
            autoFocus
          />

          {/* Frame 24 - Continue Button */}
          <button
            type="submit"
            className="figma-frame-24"
            disabled={isLoading}
          >
            <span className="figma-continue-text">
              {isLoading ? '...' : 'Continue'}
            </span>
          </button>
        </form>

        {/* Rectangle 2 (Divider line left) */}
        <div className="figma-rect-2" />

        {/* or continue with: */}
        <div className="figma-or-continue">or continue with:</div>

        {/* Rectangle 1 (Divider line right) */}
        <div className="figma-rect-1" />

        {/* Already have an Account? */}
        <div className="figma-already-account">Already have an Account?</div>

        {/* Log in */}
        <button
          type="button"
          className="figma-login-link"
          onClick={() => onShowToast?.('Please enter your phone number to log in')}
        >
          Log in
        </button>
      </div>

      {/* Direct Social Links for Friends & First-Time Users */}
      <div style={{
        position: 'absolute',
        top: '675px',
        left: '27px',
        width: '347px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px'
      }}>
        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            background: '#FFFFFF',
            color: '#000000',
            border: 'none',
            borderRadius: '9999px',
            padding: '11px 22px',
            fontSize: '12.5px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.15s ease'
          }}
        >
          🐾 Register Your Pet Directly
        </button>

        <button
          type="button"
          onClick={() => navigate('/p/ponya')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.95)',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          Explore Town Pets as Guest →
        </button>
      </div>
    </div>
  );
}
