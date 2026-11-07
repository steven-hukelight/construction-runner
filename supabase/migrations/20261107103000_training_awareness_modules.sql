-- Training: awareness videos with a five-question quiz, face fit records, and dated
-- campaign cards. Official films stay on the publisher's site as a link.
-- Every read and write goes through the admin API with the service role.

create table public.training_modules (
  id text primary key,
  kind text not null default 'video' check (kind in ('video', 'record')),
  title text not null,
  summary text not null default '',
  minutes integer check (minutes is null or minutes between 1 and 60),
  sort_order integer not null default 0,
  video_path text,
  external_url text check (external_url is null or external_url ~* '^https://'),
  external_publisher text,
  external_acknowledgement text,
  min_watch_seconds integer check (min_watch_seconds is null or min_watch_seconds between 10 and 3600),
  pass_mark integer not null default 4 check (pass_mark between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.training_modules.video_path is
  'Our own video in the private training-videos bucket. Played from a short-lived signed URL.';
comment on column public.training_modules.external_url is
  'Publisher page (for example HSE). Opened in the browser, never copied into our bucket.';
comment on column public.training_modules.min_watch_seconds is
  'Shortest time between starting and finishing the video before the quiz unlocks.';

create table public.training_questions (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.training_modules(id) on delete cascade,
  sort_order integer not null,
  stem text not null,
  options jsonb not null,
  correct_index smallint not null check (correct_index between 0 and 2),
  constraint training_questions_three_options check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 3),
  constraint training_questions_order unique (module_id, sort_order)
);

create table public.company_training_modules (
  company_id text not null,
  module_id text not null references public.training_modules(id) on delete cascade,
  enabled boolean not null default true,
  refresh_months integer default 12 check (refresh_months is null or refresh_months between 1 and 60),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null,
  primary key (company_id, module_id)
);

create table public.training_video_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id text not null,
  module_id text not null references public.training_modules(id) on delete cascade,
  source text not null check (source in ('bucket', 'external')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint training_video_views_complete_after_start check (completed_at is null or completed_at >= started_at)
);

create index idx_training_video_views_user_module on public.training_video_views (user_id, module_id, started_at desc);

create table public.training_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id text not null,
  module_id text not null references public.training_modules(id) on delete cascade,
  view_id uuid references public.training_video_views(id) on delete set null,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index idx_training_attempts_user_module on public.training_attempts (user_id, module_id, submitted_at desc);
create index idx_training_attempts_company on public.training_attempts (company_id, submitted_at desc);

create table public.face_fit_tests (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  tested_at date not null,
  review_due_at date not null,
  result text not null check (result in ('pass', 'fail')),
  method text not null check (method in ('qualitative', 'quantitative')),
  mask_make text not null,
  mask_model text not null,
  mask_size text,
  tester_name text not null,
  certificate_path text,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  constraint face_fit_tests_review_after_test check (review_due_at >= tested_at)
);

create index idx_face_fit_tests_user on public.face_fit_tests (user_id, tested_at desc);
create index idx_face_fit_tests_company_review on public.face_fit_tests (company_id, review_due_at);

create table public.training_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  title text not null,
  summary text,
  url text not null check (url ~* '^https://'),
  publisher text,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  constraint training_campaigns_dates check (ends_on >= starts_on)
);

create index idx_training_campaigns_company_dates on public.training_campaigns (company_id, ends_on desc);

create table public.training_campaign_acks (
  campaign_id uuid not null references public.training_campaigns(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

alter table public.safety_alerts add column if not exists source_url text;
alter table public.safety_alerts add column if not exists source_name text;
alter table public.briefings add column if not exists video_url text;

comment on column public.safety_alerts.source_url is 'Official page the alert came from, for example an HSE safety bulletin.';
comment on column public.briefings.video_url is 'Toolbox talk video on the publisher''s player. Not copied into storage.';

alter table public.training_modules enable row level security;
alter table public.training_questions enable row level security;
alter table public.company_training_modules enable row level security;
alter table public.training_video_views enable row level security;
alter table public.training_attempts enable row level security;
alter table public.face_fit_tests enable row level security;
alter table public.training_campaigns enable row level security;
alter table public.training_campaign_acks enable row level security;

revoke all on public.training_modules from anon, authenticated;
revoke all on public.training_questions from anon, authenticated;
revoke all on public.company_training_modules from anon, authenticated;
revoke all on public.training_video_views from anon, authenticated;
revoke all on public.training_attempts from anon, authenticated;
revoke all on public.face_fit_tests from anon, authenticated;
revoke all on public.training_campaigns from anon, authenticated;
revoke all on public.training_campaign_acks from anon, authenticated;

grant select, insert, update, delete on public.training_modules to service_role;
grant select, insert, update, delete on public.training_questions to service_role;
grant select, insert, update, delete on public.company_training_modules to service_role;
grant select, insert, update, delete on public.training_video_views to service_role;
grant select, insert, update, delete on public.training_attempts to service_role;
grant select, insert, update, delete on public.face_fit_tests to service_role;
grant select, insert, update, delete on public.training_campaigns to service_role;
grant select, insert, update, delete on public.training_campaign_acks to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('training-videos', 'training-videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('face-fit-certificates', 'face-fit-certificates', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage policies for anon or authenticated: default-deny. The admin API issues
-- short-lived signed URLs.

insert into public.training_modules
  (id, kind, title, summary, minutes, sort_order, external_url, external_publisher, external_acknowledgement, min_watch_seconds)
values
  ('dust-awareness', 'video', 'Dust awareness',
   'Silica and wood dust. Water or extraction on the tool. Don''t dry sweep. Wear the mask you were face-fitted for.',
   4, 10,
   'https://www.hse.gov.uk/construction/healthrisks/hazardous-substances/cutting-paving-blocks-kerbs-and-flags.htm',
   'HSE',
   'Contains public sector information published by the Health and Safety Executive and licensed under the Open Government Licence.',
   60),
  ('manual-handling', 'video', 'Manual handling',
   'Plan the lift, keep the load close, ask for help, don''t twist.', 4, 20, null, null, null, null),
  ('slips-trips-falls', 'video', 'Slips, trips and falls',
   'Housekeeping, cables, wet floors, and reporting a hazard.', 4, 30, null, null, null, null),
  ('ppe', 'video', 'PPE',
   'What the site requires, when it comes off, and damaged kit. A tight mask needs a face fit test.', 4, 40, null, null, null, null),
  ('fire-and-alarm', 'video', 'Fire and alarm',
   'Sound the alarm, leave by the nearest way, go to the muster point.', 4, 50, null, null, null, null),
  ('electrical-site-safety', 'video', 'Electrical safety on site',
   'Treat cables as live, take damaged leads out of use, 110V on site, report a tripped breaker, keep clear of overhead lines.',
   5, 60, null, null, null, null),
  ('working-at-height', 'video', 'Working at height',
   'Any place a fall can injure you, including a ladder. Tagged scaffolds, fragile roofs, missing guardrails. Awareness only, not a harness, PASMA or IPAF course.',
   5, 70, null, null, null, null),
  ('noise-and-vibration', 'video', 'Noise and vibration',
   'Hearing protection in a marked zone, and report tingling in the hands.', 4, 80, null, null, null, null),
  ('coshh', 'video', 'COSHH',
   'Read the label, don''t mix, ask for the sheet.', 4, 90, null, null, null, null),
  ('plant-and-pedestrians', 'video', 'Plant and pedestrians',
   'Exclusion zones, eye contact with the operator, don''t walk behind a machine.', 4, 100, null, null, null, null),
  ('buried-services', 'video', 'Buried services',
   'Don''t dig until services are located and marked. A CAT ticket stays a separate record.', 4, 110, null, null, null, null),
  ('hot-works', 'video', 'Hot works awareness',
   'Permit, extinguisher, fire watch, clear combustibles.', 4, 120, null, null, null, null),
  ('face-fit', 'record', 'Face fit',
   'In-person fit test for a tight-fitting mask. Logged by the office, with a review date.', null, 5, null, null, null, null)
on conflict (id) do nothing;

insert into public.training_questions (module_id, sort_order, stem, options, correct_index)
values
  ('dust-awareness', 1, 'Dry cutting a kerb or paving slab with a cut-off saw produces',
   '["Very high levels of silica dust", "Only a little dust if the cut is quick", "Dust that is harmless outdoors"]', 0),
  ('dust-awareness', 2, 'The best way to control dust from a cut-off saw is',
   '["Working faster to finish sooner", "Water suppression or on-tool extraction", "Standing upwind of the cut"]', 1),
  ('dust-awareness', 3, 'To clean up dust you should',
   '["Dry sweep it with a brush", "Blow it away with compressed air", "Use a suitable vacuum or damp methods"]', 2),
  ('dust-awareness', 4, 'A tight-fitting mask only protects you when',
   '["It has been face-fit tested for you and you are clean-shaven where it seals", "It is new out of the packet", "It is worn loosely so it is comfortable"]', 0),
  ('dust-awareness', 5, 'You are cutting with water suppression. What about your mask?',
   '["Take it off, the water catches all the dust", "Keep wearing it, water does not catch all the silica", "Only wear it when the water runs out"]', 1),

  ('manual-handling', 1, 'Before you lift something you should',
   '["Plan the lift: the weight, the route, and where it is going", "Lift it first and work out the route after", "Lift it as quickly as you can"]', 0),
  ('manual-handling', 2, 'Where should you hold the load?',
   '["At arm''s length", "Close to your body, around waist height", "Above your shoulders"]', 1),
  ('manual-handling', 3, 'You need to change direction while carrying a load. You should',
   '["Twist at the waist", "Lean to one side", "Turn by moving your feet"]', 2),
  ('manual-handling', 4, 'A load is too heavy or awkward for you. You should',
   '["Ask for help or use a lifting aid", "Lift it anyway and go slowly", "Drag it along the floor"]', 0),
  ('manual-handling', 5, 'A good lifting position is',
   '["Straight legs with your back bent over", "Knees bent, back keeping its natural curve, a firm grip", "Jerking the load up to get it moving"]', 1),

  ('slips-trips-falls', 1, 'The most common cause of trips on site is',
   '["Poor housekeeping, like cables and materials left in walkways", "Wearing safety boots", "Working in daylight"]', 0),
  ('slips-trips-falls', 2, 'Where should cables run?',
   '["Across the middle of walkways", "Overhead or along the edges, away from walkways", "Under loose boards"]', 1),
  ('slips-trips-falls', 3, 'You see a spill on a walkway. You should',
   '["Walk around it", "Leave it for the cleaners", "Clean it up or make it safe, warn others, and report it"]', 2),
  ('slips-trips-falls', 4, 'When should you tidy your work area?',
   '["As you go, throughout the day", "At the end of the week", "Only before an inspection"]', 0),
  ('slips-trips-falls', 5, 'You spot a hazard you cannot fix yourself. You should',
   '["Ignore it, it is not your job", "Report it to your supervisor straight away", "Mention it at the next toolbox talk"]', 1),

  ('ppe', 1, 'When do you wear the PPE the site requires?',
   '["Whenever you are in an area that requires it", "Only when a supervisor is watching", "When it is convenient"]', 0),
  ('ppe', 2, 'Your PPE is damaged. You should',
   '["Keep using it until the end of the job", "Report it and get it replaced before carrying on", "Repair it with tape"]', 1),
  ('ppe', 3, 'PPE is',
   '["The first thing to think about", "A replacement for other controls", "The last line of defence after other controls"]', 2),
  ('ppe', 4, 'A tight-fitting mask must be',
   '["Face-fit tested for the make, model and size you wear", "Any mask, they fit everyone", "One size up for comfort"]', 0),
  ('ppe', 5, 'When should a hard hat be replaced?',
   '["When it falls apart", "When it is damaged, after a hard impact, or past the maker''s date", "Never, if you paint over the cracks"]', 1),

  ('fire-and-alarm', 1, 'You discover a fire. What do you do first?',
   '["Raise the alarm", "Finish the task you are on", "Go and look for where it started"]', 0),
  ('fire-and-alarm', 2, 'The fire alarm sounds. You should',
   '["Collect your tools and belongings first", "Leave by the nearest safe exit and go to the muster point", "Use the hoist to get down faster"]', 1),
  ('fire-and-alarm', 3, 'At the muster point you should',
   '["Leave site and go home", "Go back for your tools", "Stay until you are accounted for and told it is safe"]', 2),
  ('fire-and-alarm', 4, 'When should you use a fire extinguisher?',
   '["Only if you are trained, it is safe, and your escape route is behind you", "Always, before raising the alarm", "Never, even on a small fire you are trained for"]', 0),
  ('fire-and-alarm', 5, 'Fire escape routes should be',
   '["Used to store materials for a short time", "Kept clear at all times", "Locked to stop people using them"]', 1),

  ('electrical-site-safety', 1, 'How should you treat cables on site?',
   '["As live, unless a competent person has proved them dead", "As dead if they are not sparking", "As safe if they are taped"]', 0),
  ('electrical-site-safety', 2, 'You find a damaged extension lead. You should',
   '["Tape it up and carry on", "Take it out of use, label it, and report it", "Use it carefully until the end of the day"]', 1),
  ('electrical-site-safety', 3, 'Which supply is preferred for portable tools on a UK site?',
   '["230V with no protection", "400V", "110V, yellow plugs"]', 2),
  ('electrical-site-safety', 4, 'A breaker keeps tripping. You should',
   '["Stop resetting it and report it", "Keep resetting it until it holds", "Tape the switch on"]', 0),
  ('electrical-site-safety', 5, 'Near overhead power lines you should',
   '["Pass underneath with plant if it is quick", "Keep plant, ladders and materials well clear and follow the exclusion zone", "Use a wooden ladder because it is safe near lines"]', 1),

  ('working-at-height', 1, 'Working at height means',
   '["Any place where a fall could injure you, including a ladder", "Only work above 2 metres", "Only work on scaffolding"]', 0),
  ('working-at-height', 2, 'Ladders are for',
   '["All-day jobs", "Short, low-risk work", "Carrying heavy loads up"]', 1),
  ('working-at-height', 3, 'When can you use a scaffold?',
   '["When it looks finished", "Whenever you need it", "Only when it has been inspected and tagged safe"]', 2),
  ('working-at-height', 4, 'A roof has rooflights or cement sheets. You should',
   '["Never step on them without the right protection in place", "Step on them if you are careful", "Walk on them if you stay on the bolt lines"]', 0),
  ('working-at-height', 5, 'You notice a guardrail is missing. You should',
   '["Carry on and stay away from the edge", "Stop, keep clear, and report it", "Tie some rope across the gap and carry on"]', 1),

  ('noise-and-vibration', 1, 'In a marked hearing protection zone you should',
   '["Wear hearing protection the whole time you are inside it", "Only wear it during the loudest work", "Only wear it when a supervisor is around"]', 0),
  ('noise-and-vibration', 2, 'A sign that noise is probably too loud is',
   '["You can hear a radio", "You have to raise your voice to talk to someone about 2 metres away", "It is quiet after work"]', 1),
  ('noise-and-vibration', 3, 'You get tingling or numb fingers after using vibrating tools. You should',
   '["Ignore it, it wears off", "Warm your hands and carry on", "Report it to your supervisor"]', 2),
  ('noise-and-vibration', 4, 'How can you reduce vibration from a tool?',
   '["Use a low-vibration, well-maintained tool and limit the time you use it", "Grip the tool as hard as you can", "Use a blunt disc so it cuts slower"]', 0),
  ('noise-and-vibration', 5, 'Taking hearing protection off for short spells',
   '["Makes no difference", "Cuts the protection it gives by a lot", "Is fine if you take it off often"]', 1),

  ('coshh', 1, 'Before you use a substance you should',
   '["Read the label and the COSHH assessment", "Smell it to check what it is", "Use it and read about it later"]', 0),
  ('coshh', 2, 'Can you mix two chemicals together?',
   '["Yes, if they are from the same supplier", "Only if the instructions say it is safe", "Yes, it makes them work better"]', 1),
  ('coshh', 3, 'Where should you keep a substance you have decanted?',
   '["In a drinks bottle", "In any spare tub", "In a properly labelled container"]', 2),
  ('coshh', 4, 'Wet cement gets on your skin. You should',
   '["Wash it off promptly and report any irritation", "Leave it to dry and brush it off", "Carry on, cement is harmless"]', 0),
  ('coshh', 5, 'You are not sure how to use a product safely. You should',
   '["Guess from the name", "Ask your supervisor for the COSHH assessment", "Use less of it"]', 1),

  ('plant-and-pedestrians', 1, 'An exclusion zone around plant means',
   '["Stay out unless you are authorised to be there", "You can walk through if you are quick", "It only applies to the driver"]', 0),
  ('plant-and-pedestrians', 2, 'Is it safe to walk behind a reversing machine?',
   '["Yes, if you wear hi-vis", "No, the operator may not see you", "Yes, if the reversing alarm is on"]', 1),
  ('plant-and-pedestrians', 3, 'Before you approach a machine you should',
   '["Wave and walk straight up", "Approach from behind where it is quieter", "Make eye contact with the operator and wait for their signal"]', 2),
  ('plant-and-pedestrians', 4, 'Where should you walk on site?',
   '["On the marked pedestrian routes, apart from vehicles", "On the haul road, it is flatter", "Wherever is quickest"]', 0),
  ('plant-and-pedestrians', 5, 'Wearing hi-vis means',
   '["The driver will always see you", "You are easier to see, but you still keep out of blind spots", "You can enter an exclusion zone"]', 1),

  ('buried-services', 1, 'Before digging, buried services should be',
   '["Located and marked using plans and a cable locator", "Assumed to be deeper than you will dig", "Found by digging slowly with the machine"]', 0),
  ('buried-services', 2, 'Close to a marked service you should',
   '["Dig faster with the machine", "Use safe digging methods, such as hand digging", "Ignore the marks if the plans disagree"]', 1),
  ('buried-services', 3, 'You strike a cable. You should',
   '["Pull it out to check it", "Touch it to see if it is live", "Stop, keep clear, warn others, and report it"]', 2),
  ('buried-services', 4, 'Service plans are',
   '["A guide only. Services may not be exactly where they are shown", "Always exact", "Only needed for gas"]', 0),
  ('buried-services', 5, 'Who should use a cable locator?',
   '["Anyone on site", "Only people trained to use it", "Only the machine driver"]', 1),

  ('hot-works', 1, 'Before hot work starts on a site that uses permits',
   '["A hot work permit must be issued", "You just tell the person next to you", "You only need a permit for welding"]', 0),
  ('hot-works', 2, 'What do you do with combustible materials near hot work?',
   '["Leave them, sparks rarely travel", "Move them away or cover them with protection", "Wet them once the work is finished"]', 1),
  ('hot-works', 3, 'During hot work you should have',
   '["A bucket of sand somewhere on site", "Nothing, the alarm is enough", "A suitable extinguisher close at hand"]', 2),
  ('hot-works', 4, 'When does the fire watch end?',
   '["After the time set on the permit once the work has stopped", "The moment the work stops", "When you leave for lunch"]', 0),
  ('hot-works', 5, 'You find smouldering material after hot work. You should',
   '["Leave it, it will go out", "Raise the alarm", "Cover it with a bag"]', 1)
on conflict (module_id, sort_order) do nothing;
