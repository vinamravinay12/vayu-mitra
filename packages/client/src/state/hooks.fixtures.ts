/** Hook-test helpers: the API client the hooks are tested with. */
import { createApi } from '../api/api.js';

/** The real API client, talking to the fake server each test installs. */
export const api = createApi();
