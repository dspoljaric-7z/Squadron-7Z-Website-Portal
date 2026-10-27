import Link from "next/link";

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

        {/* Back to main site */}
        <Link
          href="/"
          className="mb-6 flex w-full items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to main site
        </Link>

        {/* Logo + unit name */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          {/* SQ7Z full crest — signal flags + curved motto */}
          <svg width="120" height="120" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 0 20px rgba(184,134,11,0.4))" }}>
            <defs>
              <radialGradient id="lc-ocean" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#1a4f8a"/>
                <stop offset="55%" stopColor="#0b2a66"/>
                <stop offset="100%" stopColor="#050e20"/>
              </radialGradient>
              <clipPath id="lc-fz"><rect x="202" y="200" width="56" height="42"/></clipPath>
            </defs>
            <circle cx="200" cy="200" r="192" fill="#0b1d3a"/>
            <circle cx="200" cy="200" r="183" fill="none" stroke="#C9A84C" strokeWidth="14" strokeDasharray="9,5"/>
            <circle cx="200" cy="200" r="183" fill="none" stroke="#7a4a0e" strokeWidth="7" strokeDasharray="9,5" strokeDashoffset="7"/>
            <circle cx="200" cy="200" r="172" fill="none" stroke="#C9A84C" strokeWidth="2.5"/>
            <circle cx="200" cy="200" r="130" fill="url(#lc-ocean)"/>
            <circle cx="200" cy="200" r="130" fill="none" stroke="#C9A84C" strokeWidth="2"/>
            {/* Side stars */}
            <polygon transform="translate(48,200)" fill="#C9A84C" points="0,-10 2.9,-4 9.5,-3.1 4.8,1.5 5.9,8.1 0,5 -5.9,8.1 -4.8,1.5 -9.5,-3.1 -2.9,-4"/>
            <polygon transform="translate(352,200)" fill="#C9A84C" points="0,-10 2.9,-4 9.5,-3.1 4.8,1.5 5.9,8.1 0,5 -5.9,8.1 -4.8,1.5 -9.5,-3.1 -2.9,-4"/>
            {/* Curved motto: BUILDING LEADERS OF CHARACTER */}
            <g fontFamily="Georgia,serif" fontSize="8.5" fill="#C9A84C" textAnchor="middle" dominantBaseline="middle">
              <text transform="rotate(-53,79,109)" x="79" y="109">B</text>
              <text transform="rotate(-49,86,102)" x="86" y="102">U</text>
              <text transform="rotate(-46,92,94)" x="92" y="94">I</text>
              <text transform="rotate(-42,99,87)" x="99" y="87">L</text>
              <text transform="rotate(-38,107,81)" x="107" y="81">D</text>
              <text transform="rotate(-34,115,75)" x="115" y="75">I</text>
              <text transform="rotate(-30,124,70)" x="124" y="70">N</text>
              <text transform="rotate(-27,133,65)" x="133" y="65">G</text>
              <text transform="rotate(-19,151,57)" x="151" y="57">L</text>
              <text transform="rotate(-15,160,54)" x="160" y="54">E</text>
              <text transform="rotate(-11,170,52)" x="170" y="52">A</text>
              <text transform="rotate(-8,180,50)" x="180" y="50">D</text>
              <text transform="rotate(-4,190,49)" x="190" y="49">E</text>
              <text transform="rotate(0,200,49)" x="200" y="49">R</text>
              <text transform="rotate(4,210,49)" x="210" y="49">S</text>
              <text transform="rotate(11,230,52)" x="230" y="52">O</text>
              <text transform="rotate(15,240,54)" x="240" y="54">F</text>
              <text transform="rotate(23,259,61)" x="259" y="61">C</text>
              <text transform="rotate(27,268,65)" x="268" y="65">H</text>
              <text transform="rotate(30,277,70)" x="277" y="70">A</text>
              <text transform="rotate(34,285,75)" x="285" y="75">R</text>
              <text transform="rotate(38,293,81)" x="293" y="81">A</text>
              <text transform="rotate(42,301,87)" x="301" y="87">C</text>
              <text transform="rotate(46,308,94)" x="308" y="94">T</text>
              <text transform="rotate(49,315,102)" x="315" y="102">E</text>
              <text transform="rotate(53,321,109)" x="321" y="109">R</text>
            </g>
            {/* Curved SQ7Z at bottom */}
            <g fontFamily="Georgia,serif" fill="#C9A84C" textAnchor="middle" dominantBaseline="middle">
              <text transform="rotate(26,134,336)" x="134" y="336" fontSize="11">·</text>
              <text transform="rotate(15,161,346)" x="161" y="346" fontSize="28" fontWeight="bold">S</text>
              <text transform="rotate(5,187,350)" x="187" y="350" fontSize="28" fontWeight="bold">Q</text>
              <text transform="rotate(-5,213,350)" x="213" y="350" fontSize="28" fontWeight="bold">7</text>
              <text transform="rotate(-15,239,346)" x="239" y="346" fontSize="28" fontWeight="bold">Z</text>
              <text transform="rotate(-26,266,336)" x="266" y="336" fontSize="11">·</text>
            </g>
            {/* Signal flags grid */}
            <line x1="142" y1="148" x2="142" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
            <line x1="202" y1="148" x2="202" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
            <line x1="258" y1="148" x2="258" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
            {/* Flag S */}
            <rect x="142" y="154" width="56" height="42" fill="#ffffff"/>
            <rect x="161" y="161" width="18" height="28" fill="#00247d"/>
            <rect x="142" y="154" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
            {/* Flag Q */}
            <rect x="202" y="154" width="56" height="42" fill="#FFD100"/>
            <rect x="202" y="154" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
            {/* Flag 7 */}
            <rect x="142" y="200" width="56" height="42" fill="#CF142B"/>
            <rect x="142" y="208" width="56" height="8" fill="white"/>
            <rect x="142" y="225" width="56" height="8" fill="white"/>
            <rect x="142" y="200" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
            {/* Flag Z */}
            <rect x="202" y="200" width="56" height="42" fill="white"/>
            <polygon points="202,200 258,200 230,221" fill="#00247d" clipPath="url(#lc-fz)"/>
            <polygon points="258,200 258,242 230,221" fill="#FFD100" clipPath="url(#lc-fz)"/>
            <polygon points="258,242 202,242 230,221" fill="#CF142B" clipPath="url(#lc-fz)"/>
            <polygon points="202,242 202,200 230,221" fill="#111111" clipPath="url(#lc-fz)"/>
            <rect x="202" y="200" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
            {/* Outer flag border */}
            <rect x="139" y="151" width="122" height="94" fill="none" stroke="#C9A84C" strokeWidth="1.2" rx="2" opacity="0.5"/>
            {/* USS SALEM / CA·139 labels */}
            <text x="200" y="135" textAnchor="middle" fontFamily="Georgia,serif" fontSize="9" letterSpacing="3" fill="#C9A84C">USS SALEM</text>
            <line x1="152" y1="141" x2="248" y2="141" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6"/>
            <line x1="152" y1="259" x2="248" y2="259" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6"/>
            <text x="200" y="267" textAnchor="middle" fontFamily="Georgia,serif" fontSize="9" letterSpacing="3" fill="#C9A84C">CA · 139</text>
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
