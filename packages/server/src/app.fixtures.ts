/** App-test helpers: an air service that fails. */

/** An air service whose every call fails with the given error. */
export const failingAir = (error: Error) => ({
  report: () => Promise.reject(error),
  places: () => Promise.reject(error),
});
