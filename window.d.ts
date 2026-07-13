export {};

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
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
