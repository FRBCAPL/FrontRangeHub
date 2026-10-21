/** Test support only: runs the Smart Builder worker handler in a Node worker thread, like the browser worker. */
import { parentPort } from 'node:worker_threads';
import { createWorkerHandler } from './builderWorkerCore.js';

const handle = createWorkerHandler((message) => parentPort.postMessage(message));
parentPort.on('message', handle);
