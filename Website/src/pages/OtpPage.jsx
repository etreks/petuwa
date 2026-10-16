import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiVerifyOtp, apiSendOtp } from '../services/api';
import { setCurrentUser, getPets } from '../services/storage';

export default function OtpPage({ onShowToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const phoneNumber = location.state?.phoneNumber || '8765444444';

  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOtpChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(digits);
  };

  const handleResend = async () => {
    const res = await apiSendOtp(phoneNumber);
    if (res.demoOtp) {
      onShowToast?.(`Code resent: ${res.demoOtp}`);
    } else {
      onShowToast?.('New 6-digit code sent via SMS');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      onShowToast?.('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiVerifyOtp(phoneNumber, otpCode);
      setIsLoading(false);

      if (res.success) {
        setCurrentUser({
          phone: `+91 ${phoneNumber}`,
          token: res.token,
          verified: true,
          loggedAt: new Date().toISOString()
        });

        const existing = getPets();
        if (existing.length > 0) {
          navigate(`/p/${existing[0].id}`);
        } else {
          navigate('/register');
        }
      } else {
        onShowToast?.(res.error || 'Invalid OTP code');
      }
    } catch {
      setIsLoading(false);
      navigate('/register');
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
          {/* Enter OTP */}
          <label className="figma-phone-label" htmlFor="otp-input">Enter OTP</label>

          {/* Frame 28 - input */}
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            className="figma-frame-28"
            placeholder="6 Digit Verification Code"
            value={otpCode}
            onChange={handleOtpChange}
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

        {/* Group 28 - Did’t receive a code? Resent Code */}
        <div className="figma-otp-footer">
          <span>Did’t receive a code?</span>
          <button
            type="button"
            className="figma-otp-resend-btn"
            onClick={handleResend}
          >
            Resent Code
          </button>
        </div>
      </div>
    </div>
  );
}
