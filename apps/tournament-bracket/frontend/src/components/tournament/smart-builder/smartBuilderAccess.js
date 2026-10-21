/**
 * Whether the "Help me choose" entry point is offered. While SMART_BUILDER_ENABLED is false it needs a Vite
 * development build (import.meta.env.DEV is false in every production build), so production never shows it.
 */
import { SMART_BUILDER_ENABLED } from './builderFlags.js';

const buildEnv = () => ({ DEV: import.meta.env?.DEV, PROD: import.meta.env?.PROD });

export function smartBuilderAvailable(env = buildEnv(), enabled = SMART_BUILDER_ENABLED) {
  return enabled === true || (env?.DEV === true && env?.PROD !== true);
}
