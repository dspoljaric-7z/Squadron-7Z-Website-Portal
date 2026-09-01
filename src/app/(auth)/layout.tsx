export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#000d1f] px-4 py-12">

      {/* Radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#003087]/15 blur-[120px]" />

      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">

        {/* Logo + unit name */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          {/* Inline crest — 4 naval signal flags (S/Q/7/Z) in a circle */}
          <svg
            width="108"
            height="108"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 0 16px rgba(184,134,11,0.35))" }}
          >
            <defs>
              <radialGradient id="auth-bg" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#163a6e"/>
                <stop offset="100%" stopColor="#040e1f"/>
              </radialGradient>
              <clipPath id="auth-circle">
                <circle cx="100" cy="100" r="90"/>
              </clipPath>
            </defs>

            {/* Background */}
            <circle cx="100" cy="100" r="98" fill="#0a1628"/>
            {/* Gold rope ring */}
            <circle cx="100" cy="100" r="94" fill="none" stroke="#C9A84C" strokeWidth="7" strokeDasharray="5,3"/>
            <circle cx="100" cy="100" r="94" fill="none" stroke="#7a4a0e" strokeWidth="3.5" strokeDasharray="5,3" strokeDashoffset="4"/>
            <circle cx="100" cy="100" r="88" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
            {/* Inner ocean fill */}
            <circle cx="100" cy="100" r="85" fill="url(#auth-bg)"/>

            {/* 2×2 flag grid clipped to circle */}
            <g clipPath="url(#auth-circle)">
              {/* Divider lines */}
              <line x1="100" y1="25" x2="100" y2="175" stroke="#C9A84C" strokeWidth="1.5" opacity="0.5"/>
              <line x1="25"  y1="100" x2="175" y2="100" stroke="#C9A84C" strokeWidth="1.5" opacity="0.5"/>

              {/* Flag S — top-left: white + blue center stripe */}
              <rect x="26" y="26" width="72" height="72" fill="#ffffff"/>
              <rect x="58" y="26" width="20" height="72" fill="#00247d"/>

              {/* Flag Q — top-right: solid gold/yellow */}
              <rect x="102" y="26" width="72" height="72" fill="#FFD100"/>

              {/* Flag 7 — bottom-left: red + white stripes */}
              <rect x="26" y="102" width="72" height="72" fill="#CF142B"/>
              <rect x="26" y="120" width="72" height="11" fill="#ffffff"/>
              <rect x="26" y="145" width="72" height="11" fill="#ffffff"/>

              {/* Flag Z — bottom-right: quartered diagonal */}
              <rect x="102" y="102" width="72" height="72" fill="#ffffff"/>
              <polygon points="102,102 174,102 138,138" fill="#00247d"/>
              <polygon points="174,102 174,174 138,138" fill="#FFD100"/>
              <polygon points="174,174 102,174 138,138" fill="#CF142B"/>
              <polygon points="102,174 102,102 138,138" fill="#111111"/>
            </g>

            {/* Gold border over flags */}
            <rect x="26" y="26" width="72" height="72" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
            <rect x="102" y="26" width="72" height="72" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
            <rect x="26" y="102" width="72" height="72" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
            <rect x="102" y="102" width="72" height="72" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>

            {/* Letter labels */}
            <text x="62" y="68" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="bold" fontFamily="serif" fill="#C9A84C">S</text>
            <text x="138" y="68" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="bold" fontFamily="serif" fill="#003087">Q</text>
            <text x="62" y="142" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="bold" fontFamily="serif" fill="#ffffff">7</text>
            <text x="138" y="142" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="bold" fontFamily="serif" fill="#C9A84C">Z</text>
          </svg>

          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-white leading-tight">
              Squadron 7-Zulu <span className="text-[#B8860B]">&amp;</span> TS Wasp
            </h1>
            <p className="mt-1.5 text-[11px] font-semibold text-white/35 uppercase tracking-[0.2em]">
              U.S. Naval Sea Cadet Corps
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#003087] via-[#B8860B] to-[#003087]" />
          <div className="p-8">
            {children}
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-white/20 tracking-wide">
          Authorized Personnel Only · {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
