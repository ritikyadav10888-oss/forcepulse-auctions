import React from 'react';

// A player photo shown whole, never cut: the photo fits inside the frame and a blurred copy fills the spare space.
// Put it inside a positioned box (relative / absolute) that sets the frame's size.
export const PlayerPhoto = ({ src, alt = '', className = '' }) => (
  <span className="absolute inset-0 block overflow-hidden bg-slate-800">
    <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
    <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-contain ${className}`} />
  </span>
);
