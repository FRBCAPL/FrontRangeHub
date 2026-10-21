/** Smart Builder Web Worker entry. All simulation runs here, off the page's main thread. */
import { createWorkerHandler } from './builderWorkerCore.js';

const handle = createWorkerHandler((message) => self.postMessage(message));
self.onmessage = (event) => handle(event.data);
