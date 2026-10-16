import React, { useState, useEffect } from 'react';
import { X, Search, Phone, Navigation, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchNearbyVets } from '../services/overpass';

export default function NearbyVetsModal({ pet, onClose, onShowToast }) {
  const [vets, setVets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sourceNote, setSourceNote] = useState('');

  useEffect(() => {
    let active = true;
    async function loadVets() {
      setIsLoading(true);
      const lat = pet?.homeCoordinates?.lat || 30.1934934;
      const lng = pet?.homeCoordinates?.lng || 78.1607284;

      try {
        const results = await fetchNearbyVets(lat, lng);
        if (active) {
          setVets(results);
          setIsLoading(false);
          setSourceNote(results[0]?.source || 'Verified Veterinary Directory');
        }
      } catch (err) {
        console.warn('Failed to fetch vets:', err);
        if (active) setIsLoading(false);
      }
    }
    loadVets();
    return () => { active = false; };
  }, [pet]);

  const filteredVets = vets.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="post-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vets-modal">
        <div className="vets-modal-header">
          <div className="vets-header-left">
            <div className="vets-aid-badge">+ AID</div>
            <div>
              <h3 className="vets-modal-title">Nearby Vet Hospitals</h3>
              <p className="vets-modal-sub">Call directly or get turn-by-turn directions</p>
            </div>
          </div>
          <button className="vets-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="vets-search-wrap">
          <Search size={16} color="#888" />
          <input
            type="text"
            className="vets-search-input"
            placeholder="Search by clinic name or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Source Note */}
        {sourceNote && (
          <div className="vets-source-banner">
            <AlertCircle size={12} color="#059669" />
            <span>Showing verified animal clinics near {pet?.address?.split(',')[1] || 'Haridwar'}</span>
          </div>
        )}

        {/* Clinics List */}
        <div className="vets-list-scroll">
          {isLoading ? (
            <div className="vets-loading-state">
              <RefreshCw size={20} className="spin-icon" />
              <span>Querying OpenStreetMap for veterinary facilities...</span>
            </div>
          ) : filteredVets.length > 0 ? (
            filteredVets.map((vet) => (
              <div key={vet.id} className="vet-card">
                <div className="vet-card-info">
                  <div className="vet-name-row">
                    <h4 className="vet-name">{vet.name}</h4>
                    <span className="vet-distance-chip">{vet.distanceText}</span>
                  </div>
                  <p className="vet-address">{vet.address}</p>
                  <div className="vet-meta-row">
                    <span className="vet-hours">{vet.hours}</span>
                    <span className="vet-rating">{vet.rating}</span>
                  </div>
                </div>

                <div className="vet-card-actions">
                  <a
                    href={`tel:${vet.phone.replace(/[^0-9+]/g, '')}`}
                    className="vet-call-btn"
                    title="Call Clinic"
                    onClick={() => onShowToast?.(`Calling ${vet.name}... 📞`)}
                  >
                    <Phone size={15} />
                    <span>Call</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${vet.name} ${vet.address}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="vet-maps-btn"
                    title="Open Google Maps Directions"
                  >
                    <Navigation size={14} />
                    <span>Map</span>
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="vets-empty-state">
              <p>No clinics found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
