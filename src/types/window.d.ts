export {};

declare global {
  interface Window {
    __user?: { id: string; email: string };
  }
}
