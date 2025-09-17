import React from 'react';
import { Loader2 } from 'lucide-react';

function LoadingSpinner({ size = 24, className = '', text = '' }) {
  return (
    <div className={`loading-spinner ${className}`}>
      <Loader2 size={size} className="spinner-icon" />
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );
}

export default LoadingSpinner;
