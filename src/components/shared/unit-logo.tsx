"use client";

export function UnitLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="ul-ocean" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1a4f8a"/>
          <stop offset="55%" stopColor="#0b2a66"/>
          <stop offset="100%" stopColor="#050e20"/>
        </radialGradient>
        <clipPath id="ul-fz"><rect x="202" y="200" width="56" height="42"/></clipPath>
      </defs>

      {/* Outer background */}
      <circle cx="200" cy="200" r="198" fill="#0b1d3a"/>

      {/* Decorative rope ring */}
      <circle cx="200" cy="200" r="183" fill="none" stroke="#C9A84C" strokeWidth="14" strokeDasharray="9,5"/>
      <circle cx="200" cy="200" r="183" fill="none" stroke="#7a4a0e" strokeWidth="7" strokeDasharray="9,5" strokeDashoffset="7"/>
      <circle cx="200" cy="200" r="172" fill="none" stroke="#C9A84C" strokeWidth="2.5"/>

      {/* Inner ocean circle */}
      <circle cx="200" cy="200" r="130" fill="url(#ul-ocean)"/>
      <circle cx="200" cy="200" r="130" fill="none" stroke="#C9A84C" strokeWidth="2"/>

      {/* Flag grid lines */}
      <line x1="142" y1="148" x2="142" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
      <line x1="202" y1="148" x2="202" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
      <line x1="258" y1="148" x2="258" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>

      {/* Flag S — top-left: white field, blue vertical stripe */}
      <rect x="142" y="154" width="56" height="42" fill="#ffffff"/>
      <rect x="161" y="161" width="18" height="28" fill="#00247d"/>
      <rect x="142" y="154" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>

      {/* Flag Q — top-right: solid yellow */}
      <rect x="202" y="154" width="56" height="42" fill="#FFD100"/>
      <rect x="202" y="154" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>

      {/* Flag 7 — bottom-left: red/white stripes */}
      <rect x="142" y="200" width="56" height="42" fill="#CF142B"/>
      <rect x="142" y="208" width="56" height="8" fill="white"/>
      <rect x="142" y="225" width="56" height="8" fill="white"/>
      <rect x="142" y="200" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>

      {/* Flag Z — bottom-right: quartered diagonal */}
      <rect x="202" y="200" width="56" height="42" fill="white"/>
      <polygon points="202,200 258,200 230,221" fill="#00247d" clipPath="url(#ul-fz)"/>
      <polygon points="258,200 258,242 230,221" fill="#FFD100" clipPath="url(#ul-fz)"/>
      <polygon points="258,242 202,242 230,221" fill="#CF142B" clipPath="url(#ul-fz)"/>
      <polygon points="202,242 202,200 230,221" fill="#111111" clipPath="url(#ul-fz)"/>
      <rect x="202" y="200" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
    </svg>
  );
}
