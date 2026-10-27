import { requireProfile } from "@/lib/profile";
import { isStaff } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { BookOpen, Users, ClipboardCheck, Megaphone, Shield, Settings, Key, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default async function GuidePage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[#003087]" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Guide</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Plain-English instructions for common portal tasks. Bookmark this page.
        </p>
      </div>

      <Section icon={Users} title="Managing Roster Members">
        <Step n={1} title="Adding a new member">
          Go to <strong>Settings → Admin tab</strong>. Under &quot;Invite Member,&quot; enter their email, full name, rank, and role. Click <em>Send Invite</em>. They will receive an email with a link to set their password and log in. Their account will show as <em>pending</em> on the Admin page until they complete setup.
        </Step>
        <Step n={2} title="Activating a pending account">
          On the Admin page, find the cadet under the <em>Pending</em> list. Click <strong>Activate</strong> — this sends them a one-time setup link. Once they click it and set a password, their account becomes active and they appear in the roster.
        </Step>
        <Step n={3} title="Editing rank, billet, or division">
          Officers can edit any cadet from the <strong>Roster</strong> (click a name to open their detail sheet, then View Full Profile) or from the <strong>Admin</strong> page. SNCOs and NCOs can update rank and billet within their own division.
        </Step>
        <Step n={4} title="Deactivating or removing a member">
          On the Admin page, find the cadet and click <strong>Deactivate</strong> (suspends access) or <strong>Delete</strong> (permanent — use carefully). Deactivated members remain in the DB for record-keeping.
        </Step>
      </Section>

      <Section icon={ClipboardCheck} title="Running a Drill">
        <Step n={1} title="Creating the drill session">
          Go to <strong>Calendar</strong> and click <strong>+ New Event</strong>. Set the type to <em>Drill</em>. This automatically creates a matching drill session. Alternatively, open the <strong>Drill Muster</strong> page and use the drill selector at the top to find an existing session.
        </Step>
        <Step n={2} title="Pre-logging expected visitors">
          Before the drill, open the drill session from the <strong>Drill Muster</strong> page and go to the <strong>Muster</strong> tab. Under &quot;Expected Visitors,&quot; click <em>Pre-log a visitor</em> and enter their name and unit. They will appear as pre-logged when they arrive.
        </Step>
        <Step n={3} title="Taking muster">
          On the <strong>Muster</strong> tab, mark each cadet as Present, Late, Excused, or Absent using the buttons next to their name. Changes save instantly.
        </Step>
        <Step n={4} title="Logging visitors">
          Under the <strong>Visitors</strong> tab during the drill, enter walk-in visitor names. Pre-logged visitors are already listed and just need status confirmation.
        </Step>
        <Step n={5} title="Writing a debrief">
          After the drill, open the session and go to the <strong>Debrief</strong> tab. Write post-drill notes (what went well, issues, follow-ups) and click Save. These notes are stored with the drill record.
        </Step>
      </Section>

      <Section icon={Megaphone} title="Posting Announcements">
        <Step n={1} title="Creating an announcement">
          Go to <strong>Announcements</strong> and click <strong>+ New Announcement</strong>. Write a title and body. Set the <em>Audience</em> to control who sees it: Everyone, Officers &amp; SNCOs only, NCOs+, or Cadets only.
        </Step>
        <Step n={2} title="Pinning an announcement">
          Check the <em>Pin to top</em> box when creating or editing — pinned announcements stay above the regular feed so important notices are not buried.
        </Step>
        <Step n={3} title="Editing or deleting">
          Click the pencil icon on any announcement you authored (or any announcement if you are an officer). Announcements can be unpinned, edited, or deleted at any time.
        </Step>
      </Section>

      <Section icon={Shield} title="Discipline & PIPs">
        <Step n={1} title="Filing a correction">
          Go to <strong>Discipline</strong> and click <strong>New Correction</strong>. Select the cadet, describe the issue, set severity (minor / moderate / major), and submit. The cadet is notified.
        </Step>
        <Step n={2} title="Resolving a correction">
          Open the correction and click <strong>Resolve</strong>. You must enter resolution notes explaining the outcome before the button activates. The timestamp and notes are stored with the record.
        </Step>
        <Step n={3} title="Opening a PIP">
          From the Discipline page, click <strong>New PIP</strong> for a cadet. Set the PIP reason, goals, and target date. The cadet can view it in their My Record page.
        </Step>
        <Step n={4} title="Closing a PIP">
          Open the PIP and click <strong>Close PIP</strong>. Enter notes about the outcome. The cadet will receive a notification and must acknowledge the close-out in the portal. To fail a PIP instead, use the <strong>Mark as Failed</strong> option and enter failure notes.
        </Step>
      </Section>

      <Section icon={Key} title="Permissions & Access Control">
        <Step n={1} title="Granting portal access flags">
          Go to <strong>Access Control</strong> (command-only). Find the member and toggle the permissions they should have: Drill management, Discipline, Advancement, Recruiting, Ideas. These are additive — a cadet can be given drill access without changing their role.
        </Step>
        <Step n={2} title="Promoting to a staff role">
          Change a member&apos;s role on the Admin page (officer-only). Roles: Cadet → NCO → SNCO → Officer. Each role automatically gains the permissions of roles below it.
        </Step>
        <Step n={3} title="Removing access quickly">
          Use <strong>Deactivate</strong> on the Admin page to immediately suspend portal login without deleting records.
        </Step>
      </Section>

      <Section icon={Settings} title="Portal Configuration">
        <Step n={1} title="Editing unit name & drill location default">
          Go to <strong>Settings → Unit Settings</strong> (command-only). Update the unit name, number, default drill location, motto, and contact info. These display throughout the portal.
        </Step>
        <Step n={2} title="Customizing email notification text">
          Go to <strong>Settings → Email Templates</strong> (officer-only). Each automated email (drill reminders, invites, etc.) has a title and body you can customize. Use the <code>{"{variable}"}</code> placeholders shown to insert dynamic content.
        </Step>
        <Step n={3} title="Managing qualification types">
          Go to <strong>Settings → Admin tab → Qualification Types</strong>. Add new qual types or deactivate ones no longer in use. SNCOs can also do this.
        </Step>
        <Step n={4} title="Recurring events">
          When creating a calendar event, expand the <em>Repeat</em> section and choose Weekly or Monthly. Set an end date or leave blank to generate a year of instances automatically. Each instance is independent — editing one does not affect others.
        </Step>
      </Section>

      <Card className="border-[#003087]/20 bg-[#003087]/5 p-4">
        <p className="text-sm font-semibold text-[#003087]">Need to make a code change or deploy an update?</p>
        <p className="mt-1 text-sm text-gray-600">
          See the <strong>HANDOFF.md</strong> file in the project root. It covers Vercel, Supabase, how to deploy, and who to contact if something breaks.
        </p>
        <a
          href="https://github.com"
          className="mt-2 inline-flex items-center gap-1 text-xs text-[#003087] hover:underline"
        >
          Project source code <ChevronRight className="h-3 w-3" />
        </a>
      </Card>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <Icon className="h-4 w-4 text-[#003087]" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#003087]/10 text-xs font-bold text-[#003087]">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
