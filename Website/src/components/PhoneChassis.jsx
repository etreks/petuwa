import React, { useState, useEffect } from 'react';

export default function PhoneChassis({ children }) {
  const [currentTime, setCurrentTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let mins = now.getMinutes();
      mins = mins < 10 ? `0${mins}` : mins;
      setCurrentTime(`${hours}:${mins}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="viewport-container">
      <div className="phone-chassis">
        <div className="app-viewport">
          {/* iOS-Style Status Bar with Dynamic Island */}
          <div className="status-bar">
            <span className="status-time">{currentTime}</span>
            <div className="dynamic-island-notch" />
            <div className="status-icons">
              <span className="signal-bars">●●●●</span>
              <span className="wifi-icon">􀙇</span>
              <span className="battery-icon">100%</span>
            </div>
          </div>

          {/* Child View / Active Screen */}
          <div className="viewport-content-root">
            {children}
          </div>

          {/* Bottom Home Indicator Bar */}
          <div className="home-indicator-bar" />
        </div>
      </div>
    </div>
  );
}
