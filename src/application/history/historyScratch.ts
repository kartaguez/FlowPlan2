/** Disposable presentation workspace; never historical authority or backup data. */
export interface HistoryScratch {
  put(level: number, run: number, part: number, values: readonly string[]): Promise<void>;
  get(level: number, run: number, part: number): Promise<readonly string[]>;
  removeRun(level: number, run: number): Promise<void>;
  dispose(): Promise<void>;
}
