import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Squadron 7-Zulu",
  description: "Privacy policy for the Squadron 7-Zulu website and cadet portal.",
};

const EFFECTIVE_DATE = "October 11, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      <section className="border-b border-white/5 bg-[#001233] px-6 py-16 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Legal</p>
          <h1 className="text-4xl font-black text-white sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-white/40">Effective {EFFECTIVE_DATE}</p>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-3xl space-y-12 text-white/65">

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Who we are</h2>
            <p className="leading-relaxed">
              Squadron 7-Zulu is a unit of the U.S. Naval Sea Cadet Corps (NSCC) and Navy League Cadet Corps (NLCC),
              sponsored by the Navy League of the United States. This privacy policy covers the public website at
              sq7-portal.vercel.app and the cadet management portal used by enrolled cadets and unit officers.
            </p>
            <p className="mt-4 leading-relaxed">
              Questions about this policy can be directed to unit staff via the <Link href="/contact" className="text-[#B8860B] hover:underline">contact form</Link>.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Information we collect</h2>
            <div className="space-y-5">
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <p className="mb-2 font-bold text-white">Enrollment interest form</p>
                <p className="text-sm leading-relaxed">
                  When a parent or guardian submits an enrollment inquiry through the Join page, we collect the
                  prospective cadet&apos;s first and last name, date of birth, grade, school, and city, along with the
                  parent or guardian&apos;s name, email address, phone number, and relationship to the cadet. This
                  information is used solely to follow up about enrollment. We do not share it with third parties.
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <p className="mb-2 font-bold text-white">Contact form</p>
                <p className="text-sm leading-relaxed">
                  The contact form collects your name, email address, optional phone number, and your message. This
                  information is stored in our database and used to respond to your inquiry. We retain contact
                  submissions for up to 12 months.
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <p className="mb-2 font-bold text-white">Cadet portal accounts</p>
                <p className="text-sm leading-relaxed">
                  Enrolled cadets and officers access a private portal with accounts managed through Supabase Auth.
                  The portal stores cadet profiles including name, rank, attendance records, advancement history,
                  division assignment, and documents relevant to program participation. This information is accessible
                  only to the cadet (their own record), their parent or guardian (where applicable), and unit officers.
                  It is not publicly accessible.
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <p className="mb-2 font-bold text-white">Server logs and IP addresses</p>
                <p className="text-sm leading-relaxed">
                  Form submissions include an IP address hash used only for rate limiting (to prevent spam). IP hashes
                  are not used to identify individuals, are not linked to profiles, and are not shared. They are
                  retained for 30 days.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Children&apos;s privacy (COPPA)</h2>
            <p className="leading-relaxed">
              Our program serves youth ages 10–18. We take the privacy of minors seriously. Enrollment information
              submitted through the Join page is submitted by a parent or legal guardian on behalf of a minor and is
              handled accordingly. We do not knowingly collect personal information directly from children under 13
              without verifiable parental consent.
            </p>
            <p className="mt-4 leading-relaxed">
              Cadet portal accounts for minors are created by unit staff at the time of enrollment, not by the minor
              directly. Account access for active cadets under 18 may be reviewed by their parent or guardian upon
              request to unit staff.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">How we use your information</h2>
            <ul className="space-y-2 text-sm leading-relaxed">
              {[
                "To respond to enrollment inquiries and contact form submissions",
                "To manage cadet records, attendance, rank advancement, and program participation",
                "To communicate with cadets and families about drill schedules, events, and unit news",
                "To prevent spam and abuse on public forms",
                "We do not use your information for advertising, marketing to third parties, or any commercial purpose",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8860B]/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Data sharing</h2>
            <p className="leading-relaxed">
              We do not sell, rent, or share personal information with third parties for their own purposes. Data is
              stored using Supabase (a U.S.-based cloud database provider) and served via Vercel (a U.S.-based hosting
              provider). Both are subject to their own privacy policies and security practices. Unit officers access
              cadet data through the portal in the course of their responsibilities.
            </p>
            <p className="mt-4 leading-relaxed">
              In cases where national-level NSCC or Navy League reporting is required (e.g., for training registration
              or awards), relevant cadet information may be shared with those organizations consistent with program
              requirements. We will inform families when this applies.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Data retention</h2>
            <ul className="space-y-2 text-sm leading-relaxed">
              {[
                "Enrollment inquiry submissions: retained until enrollment is complete or 6 months after submission, whichever is sooner",
                "Contact form submissions: 12 months",
                "IP hash rate-limit logs: 30 days",
                "Active cadet portal records: retained for the duration of enrollment and up to 3 years after separation",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8860B]/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Your rights</h2>
            <p className="leading-relaxed">
              You may request access to, correction of, or deletion of personal information we hold about you or your
              child by contacting unit staff through the <Link href="/contact" className="text-[#B8860B] hover:underline">contact form</Link>.
              We will respond within a reasonable timeframe. Deletion of a cadet&apos;s portal account will be handled
              upon disenrollment or at the parent&apos;s written request.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Security</h2>
            <p className="leading-relaxed">
              All data is transmitted over HTTPS. The cadet portal uses authenticated access with row-level security
              enforced at the database level — officers and cadets can only access records they are authorized to view.
              We apply reasonable technical measures to protect information from unauthorized access. No system is
              perfectly secure; if you believe there has been a breach or unauthorized access to your data, contact us
              immediately.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-black text-white">Changes to this policy</h2>
            <p className="leading-relaxed">
              We may update this policy as the program or technology changes. The effective date at the top of this
              page reflects the most recent revision. Material changes will be communicated to enrolled families.
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <p className="font-bold text-white">Questions?</p>
            <p className="mt-2 text-sm leading-relaxed">
              Reach out through our <Link href="/contact" className="text-[#B8860B] hover:underline">contact form</Link> or
              speak with a unit officer at any drill. 2nd &amp; 4th Sunday · 9 AM – 3 PM · 100 Quincy Shore Drive, Quincy MA.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
