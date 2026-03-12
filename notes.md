# Fence Magic — Project Notes

---

## Reusable Prompts

### 1. Session Start Prompt
_Paste this at the beginning of every new Claude Code session before building anything._

```
Before we begin, re-read CLAUDE.md fully. We are building Fence Magic — a fencing pricebook and quoting platform. The current spec is v2.0.

We are about to work on: [describe the phase]

Key constraints to remember:
- All canonical lists (materials, categories, units) live in the database — never hardcode them
- finish and colour are separate fields
- Import row statuses are: ready, needs_review, ignored, promoted
- When an owner corrects any field, a learning rule is auto-created immediately — no extra action required
- Retroactive rule application: needs_review rows only — never modify ready rows
- Delivery rows: keep most expensive per supplier, ignore the rest
- Promoted rows are read-only — show lock icon, muted text, no hover state
- Default margin is 42%
- Desktop only — no mobile optimisation in MVP

Do not build anything beyond what I describe. Ask me if anything is unclear before writing code.
```

---

### 2. Post-Feature Review Prompt
_Paste this into Claude Code after completing any feature._

```
Review everything you just built against the following criteria:

1. SPEC COMPLIANCE — Does this match the product spec in CLAUDE.md and the decisions we've made? Flag anything that deviates.

2. SCHEMA COMPLIANCE — Do all database reads/writes use the correct field names from the schema? Check: colour and finish are separate fields, supplier_unit_original is in supplier_items not products, product_key logic only uses physical attributes.

3. DESIGN COMPLIANCE — Does the UI follow the Fence Magic design system in CLAUDE.md? Check: correct colours, status badge styles, table row height, sidebar behaviour.

4. ERROR HANDLING — Does every component handle loading state, error state, and empty state?

5. TYPE SAFETY — Are there any `any` types or unhandled TypeScript errors?

List issues found as: [CRITICAL] must fix before moving on, [MINOR] fix later, [NOTE] worth knowing.
```

---

## Migration Fix List

### ✅ Done
- `003_mapping_rules_supplier_id.sql` — added `supplier_id uuid REFERENCES suppliers(id) NULL` column to `mapping_rules`. NULL = global rule, value = supplier-specific rule.

### ⬜ Post-MVP (not blocking)

**1. `mapping_rules.scope` is text, not a foreign key**
The code stores `supplier_id` UUID as a text string in the `scope` column rather than using the new `supplier_id` column. Worth a migration to clean this up — `scope` should store `'global'` or `'supplier'` as a type label only, and `supplier_id` should hold the actual UUID reference.

**2. `supplier_items` unique constraint `(product_id, supplier_id)`**
One supplier can only have one price per product. Fine for MVP but will need revisiting if suppliers sell the same product in different pack sizes at different prices.

**3. First user role assignment**
New users default to `employee` role. No automatic way for the first user (Liam) to become owner. Requires a manual role update in Supabase dashboard after first signup, or a seed script.


Phase 7/8 — Engine redesign pending Liam conversation
Current formula builder only supports lm-only formulas. All 3 fence types need interdependent variables. Talk to Liam before touching calculator code.
Questions for Liam:

How does he want to add new fence types — plain English description, structured form?
Does the Colorbond slope/sleeper adjustment logic match how he actually quotes?
What covers 90% of his jobs?

Column mapping UI — needed before onboarding other customers
Every supplier has different column names. Need a step 1 (upload → parse headers) and step 2 (owner maps columns → process) flow. Mapping stored on imports table for reuse. Build before any customer beyond Liam uses the import feature.