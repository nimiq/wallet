// Type declarations for the build constants defined in vite.config.ts.

interface ImportMetaEnv {
    readonly SENTRY_RELEASE: string;
    readonly VERSION: string;
    readonly COPYRIGHT_YEAR: string;
}
