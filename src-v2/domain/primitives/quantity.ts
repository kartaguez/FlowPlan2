import { invalid, success, type DomainResult } from './result.js';
import { validateRational, type Rational } from './rational.js';
import { dataRecord, field, hasKeys } from './data.js';
export const quantityFamilies = Object.freeze(['Capacity', 'DailyCap', 'Consumption', 'ETC', 'FixedDailyDemand', 'ReservationRatio', 'UnavailabilityRatio'] as const);
export type QuantityFamily = typeof quantityFamilies[number];
export type QuantityUnit<F extends QuantityFamily> = F extends 'Consumption' | 'ETC' ? 'work' : F extends 'ReservationRatio' | 'UnavailabilityRatio' ? 'ratio' : 'work/day';
declare const quantityBrand: unique symbol;
export interface Quantity<F extends QuantityFamily> {
  readonly family: F; readonly unit: QuantityUnit<F>; readonly value: Rational; readonly [quantityBrand]: true;
}
function unit(family: QuantityFamily): 'work' | 'work/day' | 'ratio' {
  return family === 'Consumption' || family === 'ETC' ? 'work' :
    family === 'ReservationRatio' || family === 'UnavailabilityRatio' ? 'ratio' : 'work/day';
}
export function createQuantity<F extends QuantityFamily>(family: F, input: unknown, path = 'quantity'): DomainResult<Quantity<F>> {
  if (!quantityFamilies.includes(family)) return invalid('INVALID_QUANTITY_FAMILY', path);
  const rational = validateRational(input, `${path}.value`); if (!rational.ok) return rational;
  if (rational.value.numerator < 0n) return invalid('NEGATIVE_QUANTITY', path);
  if (unit(family) === 'ratio' && rational.value.numerator > rational.value.denominator) return invalid('RATIO_OUT_OF_RANGE', path);
  return success(Object.freeze({ family, unit: unit(family), value: rational.value }) as Quantity<F>);
}
export function validateQuantity<F extends QuantityFamily>(family: F, input: unknown, path = 'quantity'): DomainResult<Quantity<F>> {
  const record = dataRecord(input, path); if (!record.ok) return record;
  if (!hasKeys(record.value, ['family', 'unit', 'value']) || field(record.value, 'family') !== family || field(record.value, 'unit') !== unit(family))
    return invalid('QUANTITY_FAMILY_MISMATCH', path);
  return createQuantity(family, field(record.value, 'value'), path);
}
export type OptionalQuantity<F extends QuantityFamily> =
  | { readonly kind: 'absent' }
  | { readonly kind: 'present'; readonly value: Quantity<F> };
export function createOptionalQuantity<F extends QuantityFamily>(family: F, input: unknown, path = 'quantity'): DomainResult<OptionalQuantity<F>> {
  if (!quantityFamilies.includes(family)) return invalid('INVALID_QUANTITY_FAMILY', path);
  const record = dataRecord(input, path); if (!record.ok) return record;
  if (hasKeys(record.value, ['kind']) && field(record.value, 'kind') === 'absent') return success(Object.freeze({ kind: 'absent' }));
  if (!hasKeys(record.value, ['kind', 'value']) || field(record.value, 'kind') !== 'present') return invalid('INVALID_OPTIONAL_QUANTITY', path);
  const value = validateQuantity(family, field(record.value, 'value'), `${path}.value`);
  return value.ok ? success(Object.freeze({ kind: 'present', value: value.value })) : value;
}
