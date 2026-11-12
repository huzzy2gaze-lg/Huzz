-- Current stock from the first sales map (exported 2026-11-06). Run once, after the migration.
-- The plots are added without an agent. The change log shows them as an import.
insert into public.plots (id, block, num, size, kind, status, price, tags, note) values
  ('A-515', 'A', 515, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-516', 'A', 516, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-520', 'A', 520, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-521', 'A', 521, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-522', 'A', 522, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-523', 'A', 523, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-528', 'A', 528, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-530', 'A', 530, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-531', 'A', 531, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-532', 'A', 532, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-533', 'A', 533, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-535', 'A', 535, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-538', 'A', 538, '1K', 'own', 'available', 4.50, array['Corner','Extra land']::text[], 'Corner plot with extra land.'),
  ('A-539', 'A', 539, '1K', 'own', 'available', 4.50, array['Corner','Main road facing']::text[], ''),
  ('A-540', 'A', 540, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-543', 'A', 543, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-544', 'A', 544, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-545', 'A', 545, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-546', 'A', 546, '1K', 'own', 'available', 3.80, '{}', ''),
  ('A-547', 'A', 547, '1K', 'own', 'available', 3.80, '{}', '')
on conflict (id) do nothing;

insert into public.plot_fixes (key, n, size) values
  ('A-p3002_11026', null, '1K'),
  ('A-p3071_10985', null, '1K'),
  ('A-p3140_10945', null, '1K'),
  ('A-p3209_10904', null, '1K'),
  ('A-p3278_10863', null, '1K'),
  ('A-p3347_10823', null, '1K'),
  ('A-p3467_8873', null, '1K'),
  ('A-p3553_10702', null, '1K'),
  ('A-p3622_10661', null, '1K'),
  ('A-p5090_12588', null, '1K')
on conflict (key) do nothing;
