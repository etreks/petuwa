import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Plus } from 'lucide-react';
import { savePet, getUserSession, generateUniquePetId } from '../services/storage';
import { apiSavePet } from '../services/api';

export default function RegisterPetPage({ onShowToast }) {
  const navigate = useNavigate();
  const session = getUserSession();

  const [petPhoto, setPetPhoto] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('Cat');
  const [speciesInput, setSpeciesInput] = useState('Cat');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
        if (h > maxDim) { h = Math.round(h * maxDim / h); h = maxDim; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setPetPhoto(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectChip = (chipName) => {
    setSpecies(chipName);
    setSpeciesInput(chipName);
  };

  const handleSpeciesInputChange = (e) => {
    const val = e.target.value;
    setSpeciesInput(val);
    const standard = ['Cat', 'Dog', 'Rabbit', 'Cow'];
    if (standard.includes(val.trim())) {
      setSpecies(val.trim());
    } else if (val.trim() === '') {
      setSpecies('');
    } else {
      setSpecies('Other');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      onShowToast?.("Please enter owner's name");
      return;
    }
    if (!petName.trim()) {
      onShowToast?.("Please enter pet's name");
      return;
    }

    setIsLoading(true);
    const petId = generateUniquePetId(petName.trim());
    const finalSpecies = speciesInput.trim() || species || 'Cat';

    const newPet = {
      id: petId,
      name: petName.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: session?.phone || '+91 9876543210',
      address: address.trim(),
      species: finalSpecies,
      otherSpecies: species === 'Other' ? speciesInput.trim() : '',
      colorMarks: bio.trim(),
      bio: bio.trim(),
      photo: petPhoto || '/assets/ponya_avatar.png',
      status: 'Indoor',
      visits: 29,
      friends: 3,
      registeredAt: new Date().toISOString()
    };

    savePet(newPet);
    apiSavePet(newPet).catch(() => {});

    setTimeout(() => {
      setIsLoading(false);
      navigate(`/qr/${petId}`);
    }, 300);
  };

  return (
    <div className="figma-details-screen">
      {/* Add image icon */}
      <div className="figma-details-photo-wrap">
        <div
          className="figma-photo-box"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          title="Upload pet photo"
        >
          {petPhoto ? (
            <img src={petPhoto} alt="Pet preview" className="figma-photo-img" />
          ) : (
            <Camera size={25} color="#000000" strokeWidth={1.4} />
          )}
        </div>

        {/* Group 7: Circle with + (shown only when no photo uploaded) */}
        {!petPhoto && (
          <div
            className="figma-photo-badge"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            title="Add photo"
          >
            <div className="figma-rect-5" />
            <div className="figma-rect-6" />
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Details Form matching Slide 4 exactly */}
      <form onSubmit={handleSave} className="figma-details-form">
        {/* Group 4: Owner's name */}
        <div className="figma-group-4">
          <label className="figma-label-owner">Owner’s name</label>
          <input
            type="text"
            className="figma-frame-34"
            placeholder="Full Name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </div>

        {/* Group 5: Local Address */}
        <div className="figma-group-5">
          <label className="figma-label-address">Local Address</label>
          <input
            type="text"
            className="figma-frame-35"
            placeholder="Street name, Block, Landmark, City, State"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Group 3: Pet's name */}
        <div className="figma-group-3">
          <label className="figma-label-petname">Pet’s name</label>
          <input
            type="text"
            className="figma-frame-28-pet"
            placeholder='e.g. “Ponya”'
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
          />
        </div>

        {/* Group 1 & Group 2: Pet Species */}
        <div className="figma-group-1">
          <label className="figma-label-species">Pet Species</label>
          <div className="figma-chips-row">
            <button
              type="button"
              className={`figma-frame-chip-cat ${species === 'Cat' ? 'active' : ''}`}
              onClick={() => handleSelectChip('Cat')}
            >
              Cat
            </button>
            <button
              type="button"
              className={`figma-frame-chip-dog ${species === 'Dog' ? 'active' : ''}`}
              onClick={() => handleSelectChip('Dog')}
            >
              Dog
            </button>
            <button
              type="button"
              className={`figma-frame-chip-rabbit ${species === 'Rabbit' ? 'active' : ''}`}
              onClick={() => handleSelectChip('Rabbit')}
            >
              Rabbit
            </button>
            <button
              type="button"
              className={`figma-frame-chip-cow ${species === 'Cow' ? 'active' : ''}`}
              onClick={() => handleSelectChip('Cow')}
            >
              Cow
            </button>
          </div>
          <input
            type="text"
            className="figma-frame-33"
            placeholder="(Others)"
            value={speciesInput}
            onChange={handleSpeciesInputChange}
          />
        </div>

        {/* Group 6: Bio (optional) */}
        <div className="figma-group-6">
          <label className="figma-label-bio">Bio (optional)</label>
          <textarea
            className="figma-frame-36"
            rows={2}
            placeholder="Describe the personality of your pet."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {/* Frame 24: Save and Continue */}
        <button
          type="submit"
          className="figma-frame-24-save"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save and Continue'}
        </button>
      </form>
    </div>
  );
}
