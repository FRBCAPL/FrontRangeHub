import { centsToDollars, incomeSplitChipLabel } from './usaplIncomeProjection.js';
import { normalizeUsaplPlayType, usaplPlayTypeLabel } from './usaplIncomePlayType.js';

export function explainMissingIncomeChart({ players, duesCents, playType, saved = [] }) {
  const play = normalizeUsaplPlayType(playType);
  const wanted = `${players} players per team, ${usaplPlayTypeLabel(play)}, ${centsToDollars(duesCents)} per player`;
  const rows = Array.isArray(saved) ? saved : [];
  if (!rows.length) {
    return `No private chart row yet for ${wanted}. Number of teams does not need its own row. Open Private chart and save that roster size once from your sheet.`;
  }
  const playerMismatch = rows.filter(
    (row) => row.dues_cents === duesCents && row.play_type === play && Number(row.players) !== Number(players),
  );
  if (playerMismatch.length) {
    const have = playerMismatch.map((row) => `${row.players}-player`).join(', ');
    return `You asked for ${wanted}. Number of teams does not change the chart. You already saved ${have} for this dues and play type. Set Players per team to match, or save a ${players}-player private row.`;
  }
  const savedText = rows.map(incomeSplitChipLabel).join('; ');
  return `No private chart row yet for ${wanted}. Saved rows: ${savedText}. Number of teams does not need its own row.`;
}
