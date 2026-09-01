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
      <circle cx="200" cy="200" r="192" fill="#0b1d3a"/>
      <circle cx="200" cy="200" r="183" fill="none" stroke="#C9A84C" strokeWidth="14" strokeDasharray="9,5"/>
      <circle cx="200" cy="200" r="183" fill="none" stroke="#7a4a0e" strokeWidth="7" strokeDasharray="9,5" strokeDashoffset="7"/>
      <circle cx="200" cy="200" r="172" fill="none" stroke="#C9A84C" strokeWidth="2.5"/>
      <circle cx="200" cy="200" r="130" fill="url(#ul-ocean)"/>
      <circle cx="200" cy="200" r="130" fill="none" stroke="#C9A84C" strokeWidth="2"/>
      {/* Side stars */}
      <polygon transform="translate(48,200)" fill="#C9A84C" points="0,-10 2.9,-4 9.5,-3.1 4.8,1.5 5.9,8.1 0,5 -5.9,8.1 -4.8,1.5 -9.5,-3.1 -2.9,-4"/>
      <polygon transform="translate(352,200)" fill="#C9A84C" points="0,-10 2.9,-4 9.5,-3.1 4.8,1.5 5.9,8.1 0,5 -5.9,8.1 -4.8,1.5 -9.5,-3.1 -2.9,-4"/>
      {/* Curved motto */}
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
      {/* Curved SQ7Z bottom */}
      <g fontFamily="Georgia,serif" fill="#C9A84C" textAnchor="middle" dominantBaseline="middle">
        <text transform="rotate(26,134,336)" x="134" y="336" fontSize="11">·</text>
        <text transform="rotate(15,161,346)" x="161" y="346" fontSize="28" fontWeight="bold">S</text>
        <text transform="rotate(5,187,350)" x="187" y="350" fontSize="28" fontWeight="bold">Q</text>
        <text transform="rotate(-5,213,350)" x="213" y="350" fontSize="28" fontWeight="bold">7</text>
        <text transform="rotate(-15,239,346)" x="239" y="346" fontSize="28" fontWeight="bold">Z</text>
        <text transform="rotate(-26,266,336)" x="266" y="336" fontSize="11">·</text>
      </g>
      {/* Signal flags */}
      <line x1="142" y1="148" x2="142" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
      <line x1="202" y1="148" x2="202" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
      <line x1="258" y1="148" x2="258" y2="248" stroke="#C9A84C" strokeWidth="1.2" opacity="0.4"/>
      <rect x="142" y="154" width="56" height="42" fill="#ffffff"/>
      <rect x="161" y="161" width="18" height="28" fill="#00247d"/>
      <rect x="142" y="154" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
      <rect x="202" y="154" width="56" height="42" fill="#FFD100"/>
      <rect x="202" y="154" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
      <rect x="142" y="200" width="56" height="42" fill="#CF142B"/>
      <rect x="142" y="208" width="56" height="8" fill="white"/>
      <rect x="142" y="225" width="56" height="8" fill="white"/>
      <rect x="142" y="200" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
      <rect x="202" y="200" width="56" height="42" fill="white"/>
      <polygon points="202,200 258,200 230,221" fill="#00247d" clipPath="url(#ul-fz)"/>
      <polygon points="258,200 258,242 230,221" fill="#FFD100" clipPath="url(#ul-fz)"/>
      <polygon points="258,242 202,242 230,221" fill="#CF142B" clipPath="url(#ul-fz)"/>
      <polygon points="202,242 202,200 230,221" fill="#111111" clipPath="url(#ul-fz)"/>
      <rect x="202" y="200" width="56" height="42" fill="none" stroke="#C9A84C" strokeWidth="1.8"/>
      <rect x="139" y="151" width="122" height="94" fill="none" stroke="#C9A84C" strokeWidth="1.2" rx="2" opacity="0.5"/>
      <text x="200" y="135" textAnchor="middle" fontFamily="Georgia,serif" fontSize="9" letterSpacing="3" fill="#C9A84C">USS SALEM</text>
      <line x1="152" y1="141" x2="248" y2="141" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6"/>
      <line x1="152" y1="259" x2="248" y2="259" stroke="#C9A84C" strokeWidth="0.8" opacity="0.6"/>
      <text x="200" y="267" textAnchor="middle" fontFamily="Georgia,serif" fontSize="9" letterSpacing="3" fill="#C9A84C">CA · 139</text>
    </svg>
  );
}
