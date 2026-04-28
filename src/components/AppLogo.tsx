import { Shield } from 'lucide-react';
import { useState } from 'react';
import logoSrc from '../logo.png';

export default function AppLogo({ className = "w-10 h-10" }: { className?: string, variant?: "default" | "light" | "colored" }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {!hasError ? (
        <img 
          src={logoSrc} 
          alt="App Logo" 
          className="w-full h-full object-contain" 
          onError={() => {
            console.error('Image failed to load in AppLogo');
            setHasError(true);
          }}
        />
      ) : (
        <Shield className="w-1/2 h-1/2 text-white" />
      )}
    </div>
  );
}
