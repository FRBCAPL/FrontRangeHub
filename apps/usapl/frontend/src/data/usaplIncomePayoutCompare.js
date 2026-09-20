import {
  defaultPlacePercents,
  placePayoutLabel,
  simulateCashPayout,
  suggestedPaidPlaces,
} from './usaplIncomePayout.js';

export function payoutPlaceCountOptions(teams) {
  const max = Math.min(8, Math.max(1, Number(teams) || 1));
  return Array.from({ length: max }, (_, index) => index + 1);
}

export function comparePlacePayouts({
  teams,
  prizeCents,
  grossCents,
  customCents,
  source,
  cashPercent,
}) {
  const options = payoutPlaceCountOptions(teams);
  const suggested = suggestedPaidPlaces(teams) || options[0] || 1;
  const columns = options.map((places) => {
    const sim = simulateCashPayout({
      prizeCents,
      grossCents,
      customCents,
      source,
      cashPercent,
      placePercents: defaultPlacePercents(places),
    });
    return { places, suggested: places === suggested, sim };
  });
  const maxPlace = options[options.length - 1] || 1;
  return {
    suggested,
    cash_pool_cents: columns[0]?.sim.cash_pool_cents || 0,
    columns,
    rows: Array.from({ length: maxPlace }, (_, index) => ({
      place: index + 1,
      label: placePayoutLabel(index),
      cells: columns.map((column) => column.sim.places[index] || null),
    })),
  };
}
