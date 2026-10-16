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
    return '/p/ponya';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(getDestination());
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="landing-screen" onClick={() => navigate(getDestination())}>
      <div className="landing-content">
        <h1 className="brand-title-handwritten">PURR</h1>
        <p className="brand-subtitle-landing">Your Pet’s town</p>
      </div>
      <img
        src="/assets/cat_clean_no_text.png"
        alt="Purr Town Cat"
        className="splash-cat-illustration"
      />
    </div>
  );
}
