export {};

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}
