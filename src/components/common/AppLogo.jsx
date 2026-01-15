import React from "react";

export default function AppLogo({ size = 80, showText = false, className = "" }) {
  // שימוש בלוגו החדש של PlanOra
  const logoUrl = "https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/assets/logo/planora_logo.jpg";

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent('PlanOra')}&background=f97316&color=fff&size=${size * 4}`;

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
          alt="PlanOra"
          width={size}
          height={size}
          className="rounded-xl object-contain"
          onError={handleError}
          referrerPolicy="no-referrer"
        />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className="text-xl font-extrabold text-gray-900">PlanOra</div>
          <div className="text-xs text-gray-500">תכנון אירועים חכם</div>
        </div>
      )}
    </div>
  );
}