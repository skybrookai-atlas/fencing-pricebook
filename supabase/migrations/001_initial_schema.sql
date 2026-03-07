-- ============================================================
-- Migration 001: Initial Schema
-- Fencing Pricebook & Quoting Platform — MVP (spec v2.0)
-- ============================================================

-- ============================================================
-- LOOKUP TABLES
-- Per spec §3: all lists stored in DB, never hardcoded.
-- ============================================================

CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  aliases text[] NOT NULL DEFAULT '{}',
  is_structural boolean NOT NULL DEFAULT false,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer
);

CREATE TABLE IF NOT EXISTS quote_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer
);

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('owner', 'employee')),
  full_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  primary_material text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text UNIQUE NOT NULL,
  description text NOT NULL,
  product text,
  category text,
  material text,
  finish text,
  colour text,
  width_mm numeric,
  length_mm numeric,
  height_mm numeric,
  diameter_mm numeric,
  thickness_mm numeric,
  unit text,
  quote_unit text,
  pack_qty integer,
  notes text,
  last_updated timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_sku text,
  cost_price numeric NOT NULL,
  supplier_unit_original text,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id),
  filename text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'complete')),
  total_rows integer,
  ready_count integer,
  needs_review_count integer,
  ignored_count integer,
  imported_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES imports(id) ON DELETE CASCADE,
  row_status text NOT NULL CHECK (row_status IN ('ready', 'needs_review', 'ignored', 'promoted')),
  description text,
  product text,
  material text,
  material_uncertain boolean DEFAULT false,
  finish text,
  colour text,
  width_mm numeric,
  length_mm numeric,
  height_mm numeric,
  diameter_mm numeric,
  thickness_mm numeric,
  inferred_dims boolean DEFAULT false,
  unit text,
  quote_unit text,
  pack_qty integer,
  cost_price numeric,
  supplier_sku text,
  category text,
  notes text,
  ai_confidence numeric,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mapping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NULL, -- NULL = global rule
  trigger_terms text[] NOT NULL,
  field text NOT NULL,
  output_value text NOT NULL,
  priority integer DEFAULT 100,
  source text NOT NULL CHECK (source IN ('user_approved', 'ai_generated')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fence_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  measurement_unit text DEFAULT 'lm',
  labour_rate_per_unit numeric,
  margin_percent numeric DEFAULT 42,
  materials jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bom_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fence_type_id uuid REFERENCES fence_types(id),
  job_description text,
  job_dimensions jsonb,
  line_items jsonb NOT NULL DEFAULT '[]',
  total_cost numeric,
  created_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fence_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_units ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only their own row
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Lookup tables: all authenticated users can read
CREATE POLICY "materials_read" ON materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "categories_read" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "purchase_units_read" ON purchase_units FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "quote_units_read" ON quote_units FOR SELECT USING (auth.role() = 'authenticated');

-- Lookup tables: only owners can write
CREATE POLICY "materials_owner_write" ON materials FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "categories_owner_write" ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Core tables: authenticated users can read
CREATE POLICY "products_read" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "suppliers_read" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "supplier_items_read" ON supplier_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "fence_types_read" ON fence_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mapping_rules_read" ON mapping_rules FOR SELECT USING (auth.role() = 'authenticated');

-- Core tables: only owners can write
CREATE POLICY "products_owner_write" ON products FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "suppliers_owner_write" ON suppliers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "supplier_items_owner_write" ON supplier_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "imports_owner_write" ON imports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "import_rows_owner_write" ON import_rows FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "mapping_rules_owner_write" ON mapping_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "fence_types_owner_write" ON fence_types FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Imports: authenticated users can read
CREATE POLICY "imports_read" ON imports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "import_rows_read" ON import_rows FOR SELECT USING (auth.role() = 'authenticated');

-- BOM sessions: users can read their own + owners read all
CREATE POLICY "bom_own" ON bom_sessions
  FOR SELECT USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));
CREATE POLICY "bom_write" ON bom_sessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "bom_update_own" ON bom_sessions
  FOR UPDATE USING (created_by = auth.uid());

-- ============================================================
-- PROFILE AUTO-CREATION TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'employee');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
