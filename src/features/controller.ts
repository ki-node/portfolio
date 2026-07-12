/** Small lifecycle contract shared by progressive interface controllers. */
export interface Controller {
  init(): void;
  destroy(): void;
}
