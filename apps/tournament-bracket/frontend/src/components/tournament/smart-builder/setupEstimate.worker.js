/** Setup-screen time estimate worker: one setting per message, off the page's main thread. */
import { estimateSetup } from './builderSetupEstimate.js';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, result: estimateSetup(data.settings) });
  } catch (err) {
    self.postMessage({ id: data.id, error: err?.message || 'The time estimate failed.' });
  }
};
