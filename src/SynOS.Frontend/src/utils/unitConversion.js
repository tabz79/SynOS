/**
 * Laboratory Inventory Unit Conversion Utility
 * Converts user-facing lab consumption units (mL, µL, mg, g, pcs, etc.)
 * to base inventory stock units (LITER, KG, BOTTLE, KIT, PCS) for accurate stock deduction.
 */

export const UNIT_CONFIGS = {
  VOLUME: [
    { label: 'mL (milliliters)', value: 'mL', factorToBase: 0.001, isDefault: true },
    { label: 'µL (microliters)', value: 'µL', factorToBase: 0.000001 },
    { label: 'LITER (L)', value: 'LITER', factorToBase: 1.0 }
  ],
  MASS: [
    { label: 'g (grams)', value: 'g', factorToBase: 0.001, isDefault: true },
    { label: 'mg (milligrams)', value: 'mg', factorToBase: 0.000001 },
    { label: 'kg (kilograms)', value: 'KG', factorToBase: 1.0 }
  ],
  DISCRETE: [
    { label: 'pcs (pieces)', value: 'PCS', factorToBase: 1.0, isDefault: true },
    { label: 'mL (milliliters)', value: 'mL', factorToBase: 0.001 },
    { label: 'units', value: 'units', factorToBase: 1.0 },
    { label: 'test dose', value: 'dose', factorToBase: 1.0 },
    { label: 'kit', value: 'KIT', factorToBase: 1.0 },
    { label: 'bottle', value: 'BOTTLE', factorToBase: 1.0 },
    { label: 'box', value: 'BOX', factorToBase: 1.0 }
  ]
};

export function getCompatibleUnits(baseUom = '') {
  const norm = (baseUom || '').trim().toUpperCase();
  if (norm.includes('LITER') || norm.includes('LITRE') || norm === 'L' || norm === 'ML') {
    return UNIT_CONFIGS.VOLUME;
  }
  if (norm.includes('KG') || norm.includes('GRAM') || norm === 'G' || norm === 'MG') {
    return UNIT_CONFIGS.MASS;
  }
  return UNIT_CONFIGS.DISCRETE;
}

export function getDefaultConsumptionUnit(baseUom = '') {
  const units = getCompatibleUnits(baseUom);
  const defaultUnit = units.find(u => u.isDefault);
  return defaultUnit ? defaultUnit.value : (units[0]?.value || 'units');
}

/**
 * Calculates stock deduction quantity in master base UOM based on user display quantity & unit.
 * E.g. (0.5, 'mL', 'LITER') -> 0.0005 LITER
 */
export function calculateBaseQuantity(displayQty, selectedUnit, baseUom = '') {
  const qty = parseFloat(displayQty) || 0;
  if (qty <= 0) return 0;

  const units = getCompatibleUnits(baseUom);
  const unitConfig = units.find(u => u.value.toLowerCase() === (selectedUnit || '').toLowerCase());
  
  if (!unitConfig) {
    return qty; // Default 1:1 if unit match not found
  }

  // If base UOM is already mL/g/pcs, adjust factor
  const normBase = (baseUom || '').trim().toUpperCase();
  if (normBase === 'ML' && selectedUnit === 'mL') return qty;
  if (normBase === 'G' && selectedUnit === 'g') return qty;
  if (normBase === 'MG' && selectedUnit === 'mg') return qty;

  return Number((qty * unitConfig.factorToBase).toFixed(6));
}

/**
 * Formats mapped card display text cleanly.
 * Returns { primaryText: "0.5 mL / test", secondaryText: "Deducts 0.0005 LITER stock" }
 */
export function formatConsumptionDisplay(mapItem) {
  const baseUom = mapItem.consumable?.unitOfMeasure || 'units';
  const baseQty = mapItem.quantityPerTest || 1;
  const dispQty = mapItem.displayQuantity ?? (baseUom === 'LITER' ? baseQty * 1000 : baseQty);
  const dispUnit = mapItem.displayUnit || (baseUom === 'LITER' ? 'mL' : baseUom);

  return {
    primaryText: `${dispQty} ${dispUnit} / test`,
    secondaryText: `Deducts ${baseQty} ${baseUom} stock per test`,
    displayQty: dispQty,
    displayUnit: dispUnit
  };
}
