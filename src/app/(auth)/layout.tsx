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
          <div
            className="rounded-full p-2"
            style={{
              background: "rgba(255,255,255,0.04)",
              boxShadow: "0 0 0 1px rgba(184,134,11,0.3), 0 0 50px rgba(184,134,11,0.15)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crest.svg" width={104} height={104} alt="SQ7Z Crest" />
          </div>
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
