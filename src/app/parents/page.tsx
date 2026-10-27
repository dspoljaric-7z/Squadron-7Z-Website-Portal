import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, ShieldCheck, GraduationCap } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";

const TESTIMONIALS = [
  {
    quote: "It makes my cadet more independent and more organized than before.",
    name: "Yanping X.",
    role: "Parent, NLCC cadet",
  },
  {
    quote: "I can't even begin to tell you the confidence my son has gained. I truly believe this program is 99% responsible for that.",
    name: "Jamie G.",
    role: "Parent, NSCC cadet",
  },
  {
    quote: "My son has matured so much since he joined. It gave him purpose — he learned discipline, organization, punctuality, and real appreciation for what he has.",
    name: "Diana R.",
    role: "Parent, NSCC cadet",
  },
  {
    quote: "I've watched my cadet grow into a leader. Whether or not they pursue a military career, the lessons will benefit them for a lifetime.",
    name: "Madeline F.",
    role: "Parent, NSCC cadet",
  },
];

const FIRST_DRILL = [
  {
    time: "8:45 AM",
    what: "Arrive at the Navy Operational Support Center, 100 Quincy Shore Drive. Check in with the Yeoman at the front desk — they will have your paperwork ready if you expressed interest ahead of time, or will hand you the enrollment forms on the spot.",
  },
  {
    time: "9:00 AM",
    what: "Morning muster. Cadets fall in by division and the unit comes to order. Your child will observe or stand alongside their assigned sponsor cadet. You can watch from the side.",
  },
  {
    time: "9:15–11:30 AM",
    what: "Drill blocks. Cadets rotate through instruction: seamanship basics, military customs, physical training, and often a specialty skill session. New cadets are paired with an experienced cadet throughout.",
  },
  {
    time: "11:30 AM–12:30 PM",
    what: "Lunch break. A good time to meet other parents and talk with the officers on staff. Questions about enrollment, uniforms, cost, or anything else are welcome here.",
  },
  {
    time: "12:30–2:45 PM",
    what: "Afternoon drill blocks. Team activities, leadership exercises, or a guest instructor if one is scheduled. Senior cadets often lead segments of this block.",
  },
  {
    time: "3:00 PM",
    what: "End of drill muster, dismissal. Officers are available for brief conversations. If you have enrollment paperwork ready, the Yeoman can collect it now.",
  },
];

const FAQS = [
  {
    section: "Getting Started",
    items: [
      {
        q: "Does my child have to join the military after Sea Cadets?",
        a: "No. Sea Cadets is a civilian youth program with no military obligation, now or ever. Most alumni go on to colleges and civilian careers. The rank, certifications, and habits they build carry into whatever they do next.",
      },
      {
        q: "What ages can join?",
        a: "The Navy League Cadet Corps (NLCC) is for youth ages 10 through 8th grade. The Naval Sea Cadet Corps (NSCC) is for 9th grade through age 18. There is no requirement to have been an NLCC cadet first — students can join the NSCC directly in high school. Rising 8th graders may join the NSCC after March 1 of their 8th grade year so they can attend summer training.",
      },
      {
        q: "Do I need to prepare or buy anything before the first drill?",
        a: "Nothing. Come as you are. Wear comfortable athletic clothing, bring a water bottle, and have your child eat breakfast before arriving — it is a long day. Uniforms are issued after enrollment is complete. The Yeoman handles all paperwork in person.",
      },
      {
        q: "Can we come to observe before committing?",
        a: "Yes, and we encourage it. Reach out before your first visit so we can be ready for you — email us or fill out the interest form on the Join page. You are welcome to stay for the full drill, talk with staff and other parents, and watch your child participate. Most families know within a drill or two whether this is the right fit.",
      },
    ],
  },
  {
    section: "Cost & Uniforms",
    items: [
      {
        q: "What does it cost to join?",
        a: "Annual membership is $375 for new cadets and $250 to renew. Siblings get a reduced rate ($250 new, $125 renewal). There are no monthly dues. Uniforms (the Navy Working Uniform, NWU) are provided by the unit at no cost. Annual national training runs about $300 per week — that covers program fees, lodging, and meals; travel to the training site is separate. Sea Cadets receives federal funding to help keep these costs down. No cadet is turned away for financial reasons.",
      },
      {
        q: "What uniform does my child need?",
        a: "Uniforms are provided by the unit after enrollment. New cadets receive the Navy Working Uniform (NWU camouflage utility uniform) at no cost. Dress uniforms are issued as cadets advance in rank. Our Yeoman manages uniform fitting and issuance.",
      },
      {
        q: "Is the national training trip required?",
        a: "It is strongly encouraged but not mandatory. The national training is where many cadets have their most formative experiences — it is a week at a real military installation doing hands-on work in aviation, SCUBA, medicine, special operations, or one of 100+ other programs. Cadets who attend consistently say it is the highlight of their time in Sea Cadets.",
      },
    ],
  },
  {
    section: "Schedule & Commitment",
    items: [
      {
        q: "How often does the unit meet?",
        a: "Drills are every 2nd and 4th Sunday of the month, 9:00 AM to 3:00 PM, at the Navy Operational Support Center in Quincy. That is the core commitment — roughly two Sundays per month. Occasional additional events (community service, unit activities) may come up, but those are optional.",
      },
      {
        q: "What happens during a drill day?",
        a: "Morning muster, PT, instruction blocks, lunch, afternoon activities. Senior cadets run segments under officer supervision. Cadets are accountable for their own performance — it is a real day, not a hangout.",
      },
      {
        q: "What if my child misses a drill?",
        a: "Life happens and we work with families. Missing an occasional drill is understood. Attendance is tracked because it affects rank advancement and eligibility for training programs and leadership billets. Consistent attendance is what makes the program work for your cadet and for the unit.",
      },
      {
        q: "My child is already in sports or other activities. Can they still participate?",
        a: "Two Sundays a month is a manageable commitment for most active teenagers. Most cadets balance Sea Cadets alongside sports, school activities, and jobs. When a major conflict comes up, we work with families on scheduling.",
      },
    ],
  },
  {
    section: "Safety & Supervision",
    items: [
      {
        q: "Who supervises my child at drills?",
        a: "Drills are run by adult commissioned officers — mostly Navy and Coast Guard veterans and trained civilians — who have passed background checks through the Navy League of the United States. Senior cadet NCOs assist with instruction and mentoring under adult supervision at all times.",
      },
      {
        q: "What background checks are required for officers?",
        a: "All adult officers and volunteers undergo background checks through the Navy League before they are permitted to work with cadets. Background checks are renewed regularly. Sea Cadets follows national youth protection guidelines, and no adult is alone with a cadet.",
      },
      {
        q: "Are the national training programs safe?",
        a: "National trainings are conducted by active-duty military and Sea Cadet staff at accredited military installations. All programs require appropriate safety certifications, briefings, and adult supervision ratios. Thousands of cadets attend these programs annually without incident.",
      },
      {
        q: "Are parents allowed at drills?",
        a: "Parents are welcome to attend and observe. We ask that you let cadets operate independently during the drill — part of the value is that they are responsible for themselves in a structured environment. Staff are available to talk before and after drill.",
      },
      {
        q: "My child has a disability or medical condition. Can they still participate?",
        a: "Yes. Talk to our officers before the first drill so we can be ready. We make accommodations for cadets with disabilities and want to find a way to make it work.",
      },
    ],
  },
  {
    section: "College & Career",
    items: [
      {
        q: "How does Sea Cadets help with college applications?",
        a: "Sea Cadets builds a concrete record. Rank advancement demonstrates sustained commitment and leadership over years — not a one-time activity. Certifications earned through national trainings (CPR, EMT, FAA Ground School, SCUBA, and others) are real credentials. Community service hours are documented. For military academy applications (Annapolis, West Point, Coast Guard Academy), Sea Cadet experience is viewed favorably and congressional nomination officers are aware of it.",
      },
      {
        q: "Are there scholarships available?",
        a: "Yes. The Navy League of the United States awards scholarships to Sea Cadets annually. Several scholarship programs specifically recognize cadet achievement and service. Our officers can point you toward current scholarship opportunities as your child progresses through the program.",
      },
      {
        q: "My child is not interested in the military at all. Is this still worth it?",
        a: "Most of our cadets do not end up serving, and that is fine. The rank record, certifications, and experience leading a team are useful whether your child goes to college, trade school, or straight into work. Most high schoolers never get that kind of responsibility.",
      },
    ],
  },
];

export default async function ParentsPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">For Parents & Guardians</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            What you need<br />to know.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/55">
            Parents are usually the ones deciding if this is the right fit. Here is the full picture — schedule, cost, safety, and what your child actually gets out of it.
          </p>
        </div>
      </section>

      {/* Quick facts */}
      <div className="border-b border-white/5 px-6 py-10 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            {[
              { label: "No military obligation", sub: "Now or ever" },
              { label: "Ages 10–18", sub: "NLCC & NSCC tracks" },
              { label: "2 Sundays/month", sub: "9 AM – 3 PM" },
              { label: "$375 new · $250 renewal", sub: "Uniforms provided" },
            ].map((f) => (
              <div key={f.label} className="border-l border-[#B8860B]/40 pl-4">
                <p className="font-bold text-white">{f.label}</p>
                <p className="mt-0.5 text-sm text-white/35">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What to expect section */}
      <section className="px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[#B8860B]" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">First Visit</p>
          </div>
          <h2 className="mb-3 text-4xl font-black text-white sm:text-5xl">Your first drill,<br />step by step.</h2>
          <p className="mb-12 max-w-xl text-lg text-white/50">
            Drills run every 2nd and 4th Sunday, 9 AM to 3 PM, at the Navy Operational Support Center in Quincy. Here is what to expect.
          </p>

          <div className="space-y-0">
            {FIRST_DRILL.map((step, i) => (
              <div key={step.time} className={`grid grid-cols-[80px_1fr] gap-6 py-6 ${i < FIRST_DRILL.length - 1 ? "border-b border-white/5" : ""}`}>
                <div className="pt-0.5">
                  <p className="text-sm font-black text-[#B8860B]">{step.time}</p>
                </div>
                <p className="leading-relaxed text-white/60">{step.what}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#B8860B]" />
            <div>
              <p className="font-bold text-white">Navy Operational Support Center</p>
              <p className="mt-1 text-sm text-white/50">100 Quincy Shore Drive, Quincy, MA 02169</p>
              <a
                href="https://maps.google.com/?q=100+Quincy+Shore+Drive+Quincy+MA+02169"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8860B] hover:underline"
              >
                Get directions <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* College / career callout */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-[#B8860B]" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">College & Beyond</p>
          </div>
          <h2 className="mb-6 text-3xl font-black text-white sm:text-4xl">What this looks like on a college application.</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { label: "Rank advancement", desc: "A promotion record that spans years — colleges and recruiters can see your child earned rank over time, not just showed up." },
              { label: "Earned certifications", desc: "CPR, EMT, FAA Ground School, SCUBA, cybersecurity — credentials with your name on them from programs that actually certify you." },
              { label: "Documented service hours", desc: "Community service is tracked and recorded through the unit. Sea Cadets log more service hours than most school clubs." },
              { label: "Military academy edge", desc: "For applications to Annapolis, West Point, and the Coast Guard Academy, Sea Cadet experience is recognized and referenced by congressional nomination officers." },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
                <p className="mb-2 font-bold text-white">{item.label}</p>
                <p className="text-sm leading-relaxed text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#B8860B]" />
              <p className="text-sm leading-relaxed text-white/55">
                <strong className="text-white/80">My child has no interest in the military.</strong> That is fine and pretty common here. The record, the certifications, and the experience of being accountable for a team matter for civilian schools and careers just as much. Most of our alumni do not serve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Parent testimonials */}
      <section className="px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">From Other Parents</p>
          <h2 className="mb-12 text-3xl font-black text-white sm:text-4xl">What families say.</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/8 bg-white/[0.02] p-7">
                <blockquote className="mb-5 leading-relaxed text-white/65">&ldquo;{t.quote}&rdquo;</blockquote>
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs text-white/30">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">FAQ</p>
          <h2 className="mb-12 text-3xl font-black text-white sm:text-4xl">Common parent questions.</h2>
          <div className="space-y-16">
            {FAQS.map((section) => (
              <div key={section.section}>
                <h3 className="mb-8 text-xl font-black text-white">{section.section}</h3>
                <div className="space-y-6">
                  {section.items.map((item) => (
                    <div key={item.q} className="border-b border-white/5 pb-6">
                      <h4 className="mb-3 font-bold text-white">{item.q}</h4>
                      <p className="leading-relaxed text-white/55">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-3xl font-black text-white">Come see us on a drill Sunday.</h2>
          <p className="mb-8 max-w-xl text-lg text-white/50">
            Reach out before your first visit so we can be ready for you — email us or fill out the interest form. Every 2nd and 4th Sunday, 9 AM to 3 PM, Quincy, MA.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/join"
              className="rounded-full bg-[#B8860B] px-8 py-3.5 text-base font-bold text-white transition-all hover:bg-[#9a7009]"
            >
              Enrollment Info
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/5"
            >
              Contact Us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
