import React, { useState, useEffect } from 'react';
import { X, MapPin, Send, Link as LinkIcon, RefreshCw, Check } from 'lucide-react';

export default function WhatsAppShareModal({ pet, onClose, onShowToast }) {
  const [coords, setCoords] = useState(pet?.homeCoordinates || { lat: 30.1934934, lng: 78.1607284 });
  const [addressText, setAddressText] = useState('Capturing GPS location...');
  const [isLocating, setIsLocating] = useState(false);
  const [copied, setCopied] = useState(false);

  const captureLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          setAddressText(`Pin: ${lat.toFixed(6)}, ${lng.toFixed(6)} (Accuracy: ~${Math.round(pos.coords.accuracy)}m)`);
          setIsLocating(false);
          onShowToast?.('Live GPS coordinates captured! 📍');
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setCoords(pet?.homeCoordinates || { lat: 30.1934934, lng: 78.1607284 });
          setAddressText('Near Shantikunj, Haridwar (Nearby Landmark)');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setAddressText('Near Shantikunj, Haridwar');
      setIsLocating(false);
    }
  };

  useEffect(() => {
    captureLocation();
  }, []);

  const rawPhone = (pet?.ownerPhone || '8765444444').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const mapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  const messageText = `Hurray! I find your Pet, buddy! 💪\nHere's my location:\n${mapsLink}`;

  const handleLaunchWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
    onShowToast?.('Opening WhatsApp with prefilled location pin... 💬');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      onShowToast?.('Location message copied! 📋');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast?.('Copied to clipboard!');
    }
  };

  return (
    <div className="post-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="emergency-modal">
        <div className="emergency-modal-header">
          <div className="modal-title-with-icon">
            <span className="wa-icon-badge">💬</span>
            <div>
              <h3 className="emergency-modal-title">Share Live Location</h3>
              <p className="emergency-modal-sub">Direct WhatsApp to {pet?.ownerName || "Owner"}</p>
            </div>
          </div>
          <button className="emergency-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="whatsapp-preview-card">
          {/* Map Pin Header */}
          <div className="map-pin-header">
            <MapPin size={22} color="#EF4444" className="pin-bounce" />
            <div className="pin-coordinates-box">
              <span className="coord-title">Finder GPS Coordinates</span>
              <strong className="coord-val">
                {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E
              </strong>
              <span className="coord-address">{addressText}</span>
            </div>
          </div>

          {/* WhatsApp Chat Preview matching Slide 14 */}
          <div className="whatsapp-bubble-preview">
            <div className="bubble-sender">{pet?.ownerName || 'Owner'} (You) • {pet?.ownerPhone || '+91 8765444444'}</div>
            <div className="bubble-body">
              <p className="bubble-text">Hurray! I find your Pet, buddy! 💪</p>
              <p className="bubble-text">Here's my location:</p>
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="bubble-maps-link"
              >
                {mapsLink}
              </a>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button type="button" className="whatsapp-launch-btn" onClick={handleLaunchWhatsApp}>
          <Send size={18} />
          <span>Open WhatsApp & Send Location</span>
        </button>

        <div className="secondary-location-actions">
          <button type="button" className="sec-action-btn" onClick={handleCopyLink}>
            {copied ? <Check size={14} color="#10B981" /> : <LinkIcon size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Pin Text'}</span>
          </button>

          <button
            type="button"
            className="sec-action-btn"
            onClick={captureLocation}
            disabled={isLocating}
          >
            <RefreshCw size={14} className={isLocating ? 'spin-icon' : ''} />
            <span>{isLocating ? 'Locating...' : 'Refresh GPS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
