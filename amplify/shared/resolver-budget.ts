import { AsyncLocalStorage } from "node:async_hooks";

/** Budgets start at handler entry, leaving Lambda/AppSync scheduling margin.
 * Aborting a write never proves rollback. Callers must retain idempotency keys.
 */
export class ResolverBudget {
  private readonly deadline: number;
  readonly signal: AbortSignal;
  constructor(milliseconds: number) {
    this.deadline = performance.now() + milliseconds;
    this.signal = AbortSignal.timeout(milliseconds);
  }
  remaining(): number { return this.deadline - performance.now(); }
  require(milliseconds = 100): void {
    this.signal.throwIfAborted();
    if (this.remaining() < milliseconds) throw new Error("Operation time budget exhausted; retry safely.");
  }
}

const budgets = new AsyncLocalStorage<ResolverBudget>();
export function withResolverBudget<T>(milliseconds: number, work: () => Promise<T>): Promise<T> {
  return budgets.run(new ResolverBudget(milliseconds), work);
}
export function hasResolverBudget(): boolean { return budgets.getStore() !== undefined; }
export function resolverBudget(): ResolverBudget {
  const budget = budgets.getStore();
  if (!budget) throw new Error("Missing resolver budget.");
  return budget;
}

export const boundedAwsOptions = {
  maxAttempts: 1,
  requestHandler: { connectionTimeout: 500, requestTimeout: 1_500, throwOnRequestTimeout: true },
};

/** Decorates promise-based SDK send only. AsyncLocalStorage isolates concurrent
 * invocations and covers helpers/pagination without mutable global deadlines.
 * Outside a budget (e.g. other premium-access callers), send is unchanged.
 */
export function budgetedClient<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, key) {
      if (key !== "send") return Reflect.get(target, key, target);
      return (command: unknown, options?: object) => {
        const budget = budgets.getStore();
        budget?.require();
        const send: unknown = Reflect.get(target, "send");
        if (typeof send !== "function") throw new Error("SDK client has no send method.");
        return Reflect.apply(send, target, [
          command, { ...options, ...(budget ? { abortSignal: budget.signal } : {}) },
        ]);
      };
    },
  });
}
