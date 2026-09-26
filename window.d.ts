export {};

/** Config accepted by Google Identity Services' `accounts.id.initialize`. */
type GoogleOneTapConfig = {
  client_id: string;
  callback: (response: { credential: string }) => void | Promise<void>;
  ux_mode?: "popup" | "redirect";
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
  context?: "signin" | "signup" | "use";
  nonce?: string;
};

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              getMomentType: () => string;
            }) => void,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}
