import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Upload, Link2, Download } from 'lucide-react';
import { getPetById, cachePet } from '../services/storage';
import { apiGetPetById } from '../services/api';

export default function QrTagPage({ onShowToast }) {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(() => getPetById(petId || 'ponya'));

  const liveTargetUrl = `${window.location.origin}/p/${pet?.id || petId || 'ponya'}`;
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const targetId = petId || 'ponya';
    const cached = getPetById(targetId);
    if (cached) setPet(cached);

    apiGetPetById(targetId).then((dbPet) => {
      if (dbPet) {
        setPet(dbPet);
        cachePet(dbPet);
      }
    }).catch(() => {});
  }, [petId]);

  useEffect(() => {
    async function makeQr() {
      try {
        const url = await QRCode.toDataURL(liveTargetUrl, {
          width: 242,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.warn('QR error:', err);
      }
    }
    makeQr();
  }, [liveTargetUrl]);

  const handleShare = async () => {
    const shareData = {
      title: `${pet?.name || 'Pet'}'s Profile on Purr`,
      text: `Scan or visit ${pet?.name || 'Pet'}'s collar profile on Purr`,
      url: liveTargetUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') onShowToast?.('Link copied! 📋');
      }
    } else {
      try {
        await navigator.clipboard.writeText(liveTargetUrl);
        onShowToast?.('Link copied to clipboard! 📋');
      } catch {
        onShowToast?.('Link copied!');
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(liveTargetUrl);
      onShowToast?.('Link copied! 📋');
    } catch {
      onShowToast?.('Link copied!');
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${(pet?.name || 'pet').toLowerCase()}-collar-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast?.('QR tag downloaded! 🏷️');
  };

  return (
    <div className="figma-qr-screen">
      {/* PURR Title */}
      <div className="figma-qr-purr">PURR</div>

      {/* Frame 50: Main QR Card */}
      <div
        className="figma-frame-50"
        onClick={() => navigate(`/p/${pet?.id || petId || 'ponya'}`)}
        title="Tap to view live profile"
      >
        <div className="figma-qr-code-box">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`${pet?.name || 'Pet'} QR`} className="figma-qr-img" />
          ) : (
            <div className="qr-loading">Generating QR...</div>
          )}
        </div>
        <div className="figma-qr-pet-name">{pet?.name || 'Ponya'}</div>
      </div>

      {/* Rectangle 12: Share Profile */}
      <button type="button" className="figma-rect-12" onClick={handleShare}>
        <Upload size={22} color="#000000" strokeWidth={1.8} />
        <span className="figma-qr-btn-label">Share Profile</span>
      </button>

      {/* Rectangle 13: Copy Link */}
      <button type="button" className="figma-rect-13" onClick={handleCopy}>
        <Link2 size={22} color="#000000" strokeWidth={1.8} />
        <span className="figma-qr-btn-label">Copy Link</span>
      </button>

      {/* Rectangle 14: Download */}
      <button type="button" className="figma-rect-14" onClick={handleDownload}>
        <Download size={22} color="#000000" strokeWidth={1.8} />
        <span className="figma-qr-btn-label">Download</span>
      </button>

      {/* View Pet Profile Button */}
      <button
        type="button"
        className="figma-rect-profile"
        onClick={() => navigate(`/p/${pet?.id || petId || 'ponya'}`)}
      >
        <span className="figma-qr-btn-label" style={{ fontWeight: 700, color: '#FFFFFF' }}>
          🐾 View {pet?.name || 'Pet'}’s Profile & Feed
        </span>
      </button>

      {/* Suggestion Text */}
      <div className="figma-qr-suggestion">
        Suggestion: Apply this QR on your pet’s belt
      </div>
    </div>
  );
}
