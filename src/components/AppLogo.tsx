export default function AppLogo({ className = "w-10 h-10", variant = "default" }: { className?: string, variant?: "default" | "light" | "colored" }) {
  const outerColor = variant === "light" ? "currentColor" : variant === "colored" ? "#1A237E" : "currentColor";
  
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Shield */}
      <path d="M50 8 C60 8 75 14 85 18 C85 45 80 65 50 92 C20 65 15 45 15 18 C25 14 40 8 50 8 Z" fill={outerColor} />
      
      {/* Nano Banana Accent Circle */}
      {variant !== "light" && (
        <circle cx="50" cy="46" r="22" fill="#FFFDE7" />
      )}
      {variant === "light" && (
        <circle cx="50" cy="46" r="22" fill="#1A237E" opacity="0.2" />
      )}
      
      {/* Target/Map Symbol element */}
      <path d="M50 32 L50 40 M50 52 L50 60" stroke={variant === "light" ? "white" : "#1A237E"} strokeWidth="4" strokeLinecap="round" />
      <path d="M36 46 L44 46 M56 46 L64 46" stroke={variant === "light" ? "white" : "#1A237E"} strokeWidth="4" strokeLinecap="round" />
      
      <circle cx="50" cy="46" r="10" stroke={variant === "light" ? "white" : "#1A237E"} strokeWidth="4" />
      
      {/* Center Dot */}
      <circle cx="50" cy="46" r="3" fill={variant === "light" ? "white" : "#1A237E"} />
    </svg>
  );
}
