# Variant Data Fix Plan — `weight_unit = 'unit'`

Wave 1 found four products with a variant carrying `weight_unit = 'unit'` and a `variant_name` that looks like a gram weight ("500", "275"), flagged as a likely data-entry bug but deliberately not touched (a display-side workaround would have mislabeled real weight-priced products as per-piece). This plan inspects the actual live records before proposing anything, per the brief's explicit instruction not to assume every `'unit'` value is wrong.

**Status: prepared only. Nothing in this plan has been applied to production.**

---

## What was inspected

Queried the live `product_variants` table directly (read-only, via the existing anon key) for every variant on the four flagged products, alongside their sibling variants on the same product, to check whether the numbers are internally consistent.

## The four records

### Walnut Kernel Rose — HIGH CONFIDENCE

| variant_name | weight_unit | weight_value | price |
|---|---|---|---|
| 250g | g | 250 | ₹450 |
| **500** | **unit** | **1** | **₹900** |
| 1 Kg | kg | 1 | ₹1800 |

Evidence: price scales *exactly* linearly with weight across all three variants — ₹450 → ₹900 (250g→500g, exactly 2×) → ₹1800 (500g→1000g, exactly 2× again). This is precisely the pricing ladder you'd expect if "500" means 500g, priced at the same per-gram rate as its 250g and 1kg siblings. No plausible reading of "500" as a piece-count fits a per-gram-priced walnut product.

### Cashew — HIGH CONFIDENCE

| variant_name | weight_unit | weight_value | price |
|---|---|---|---|
| 250g | g | 250 | ₹245 |
| **500** | **unit** | **1** | **₹490** |
| 1 Kg | kg | 1 | ₹980 |

Same exact pattern: ₹245 → ₹490 (exactly 2×) → ₹980 (exactly 2× again).

### Walnut Shell Chile — HIGH CONFIDENCE

| variant_name | weight_unit | weight_value | price |
|---|---|---|---|
| 250g | g | 250 | ₹325 |
| **500** | **unit** | **1** | **₹650** |
| 1 Kg | kg | 1 | ₹1300 |

Same exact pattern again: ₹325 → ₹650 (exactly 2×) → ₹1300 (exactly 2× again).

### Almond — SAME UNIT FIX, BUT FLAG THE PRICE FOR AN OWNER CHECK

| variant_name | weight_unit | weight_value | price |
|---|---|---|---|
| 250g | g | 250 | ₹245 |
| **275** | **unit** | **1** | **₹535** |
| 1 Kg | kg | 1 | ₹1070 |

"275" as a piece-count makes no more sense here than it did for the other three — nobody sells almonds by counting out 275 individual nuts, and the SKU itself is `SKU-ALMOND-275`, following the exact same `SKU-<PRODUCT>-<gram-weight>` convention as the other three products' now-confirmed gram variants. So the same fix (unit → g) is still the right call for **what the unit is**.

But unlike the other three, the **price doesn't scale linearly**: at the 250g rate (₹0.98/g), 275g should be ≈₹270 and 1kg should be ≈₹980 — instead the 275g variant is priced at ₹535 (≈2× the linear prediction) and 1kg at ₹1070 (≈9% above it). This is a separate, distinct inconsistency from the unit-label bug, and I'm not confident enough to silently "correct" a price without the shop owner confirming which number is actually wrong (the weight, the price, or neither — it may be a deliberate premium-grade pricing tier, which is a legitimate business decision this plan has no way to distinguish from a typo). **Recommendation: apply the unit fix, leave the price exactly as-is, and separately ask the owner to confirm the 275g and 1kg Almond prices are intentional.**

---

## Proposed correction

For all four, the fix is the same shape: `weight_unit` changes from `'unit'` to `'g'`, and `weight_value` (currently a placeholder `1` on all four rows — nothing in the app reads it today, but it should be correct, not left inconsistent with the fix) is set to match the gram figure already in `variant_name`. `variant_name` and `price` are **not** touched by this plan — including Almond's, per the confidence note above.

```sql
-- Walnut Kernel Rose: variant_name "500" is 500g
UPDATE product_variants
SET weight_unit = 'g', weight_value = 500
WHERE id = '4c15b175-e7be-48fc-b935-9fb2e4ddeded';

-- Cashew: variant_name "500" is 500g
UPDATE product_variants
SET weight_unit = 'g', weight_value = 500
WHERE id = '30b3c7fd-d47b-425f-910c-6e772ea077f2';

-- Walnut Shell Chile: variant_name "500" is 500g
UPDATE product_variants
SET weight_unit = 'g', weight_value = 500
WHERE id = '495ca781-b004-4e6b-838e-df49fb015d21';

-- Almond: variant_name "275" is 275g. Unit label fixed; price left as-is —
-- see the Almond confidence note above before running this one.
UPDATE product_variants
SET weight_unit = 'g', weight_value = 275
WHERE id = '5e668932-0db8-4267-a2a1-e023b27d64d0';
```

Each statement is scoped to one row by primary key — no product, no other variant, and no other table is touched. `price` and `variant_name` are untouched on every row (so nothing customer-facing changes except a corrected unit label if it's ever surfaced), and this doesn't need to run in the same transaction as anything else — each statement is independently safe to apply or skip.

## What this does and doesn't fix

- **Fixes:** These four variants become correctly labeled as gram weights. Any current or future code that branches on `weight_unit` (e.g. Wave 1's `ProductCard` "/ pc" unit label) will now treat them correctly as weight-priced, matching their siblings.
- **Does not fix:** The Almond price anomaly. That's a business-data question, not a schema-consistency question, and is called out above rather than silently resolved.
- **Does not touch:** `variant_name`, `price`, `sku`, or any other column, on these or any other row. No other product's variants were found to have this issue — this plan is scoped to exactly the four rows Wave 1 already identified.

## Rollback

Each statement's inverse is equally simple, if ever needed:

```sql
UPDATE product_variants SET weight_unit = 'unit', weight_value = 1 WHERE id = '<row id>';
```

## Production safety gate

**This plan has not been applied.** Per the Wave 2 brief, no production variant data has been modified. Running the UPDATE statements above requires the same production database write access used for the rest of this project's approved migrations — nothing beyond that (no new permissions, no Storage access, no other table).

**READY FOR VARIANT DATA CORRECTION: YES for Walnut Kernel Rose, Cashew, and Walnut Shell Chile (high confidence, exact linear price evidence). CONDITIONAL for Almond — the unit-label part is equally safe to apply, but flag the 275g/1kg price figures to the owner before or alongside applying it, since this plan cannot tell a pricing typo from a deliberate premium tier.**
