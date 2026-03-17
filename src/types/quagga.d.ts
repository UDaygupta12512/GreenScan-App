declare module 'quagga' {
  export interface QuaggaJSConfigObject {
    inputStream?: {
      type?: string;
      target?: HTMLElement | null;
      constraints?: {
        width?: number;
        height?: number;
        facingMode?: string;
      };
    };
    decoder?: {
      readers?: string[];
    };
    locate?: boolean;
  }

  export interface QuaggaJSResultObject {
    codeResult: {
      code?: string;
      format?: string;
    };
  }

  export const CameraAccess: {
    getActiveStreamLabel(): string | null;
  };

  export function init(
    config: QuaggaJSConfigObject,
    callback: (err: Error | null) => void
  ): void;

  export function start(): void;
  export function stop(): void;
  export function onDetected(callback: (result: QuaggaJSResultObject) => void): void;
  export function offDetected(callback?: (result: QuaggaJSResultObject) => void): void;
}