import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashPage() {
  const navigate = useNavigate();

  const getDestination = () => {
    try {
      const rawOwned = localStorage.getItem('purr_owned_pet_ids_v3');
      const ownedIds = rawOwned ? JSON.parse(rawOwned) : [];
      if (ownedIds.length > 0) {
        return `/p/${ownedIds[0]}`;
      }
    } catch {}
    return '/login';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(getDestination());
    }, 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="landing-screen" onClick={() => navigate(getDestination())}>
      <div className="landing-content">
        <h1 className="brand-title-handwritten">PETUWA</h1>
        <p className="brand-subtitle-landing">Your pet, always findable</p>
      </div>
      <img
        src="/assets/cat_clean_no_text.png"
        alt="Petuwa Spotted Cat"
        className="splash-cat-illustration"
      />
    </div>
  );
}
