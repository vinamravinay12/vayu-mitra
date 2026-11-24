/**
 * The part of the Trusted Types API this app uses, which TypeScript's DOM
 * library does not declare yet. Optional on `Window`: Firefox and older
 * browsers have no Trusted Types, and the app then passes a plain string.
 */
interface TrustedScriptURL {
  toString(): string;
}

interface TrustedTypePolicy {
  createScriptURL(input: string): TrustedScriptURL;
}

interface TrustedTypePolicyFactory {
  createPolicy(
    name: string,
    rules: { readonly createScriptURL: (input: string) => string },
  ): TrustedTypePolicy;
}

interface Window {
  readonly trustedTypes?: TrustedTypePolicyFactory;
}

interface ServiceWorkerContainer {
  register(
    scriptURL: TrustedScriptURL,
    options?: RegistrationOptions,
  ): Promise<ServiceWorkerRegistration>;
}
