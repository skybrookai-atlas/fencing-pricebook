-- ============================================================
-- Migration 002: Seed Reference Data
-- Canonical lists per spec §9 — stored in DB, never hardcoded
-- ============================================================

-- ============================================================
-- MATERIALS (spec §9)
-- is_structural=true drives Needs Review dimension logic
-- ============================================================

INSERT INTO materials (name, aliases, is_structural, sort_order) VALUES
  ('Stainless_Steel', ARRAY['SS316','SS304','STAINLESS','S/STEEL'], false, 1),
  ('Aluminium',       ARRAY['ALUM','ALUMINIUM','ALUMINUM','ALY','ALI','ALLY'], true, 2),
  ('Hardwood',        ARRAY['MERBAU','SPOTTED GUM','IRONBARK','CYPRESS','BLACKBUTT','JARRAH','KWILA','HARDWOOD','HWD','HW','MHW'], true, 3),
  ('Treated_Pine',    ARRAY['H3','H4','CCA','TREATED','T/PINE','TP','PT'], true, 4),
  ('Timber',          ARRAY['TIMBER','PALING','PICKET','SOFTWOOD','PINE'], true, 5),
  ('Glass',           ARRAY['GLASS'], false, 6),
  ('PVC',             ARRAY['PVC','VINYL','NYLON','PLASTIC','SYNTHETIC'], false, 7),
  ('Composite',       ARRAY['COMPOSITE','EKODECK','TREX','MODWOOD'], false, 8),
  ('Concrete',        ARRAY['CONCRETE','CEMENT','PREMIX','POSTCRETE','RAPID SET'], false, 9),
  ('Steel',           ARRAY['STEEL','GALV','GAL','COLORBOND','CB','ZINCALUME','GZ','CHAINWIRE','RHS','SHS','CHS','PFC','UB','FLAT BAR','ANGLE BAR'], true, 10),
  ('Natural_Products',ARRAY['BRUSHWOOD','BAMBOO'], false, 11),
  ('Brick',           ARRAY['BRICK'], false, 12),
  ('Stone',           ARRAY['STONE'], false, 13),
  ('Electronic',      ARRAY['ELECTRONIC','ELECTRICAL'], false, 14),
  ('Mixed',           ARRAY['MIXED MATERIAL','METALS'], false, 15),
  ('NA',              ARRAY[]::text[], false, 16)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- CATEGORIES (spec §9 — 36 categories)
-- ============================================================

INSERT INTO categories (name, description, sort_order) VALUES
  ('Posts',                  'Fence/gate posts', 1),
  ('Rails',                  'Top/bottom rails', 2),
  ('Frames',                 'General frames', 3),
  ('Angles',                 'Angle sections', 4),
  ('RHS_SHS_Tube',           'Rectangular/square hollow sections', 5),
  ('Flat_Bar',               'Flat bar stock', 6),
  ('Channel',                'C-channel sections', 7),
  ('Fence_Panels',           'Pre-made fence panels', 8),
  ('Slats_Battens',          'Slats, battens, palings', 9),
  ('Mesh',                   'Wire mesh, welded mesh panels', 10),
  ('Wire',                   'Chainwire, barbed wire, plain wire', 11),
  ('Lattice',                'Lattice panels', 12),
  ('Glass_Panels',           'Glass panels/sheets', 13),
  ('Sheet_Cladding',         'Colorbond, zincalume sheets', 14),
  ('Gate_Frames',            'Gate frame sections', 15),
  ('Gates',                  'Gate body', 16),
  ('Gate_Hardware',          'Tracks, wheels, drop bolts', 17),
  ('Hardware',               'General fixings & fittings', 18),
  ('Fasteners',              'Screws, bolts, rivets, tek', 19),
  ('Hinges',                 'Gate/fence hinges', 20),
  ('Latches',                'Latches, locks', 21),
  ('Brackets',               'Brackets, clips, straps', 22),
  ('Caps',                   'Post caps, end caps', 23),
  ('Anchors',                'Anchors, dynabolts', 24),
  ('Concrete',               'Concrete, cement, grout', 25),
  ('Chemicals_Adhesives',    'Sealants, adhesives', 26),
  ('Coatings',               'Paint, powder coat, primer', 27),
  ('Electrical_Automation',  'Motors, keypads, intercoms, controller boards, remotes, batteries, solar panels, sensors', 28),
  ('Consumables',            'Gloves, rags, site supplies, misc', 29),
  ('Tools',                  'Drill bits, blades', 30),
  ('Services',               'Labour, fabrication, delivery', 31),
  ('Aggregate',              'Sand, gravel, roadbase', 32),
  ('Structural',             'Base plates, UBs, PFCs', 33),
  ('Decking',                'Decking boards, joists', 34),
  ('Ground_Install',         'Augering, excavation, tip fees', 35),
  ('Unclassified',           'System fallback — assigned when no category can be detected', 36)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PURCHASE UNITS (spec §9 — 11 units)
-- ============================================================

INSERT INTO purchase_units (name, label, sort_order) VALUES
  ('ea',     'Each',              1),
  ('length', 'Per Length',        2),
  ('sheet',  'Per Sheet',         3),
  ('bag',    'Bag',               4),
  ('box',    'Box',               5),
  ('pack',   'Pack',              6),
  ('roll',   'Roll',              7),
  ('bundle', 'Bundle',            8),
  ('kit',    'Kit',               9),
  ('tube',   'Tube',             10),
  ('can',    'Can',              11)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- QUOTE UNITS (spec §9 — 6 units)
-- ============================================================

INSERT INTO quote_units (name, label, sort_order) VALUES
  ('ea',  'Each',           1),
  ('lm',  'Lineal Metre',   2),
  ('m2',  'Square Metre',   3),
  ('kg',  'Kilogram',       4),
  ('hr',  'Hour',           5),
  ('job', 'Per Job',        6)
ON CONFLICT (name) DO NOTHING;
