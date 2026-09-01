import { UnitLogo } from "@/components/shared/unit-logo";

// SVG wave paths as data URIs
const WAVE1 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,100 350,0 600,60 C850,120 1050,20 1200,60 L1200,120 L0,120 Z' fill='%230a2d6e'/%3E%3C/svg%3E")`;
const WAVE2 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,40 C200,80 400,0 600,40 C800,80 1000,10 1200,50 L1200,120 L0,120 Z' fill='%23052459'/%3E%3C/svg%3E")`;
const WAVE3 = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,80 C300,20 600,100 900,40 C1050,10 1150,70 1200,60 L1200,120 L0,120 Z' fill='%23001a4d'/%3E%3C/svg%3E")`;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#000d1f] px-4 py-12">

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Radial glow behind card */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#003087]/20 blur-[100px]" />

      {/* Animated wave layers */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64">
        <div className="wave-layer wave-1" style={{ backgroundImage: WAVE1, backgroundSize: "50% 180px" }} />
        <div className="wave-layer wave-2" style={{ backgroundImage: WAVE2, backgroundSize: "50% 140px" }} />
        <div className="wave-layer wave-3" style={{ backgroundImage: WAVE3, backgroundSize: "50% 110px" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">

        {/* Unit seal */}
        <div className="anchor-float mb-8 flex flex-col items-center gap-3 text-center">
          <div
            className="flex items-center justify-center rounded-full bg-white/5 backdrop-blur-sm p-1"
            style={{ boxShadow: "0 0 0 1px rgba(184,134,11,0.4), 0 0 40px rgba(184,134,11,0.2), inset 0 0 20px rgba(184,134,11,0.05)" }}
          >
            <UnitLogo size={80} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Squadron 7-Zulu <span className="text-[#B8860B]">&amp;</span> TS Wasp
            </h1>
            <p className="mt-1 text-sm font-medium text-white/40 uppercase tracking-widest">
              U.S. Naval Sea Cadet Corps
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-white p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-white/25">
          Authorized Personnel Only · {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
