// Declares the limited subset of `process.env` used by the app. Metro statically
// inlines `process.env.EXPO_PUBLIC_*` references at build time.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};
