-- Alumni stories
create table if not exists public_alumni (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  years text not null,
  rank text not null,
  now_position text not null,
  detail text not null,
  trainings text[] default '{}',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table public_alumni enable row level security;
create policy "Public read alumni" on public_alumni for select using (true);
create policy "Officer manage alumni" on public_alumni for all using (auth.role() = 'authenticated');

insert into public_alumni (name, years, rank, now_position, detail, trainings, sort_order) values
  ('Michael T.', '2016 – 2020', 'Chief Petty Officer', 'U.S. Naval Academy, Class of 2026',
   'Earned his CPO rank and attended SCUBA training in Key West before receiving a nomination to the Naval Academy. Currently studying aerospace engineering.',
   array['SCUBA Diving', 'Leadership Academy', 'Naval Science'], 1),
  ('Aisha W.', '2018 – 2022', 'Petty Officer First Class', 'Boston University — Nursing, Class of 2026',
   'Completed EMT certification through Sea Cadets and attended the Medical training program at the National Naval Medical Center. Credited Sea Cadets as the reason she pursued nursing.',
   array['EMT Certification', 'Medical Training', 'Recruit Training'], 2),
  ('Devon R.', '2015 – 2019', 'Chief Petty Officer', 'U.S. Coast Guard, Active Duty',
   'Earned CPO, the highest NSCC cadet rank, in his final year. Used Sea Cadet experience to advance quickly in Coast Guard basic training. Now stationed in Boston.',
   array['Seamanship', 'Special Operations', 'Junior Officer Leadership'], 3),
  ('Priya S.', '2019 – 2023', 'Petty Officer Second Class', 'MIT — Computer Science & Engineering',
   'Participated in STEM and Cybersecurity trainings through the NSCC program. Applied to MIT with Sea Cadet rank advancement and community service record as central parts of her application.',
   array['Cybersecurity Operations', 'STEM & Robotics', 'Recruit Training'], 4);

-- FAQs
create table if not exists public_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table public_faqs enable row level security;
create policy "Public read faqs" on public_faqs for select using (true);
create policy "Officer manage faqs" on public_faqs for all using (auth.role() = 'authenticated');

insert into public_faqs (question, answer, sort_order) values
  ('Is there a cost to join?', 'Membership is free. Uniforms are provided by the unit. We never turn away a motivated cadet due to finances. Assistance is available for any program costs — just ask.', 1),
  ('Does joining commit us to military service?', 'No. Sea Cadets carries absolutely no military obligation. Our alumni go on to civilian careers, universities, and every walk of life at the same rate as those who serve.', 2),
  ('Do we need prior military or leadership experience?', 'Zero experience required. We teach everything from the ground up. Many of our strongest cadets had never touched a uniform before day one.', 3),
  ('What about homeschooled youth?', 'Absolutely welcome. For homeschooled cadets, proof of enrollment is a parent-signed letter verifying active homeschooling.', 4),
  ('Is Sea Cadets year-round?', 'Yes — we drill every second and fourth Sunday of the month. National trainings happen in summer. There is no off-season, which means consistent growth.', 5),
  ('What do I bring to the first drill?', 'Wear comfortable athletic clothing. Bring a parent or guardian on the first visit. No uniform required yet — we will walk you through that after enrollment.', 6),
  ('What if my cadet wants to stop?', 'Sea Cadets is fully voluntary. No long-term obligation. If it is not the right fit, families can withdraw at any time with no penalty.', 7),
  ('How do national trainings work?', 'Once a year, NSCC cadets select a one-week training from a national catalog — 105+ options held at real military installations across the country. Slots are filled by application.', 8);
