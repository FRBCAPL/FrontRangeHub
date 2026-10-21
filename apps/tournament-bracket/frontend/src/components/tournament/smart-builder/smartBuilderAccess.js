/**
 * Whether the "Help me choose" entry point is offered. SMART_BUILDER_ENABLED offers it everywhere the tournament
 * screens are reachable; set it to false to hide it again in production (development builds still show it).
 */
import { SMART_BUILDER_ENABLED } from './builderFlags.js';

const buildEnv = () => ({ DEV: import.meta.env?.DEV, PROD: import.meta.env?.PROD });

export function smartBuilderAvailable(env = buildEnv(), enabled = SMART_BUILDER_ENABLED) {
  return enabled === true || (env?.DEV === true && env?.PROD !== true);
}
