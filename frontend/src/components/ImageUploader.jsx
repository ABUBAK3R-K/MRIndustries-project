import React, { useState } from 'react';
import { Upload } from 'lucide-react';

export default function ImageUploader({ label, onImageSelected }) {
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onImageSelected(file);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 font-medium text-primary">{label}</p>
      <div className="relative w-48 h-64 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white hover:border-gold transition-colors">
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Upload size={32} className="mb-2" />
            <span className="text-sm">Upload Image</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
