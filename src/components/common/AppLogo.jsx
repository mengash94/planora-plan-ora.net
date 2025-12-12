import React from "react";

export default function AppLogo({ size = 80, showText = false, className = "" }) {
  // שימוש בלוגו החדש של Planora
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68cfd685c8ddf585cf3d713c/6d2a4f564_PlanoraLogo512.png";

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent('Planora')}&background=f97316&color=fff&size=${size * 4}`;

  const [imgSrc, setImgSrc] = React.useState(logoUrl);

  const handleError = () => {
    setImgSrc(fallback);
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} style={{ direction: "rtl" }}>
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <img
          src={imgSrc}
          alt="Planora"
          width={size}
          height={size}
          className="rounded-xl object-contain"
          onError={handleError}
          referrerPolicy="no-referrer"
        />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className="text-xl font-extrabold text-gray-900">Planora</div>
          <div className="text-xs text-gray-500">תכנון אירועים חכם</div>
        </div>
      )}
    </div>
  );
}