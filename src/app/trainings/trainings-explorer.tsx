"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export type Training = {
  name: string;
  location: string;
  duration: string;
  overview: string;
  whatYouDo: string[];
  whatYouEarn: string[];
  whoItsFor: string;
};

export type Category = {
  title: string;
  tagline: string;
  trainings: Training[];
};

const CATEGORIES: Category[] = [
  {
    title: "Medical & Life Safety",
    tagline: "Save lives. Earn certifications that follow you forever.",
    trainings: [
      {
        name: "Emergency Medical Technician (EMT)",
        location: "Various military installations",
        duration: "10 days",
        overview: "One of the most demanding and rewarding trainings in the catalog. Cadets complete EMT-Basic certification alongside active-duty medical personnel, learning to assess and treat trauma, manage airways, and respond under pressure.",
        whatYouDo: ["Patient assessment and triage", "Trauma care and wound management", "Airway management and oxygen therapy", "Practical skills testing under evaluation"],
        whatYouEarn: ["EMT-Basic certification (nationally recognized)", "NSCC Medical rating", "Community service hours"],
        whoItsFor: "NSCC cadets interested in medicine, nursing, paramedics, or military healthcare. Physically and mentally demanding.",
      },
      {
        name: "First Responder",
        location: "Naval Medical Center, Portsmouth VA",
        duration: "7 days",
        overview: "Cadets train as First Responders, learning to stabilize patients, manage emergencies, and work within a medical response team. Less intensive than EMT but still rigorous and certified.",
        whatYouDo: ["Emergency scene management", "Patient stabilization and vital signs", "CPR/AED certification", "Simulated mass casualty events"],
        whatYouEarn: ["First Responder certification", "CPR/AED certification"],
        whoItsFor: "Cadets who want medical training with a slightly lower certification bar than full EMT.",
      },
    ],
  },
  {
    title: "Aviation",
    tagline: "Get off the ground. FAA certifications. Real aircraft.",
    trainings: [
      {
        name: "FAA Private Pilot Ground School",
        location: "NAS Pensacola, FL / Various",
        duration: "7–10 days",
        overview: "Cadets receive instruction equivalent to FAA Private Pilot Ground School: aerodynamics, navigation, meteorology, regulations, and flight planning. Instruction is delivered by military aviators and civilian instructors.",
        whatYouDo: ["Aerodynamics and aircraft systems", "FAA regulations and airspace", "Weather interpretation and flight planning", "Navigation and cross-country planning"],
        whatYouEarn: ["FAA Ground School completion certificate", "NSCC Aviation rating", "Credit toward FAA Knowledge Test"],
        whoItsFor: "Any cadet with an interest in aviation, aerospace engineering, or military flight programs. Academically rigorous.",
      },
      {
        name: "Air Traffic Control Orientation",
        location: "Various ATC facilities",
        duration: "7 days",
        overview: "An immersive look at how the National Airspace System works from the inside. Cadets tour approach and tower facilities, shadow controllers, and receive instruction on radar, communication, and separation standards.",
        whatYouDo: ["Tower and TRACON facility tours", "Radar simulation exercises", "Aviation weather and NOTAM review", "Communication procedures"],
        whatYouEarn: ["NSCC Aviation rating", "Letter of completion"],
        whoItsFor: "Cadets interested in aviation careers outside of flying: ATC, aerospace operations, military logistics.",
      },
    ],
  },
  {
    title: "SCUBA & Maritime Diving",
    tagline: "Open water certification. Real dives. Military supervision.",
    trainings: [
      {
        name: "SCUBA Open Water Certification",
        location: "Naval Station Key West, FL",
        duration: "10 days",
        overview: "Cadets earn a PADI or equivalent Open Water SCUBA certification through a rigorous course conducted by Navy diving professionals. Pool work, skills demonstrations, and multiple open-water dives are required to pass.",
        whatYouDo: ["Pool skills (buoyancy, mask clearing, regulator recovery)", "Open ocean dives to certification depth", "Dive planning and buddy procedures", "Equipment inspection and maintenance"],
        whatYouEarn: ["PADI Open Water Diver certification (lifetime)", "NSCC Diving rating"],
        whoItsFor: "Cadets who pass a swim qualification. No prior dive experience needed. Physically demanding.",
      },
      {
        name: "Underwater Navigation",
        location: "Naval Station Key West, FL",
        duration: "7 days",
        overview: "Advanced SCUBA training focused on compass navigation, natural navigation, and search patterns underwater. Requires a prior SCUBA certification.",
        whatYouDo: ["Compass bearings and reciprocal navigation", "Natural reference navigation", "Underwater search patterns", "Night dive procedures"],
        whatYouEarn: ["PADI Underwater Navigation certification", "NSCC Advanced Diving rating"],
        whoItsFor: "Cadets who already hold Open Water SCUBA certification.",
      },
    ],
  },
  {
    title: "Special Operations",
    tagline: "Land navigation. Rappelling. Survival skills. The hard stuff.",
    trainings: [
      {
        name: "Rappelling & Vertical Assault",
        location: "Regional military installation",
        duration: "7 days",
        overview: "Cadets learn to rappel from towers and natural terrain, conduct vertical movement in a tactical context, and work as a team under physical stress. Instruction is led by Army Rangers and Special Forces personnel.",
        whatYouDo: ["Rappelling from towers up to 50 feet", "Rope handling and knot tying", "Team movement on vertical terrain", "Physical conditioning under instruction"],
        whatYouEarn: ["NSCC Special Operations rating", "Rappelling completion certificate"],
        whoItsFor: "Physically fit cadets looking for the hardest training in the catalog. Strong PT baseline recommended.",
      },
      {
        name: "SERE (Survival, Evasion, Resistance, Escape)",
        location: "Various mountain/wilderness installations",
        duration: "7–10 days",
        overview: "A serious program that teaches cadets how to survive in austere environments. Covers food procurement, shelter construction, navigation without equipment, and resistance to stress.",
        whatYouDo: ["Fire starting, shelter construction, water procurement", "Land navigation without GPS", "Stress inoculation and decision-making under pressure", "Field exercises in realistic scenarios"],
        whatYouEarn: ["NSCC SERE rating", "Wilderness survival skills documentation"],
        whoItsFor: "Mature cadets with strong physical conditioning. Mentally demanding as much as physically.",
      },
    ],
  },
  {
    title: "STEM & Technology",
    tagline: "Engineering. Cyber. Nuclear propulsion. The future of the fleet.",
    trainings: [
      {
        name: "Cybersecurity Operations",
        location: "NSA / Various DoD facilities",
        duration: "7 days",
        overview: "Cadets receive instruction in offensive and defensive cybersecurity fundamentals from DoD personnel. Topics include network security, threat analysis, and basic penetration testing concepts.",
        whatYouDo: ["Network architecture and threat vectors", "Hands-on CTF (capture the flag) exercises", "Security operations center (SOC) simulation", "Cryptography basics"],
        whatYouEarn: ["NSCC STEM rating", "Introduction to cybersecurity certification"],
        whoItsFor: "Cadets with some computer science background or a strong interest in technology and security careers.",
      },
      {
        name: "Naval Nuclear Propulsion",
        location: "Naval Nuclear Power School, Goose Creek, SC",
        duration: "7 days",
        overview: "A rare look inside one of the most technically demanding fields in the Navy. Cadets receive instruction in nuclear physics, reactor operations, and the engineering systems that power submarines and aircraft carriers.",
        whatYouDo: ["Nuclear physics and reactor theory", "Propulsion plant systems overview", "Safety procedures and engineering watch-standing", "Tours of training reactors"],
        whatYouEarn: ["NSCC Nuclear rating", "Letter of completion from Naval Nuclear Power School"],
        whoItsFor: "Strong STEM students, particularly those interested in Navy nuclear officer or enlisted programs.",
      },
    ],
  },
  {
    title: "Seamanship & Navigation",
    tagline: "Underway aboard Navy vessels. Real charts. Real water.",
    trainings: [
      {
        name: "Deck Operations & Seamanship",
        location: "Various Naval stations",
        duration: "7 days",
        overview: "Cadets spend time aboard Navy vessels learning the fundamentals of deck seamanship: line handling, watch-standing, navigation plotting, and ship handling basics. One of the most hands-on trainings in the catalog.",
        whatYouDo: ["Line handling and marlinespike seamanship", "Chart navigation and piloting", "Underway watch-standing rotations", "Rules of the Road (maritime collision regulations)"],
        whatYouEarn: ["NSCC Seamanship rating", "Small Boat handling qualification"],
        whoItsFor: "Any cadet. Strongly recommended for those considering Navy or Coast Guard service.",
      },
    ],
  },
  {
    title: "Leadership & Officer Development",
    tagline: "For cadets ready to lead. Command courses and staff billets.",
    trainings: [
      {
        name: "Junior Officer Leadership Course",
        location: "NSCC National Headquarters",
        duration: "10 days",
        overview: "For senior cadets on track for officer-level billets. An intensive leadership curriculum covering command philosophy, cadet welfare, staff organization, training design, and mentorship.",
        whatYouDo: ["Leadership philosophy and case studies", "Staff planning and operations order writing", "Training design and instruction delivery", "Peer evaluation and self-assessment"],
        whatYouEarn: ["NSCC Officer Candidate certification", "Eligibility for Officer-track billet assignment"],
        whoItsFor: "PO2 and above cadets with demonstrated leadership record. Command recommendation typically required.",
      },
    ],
  },
  {
    title: "Arts, Music & Culture",
    tagline: "The marching band. Color guard. Journalism. Film.",
    trainings: [
      {
        name: "Marching Band & Drum Corps",
        location: "Various venues and camps",
        duration: "7–10 days",
        overview: "Cadets with musical backgrounds join an ensemble that performs at military and civic events. Instruction covers ensemble performance, marching fundamentals, and musical discipline.",
        whatYouDo: ["Daily ensemble rehearsals and sectionals", "Marching fundamentals and drill design", "Performance at military ceremonies", "Music theory and sight-reading"],
        whatYouEarn: ["NSCC Music rating", "Performance experience and ensemble membership"],
        whoItsFor: "Cadets with prior instrument or drumline experience.",
      },
      {
        name: "Journalism & Photography",
        location: "Various media facilities",
        duration: "7 days",
        overview: "Cadets train as public affairs journalists and photographers alongside military PA specialists. They produce written and photo content that may be published through official NSCC channels.",
        whatYouDo: ["News writing and AP style fundamentals", "Photography composition and lighting", "Interview techniques and source ethics", "Photo editing and publication workflow"],
        whatYouEarn: ["NSCC Journalism rating", "Published work in NSCC media outlets"],
        whoItsFor: "Cadets interested in media, communications, public relations, or photography.",
      },
    ],
  },
];

export function TrainingsExplorer({ categories: propCategories }: { categories?: Category[] }) {
  const source = propCategories && propCategories.length > 0 ? propCategories : CATEGORIES;
  const [openCategory, setOpenCategory] = useState<string | null>(source[0]?.title ?? null);
  const [openTraining, setOpenTraining] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return source;
    const q = query.toLowerCase();
    return source.map((cat) => ({
      ...cat,
      trainings: cat.trainings.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.overview.toLowerCase().includes(q) ||
          cat.title.toLowerCase().includes(q) ||
          t.whatYouDo.some((d) => d.toLowerCase().includes(q)) ||
          t.whatYouEarn.some((e) => e.toLowerCase().includes(q))
      ),
    })).filter((cat) => cat.trainings.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, propCategories]);

  const isFiltering = query.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search trainings: try &quot;scuba&quot;, &quot;medical&quot;, &quot;aviation&quot;…"
          className="w-full rounded-2xl border border-white/8 bg-white/[0.03] py-3.5 pl-11 pr-10 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/20 focus:bg-white/[0.05]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/30 hover:text-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isFiltering && (
        <p className="text-sm text-white/35">
          {filtered.reduce((n, c) => n + c.trainings.length, 0)} training{filtered.reduce((n, c) => n + c.trainings.length, 0) !== 1 ? "s" : ""} match &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="space-y-2">
      {(isFiltering ? filtered : source).map((cat) => {
        const isCatOpen = openCategory === cat.title;
        return (
          <div key={cat.title} className="overflow-hidden rounded-2xl border border-white/8">
            {/* Category header */}
            <button
              onClick={() => {
                setOpenCategory(isCatOpen ? null : cat.title);
                setOpenTraining(null);
              }}
              className="flex w-full items-center justify-between gap-4 px-7 py-5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <div>
                <p className="text-base font-black text-white">{cat.title}</p>
                <p className="mt-0.5 text-sm text-white/40">{cat.tagline}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs text-white/25">{cat.trainings.length} training{cat.trainings.length > 1 ? "s" : ""}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-white/30 transition-transform duration-200 ${isCatOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {/* Training list */}
            {isCatOpen && (
              <div className="border-t border-white/5 bg-[#001233]">
                {cat.trainings.map((t) => {
                  const isOpen = openTraining === t.name;
                  return (
                    <div key={t.name} className="border-b border-white/5 last:border-b-0">
                      {/* Training row */}
                      <button
                        onClick={() => setOpenTraining(isOpen ? null : t.name)}
                        className="flex w-full items-center justify-between gap-4 px-7 py-4 text-left transition-colors hover:bg-white/[0.03]"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{t.name}</p>
                          <p className="mt-0.5 text-xs text-white/35">{t.location} · {t.duration}</p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-white/25 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Training detail */}
                      {isOpen && (
                        <div className="border-t border-white/5 bg-[#000d24]/60 px-7 py-6">
                          <p className="mb-6 leading-relaxed text-white/55">{t.overview}</p>

                          <div className="grid gap-6 sm:grid-cols-3">
                            <div>
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">What You Do</p>
                              <ul className="space-y-1.5">
                                {t.whatYouDo.map((item) => (
                                  <li key={item} className="flex items-start gap-2 text-sm text-white/50">
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8860B]/50" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">What You Earn</p>
                              <ul className="space-y-1.5">
                                {t.whatYouEarn.map((item) => (
                                  <li key={item} className="flex items-start gap-2 text-sm text-white/50">
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8860B]/50" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">Who It&apos;s For</p>
                              <p className="text-sm text-white/50">{t.whoItsFor}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>

      {isFiltering && filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-white/30">No trainings match &ldquo;{query}&rdquo;</p>
          <button onClick={() => setQuery("")} className="mt-3 text-sm text-[#B8860B] hover:underline">
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
