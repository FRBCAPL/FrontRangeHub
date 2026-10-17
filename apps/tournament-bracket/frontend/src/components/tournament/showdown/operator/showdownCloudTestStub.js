/** Test-only stand-in for cloud/showdownCloud.js: no database, every call reports 'unavailable'. */
import { createShowdownCloud } from '../cloud/showdownCloudApi.js';

export const showdownCloud = createShowdownCloud({ operator: null, publicClient: null });
