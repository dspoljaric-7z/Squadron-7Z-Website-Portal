import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import type { PlanOfDay, PodItem, PodCategory } from "@/types/database";

const CAT_LABEL: Record<PodCategory, string> = {
  formation: "FORMATION",
  pt: "PT",
  training: "TRAINING",
  meal: "MEAL",
  admin: "ADMIN",
  general: "GENERAL",
  side_event: "SIDE EVENT",
};

export default async function PodPrintPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const profile = await requireProfile();
  if (!profile.approved) redirect("/dashboard");

  const supabase = await createClient();
  const { data: pod } = await supabase
    .from("plan_of_day")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (!pod) {
    return (
      <html lang="en">
        <head><title>No POD Found</title></head>
        <body style={{ fontFamily: "Georgia, serif", padding: "48px", textAlign: "center" }}>
          <h2>No Plan of Day found for {date}</h2>
          <p>Return to the portal and try again.</p>
        </body>
      </html>
    );
  }

  const p = pod as PlanOfDay;
  const displayDate = (() => {
    try { return format(parseISO(date + "T12:00:00"), "EEEE, d MMMM yyyy"); }
    catch { return date; }
  })();

  const { data: settings } = await supabase.from("site_settings").select("unit_name, motto").eq("id", 1).single();
  const unitName = settings?.unit_name ?? "Squadron 7-Zulu";
  const motto = settings?.motto ?? "Honor, Courage, Commitment, Service";

  const items: PodItem[] = Array.isArray(p.items) ? p.items : [];

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>POD — {displayDate}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { background: white; color: #0a0a0a; font-family: 'Times New Roman', Times, serif; }
          body { padding: 0.75in 0.9in; font-size: 10.5pt; line-height: 1.45; }

          /* ── Print page setup ── */
          @page { size: letter portrait; margin: 0.6in 0.8in; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }

          /* ── Print button (screen only) ── */
          .print-btn {
            display: flex; align-items: center; gap: 8px;
            position: fixed; top: 16px; right: 16px;
            background: #003087; color: white;
            border: none; border-radius: 8px;
            padding: 10px 18px; font-size: 13px; font-family: system-ui, sans-serif;
            cursor: pointer; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,.18);
            z-index: 100;
          }
          .print-btn:hover { background: #002266; }

          /* ── Document header ── */
          .doc-header { border-top: 3px solid #003087; border-bottom: 1px solid #003087; padding: 10pt 0 8pt; margin-bottom: 16pt; }
          .unit-name { font-size: 13pt; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; color: #003087; }
          .doc-title { font-size: 22pt; font-weight: bold; letter-spacing: 0.04em; text-transform: uppercase; margin: 2pt 0; }
          .doc-date { font-size: 11pt; color: #444; }
          .doc-meta { display: flex; gap: 20pt; margin-top: 6pt; font-size: 9pt; color: #555; }
          .doc-meta span { display: flex; align-items: center; gap: 4pt; }

          /* ── Sections ── */
          .section { margin-bottom: 14pt; page-break-inside: avoid; }
          .section-header {
            display: flex; align-items: center; gap: 6pt;
            border-bottom: 1.5px solid #003087; padding-bottom: 3pt; margin-bottom: 7pt;
            font-size: 9pt; font-weight: bold; text-transform: uppercase;
            letter-spacing: 0.1em; color: #003087;
          }
          .section-num {
            display: inline-flex; align-items: center; justify-content: center;
            width: 16pt; height: 16pt; border-radius: 50%;
            background: #003087; color: white; font-size: 8pt; font-weight: bold;
            flex-shrink: 0;
          }
          .section-body { font-size: 10.5pt; }

          /* ── Schedule table ── */
          .schedule-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          .schedule-table th {
            text-align: left; padding: 4pt 6pt; border-bottom: 1.5px solid #003087;
            text-transform: uppercase; font-size: 8pt; letter-spacing: 0.06em; color: #003087; font-weight: bold;
          }
          .schedule-table td { padding: 4pt 6pt; border-bottom: 1px solid #ddd; vertical-align: top; }
          .schedule-table tr:last-child td { border-bottom: none; }
          .schedule-table .time-col { font-family: 'Courier New', monospace; font-weight: bold; white-space: nowrap; }
          .cat-badge {
            display: inline-block; font-size: 7pt; font-weight: bold;
            padding: 1pt 4pt; border-radius: 2pt; letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .cat-formation { background: #dce9ff; color: #003087; }
          .cat-training  { background: #dbeafe; color: #1e40af; }
          .cat-meal      { background: #dcfce7; color: #166534; }
          .cat-admin     { background: #fef9c3; color: #854d0e; }
          .cat-general   { background: #f3f4f6; color: #374151; }

          /* ── Watch bill ── */
          .watch-bill { font-family: 'Courier New', monospace; font-size: 9.5pt; white-space: pre-wrap; }

          /* ── Safety brief ── */
          .safety-box { background: #fffbeb; border-left: 3px solid #d97706; padding: 6pt 10pt; border-radius: 2pt; white-space: pre-wrap; }

          /* ── Approval block ── */
          .approval-block { margin-top: 18pt; padding-top: 10pt; border-top: 1px solid #aaa; display: flex; gap: 40pt; }
          .sig-line { flex: 1; }
          .sig-rule { border-top: 1px solid #000; padding-top: 3pt; font-size: 9pt; color: #444; }
          .sig-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }

          /* ── Footer ── */
          .doc-footer {
            margin-top: 16pt; padding-top: 6pt; border-top: 1px solid #bbb;
            font-size: 8pt; color: #888; display: flex; justify-content: space-between;
          }
        `}</style>
        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('load', () => { if (document.referrer.includes('/pod')) window.print(); })` }} />
      </head>
      <body>
        {/* Print button (screen only) */}
        <button className="print-btn no-print" dangerouslySetInnerHTML={{ __html: '' }} />
        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.print-btn').onclick = () => window.print();
          document.querySelector('.print-btn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg> Print / Save as PDF';
        ` }} />

        {/* Document header */}
        <div className="doc-header">
          <div className="unit-name">{unitName}</div>
          <div className="doc-title">Plan of the Day</div>
          <div className="doc-date">{displayDate}</div>
          <div className="doc-meta">
            {p.officer_in_charge_name && (
              <span><strong>OIC:</strong> {p.officer_in_charge_name}</span>
            )}
            {p.status === "approved" && p.approved_by_name && (
              <span><strong>Approved by:</strong> {p.approved_by_name}</span>
            )}
            {p.status === "approved" && p.approved_at && (
              <span><strong>Approved:</strong> {format(new Date(p.approved_at), "d MMM yyyy HHmm")}Z</span>
            )}
          </div>
        </div>

        {/* Training Objective */}
        {p.training_objective && (
          <div className="section">
            <div className="section-header">
              <span className="section-num">1</span> Training Objective
            </div>
            <div className="section-body">{p.training_objective}</div>
          </div>
        )}

        {/* Uniform */}
        {p.uniform_of_day && (
          <div className="section">
            <div className="section-header">
              <span className="section-num">2</span> Uniform of the Day
            </div>
            <div className="section-body"><strong>{p.uniform_of_day}</strong></div>
          </div>
        )}

        {/* Special Events */}
        {p.special_events && (
          <div className="section">
            <div className="section-header">
              <span className="section-num">3</span> Special Events / Announcements
            </div>
            <div className="section-body" style={{ whiteSpace: "pre-wrap" }}>{p.special_events}</div>
          </div>
        )}

        {/* Safety Brief */}
        {p.safety_brief && (
          <div className="section">
            <div className="section-header">
              <span className="section-num">4</span> Safety Brief
            </div>
            <div className="safety-box">{p.safety_brief}</div>
          </div>
        )}

        {/* Schedule */}
        {items.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-num">5</span> Schedule of Events
            </div>
            <table className="schedule-table">
              <thead>
                <tr>
                  <th style={{ width: "56pt" }}>Time</th>
                  <th>Evolution / Activity</th>
                  <th style={{ width: "90pt" }}>Location</th>
                  <th style={{ width: "70pt" }}>Category</th>
                  <th style={{ width: "110pt" }}>Responsible</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id ?? idx}>
                    <td className="time-col">{item.time || "—"}</td>
                    <td>{item.activity}</td>
                    <td>{item.location || "—"}</td>
                    <td>
                      <span className={`cat-badge cat-${item.category}`}>
                        {CAT_LABEL[item.category]}
                      </span>
                    </td>
                    <td>{item.responsible_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Watch Bill */}
        {p.watch_bill && (
          <div className="section">
            <div className="section-header">
              <span className="section-num">6</span> Watch Bill
            </div>
            <div className="watch-bill">{p.watch_bill}</div>
          </div>
        )}

        {/* Notes */}
        {p.notes && (
          <div className="section">
            <div className="section-header">
              <span className="section-num">7</span> Additional Orders / Notes
            </div>
            <div className="section-body" style={{ whiteSpace: "pre-wrap" }}>{p.notes}</div>
          </div>
        )}

        {/* Approval signature block */}
        <div className="approval-block">
          <div className="sig-line">
            <div className="sig-rule">{p.approved_by_name ?? " "}</div>
            <div className="sig-label">Commanding Officer / OIC</div>
          </div>
          <div className="sig-line">
            <div className="sig-rule">&nbsp;</div>
            <div className="sig-label">Date / Time</div>
          </div>
          <div className="sig-line">
            <div className="sig-rule">&nbsp;</div>
            <div className="sig-label">Signature</div>
          </div>
        </div>

        {/* Footer */}
        <div className="doc-footer">
          <span>UNCLASSIFIED — FOR OFFICIAL UNIT USE ONLY</span>
          <span>{unitName} · {motto}</span>
          <span>Generated {format(new Date(), "d MMM yyyy")}</span>
        </div>
      </body>
    </html>
  );
}
