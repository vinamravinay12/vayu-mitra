export const failingAir = (error: Error) => ({
  report: () => Promise.reject(error),
  places: () => Promise.reject(error),
});
