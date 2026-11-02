import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, UpdateItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import type Stripe from "stripe";
import { checkoutAttemptKey, recoverOrCreateCheckout, type CheckoutContract } from "../amplify/shared/checkout-session";
import { ResolverBudget, budgetedClient, resolverBudget, withResolverBudget } from "../amplify/shared/resolver-budget";

type Item = Record<string, AttributeValue>;
const contract: CheckoutContract = {
  purchaseIntentId: "a4e98676-6752-4f35-9dc9-06d27f79f861", userId: "user-a",
  stripeCustomerId: "cus_customer123", planCode: "ONE_MONTH", billingContractVersion: "v1",
  stripePriceId: "price_plan123", amountTotal: 9900, currency: "pln", accessDays: 30,
  termsVersion: "v1", privacyVersion: "v1", checkoutConsentVersion: "v1",
  appBaseUrl: "https://example.test", livemode: false,
};

// Evaluate the actual expression, rejecting unsupported syntax rather than
// inferring conditions from which values happen to be present.
function conditionMatches(expression: string, item: Item, values: Item, names: Record<string, string> = {}): boolean {
  const tokens = expression.match(/attribute_not_exists|[#:A-Za-z_][\w:#]*|[(),=]/g)!;
  assert.equal(tokens.join(""), expression.replace(/\s/g, ""));
  let index = 0;
  const take = (expected: string) => { assert.equal(tokens[index++], expected); };
  const attribute = (name: string) => item[names[name] ?? name];
  const equal = (a: AttributeValue | undefined, b: AttributeValue | undefined) => a !== undefined && b !== undefined && JSON.stringify(a) === JSON.stringify(b);
  function atom(): boolean {
    if (tokens[index] === "(") { index++; const result = or(); take(")"); return result; }
    if (tokens[index] === "attribute_not_exists") {
      index++; take("("); const result = attribute(tokens[index++]) === undefined; take(")"); return result;
    }
    const value = attribute(tokens[index++]);
    if (tokens[index] === "IN") {
      index++; take("("); let result = equal(value, values[tokens[index++]]);
      while (tokens[index] === ",") { index++; const match = equal(value, values[tokens[index++]]); result = result || match; }
      take(")"); return result;
    }
    take("="); return equal(value, values[tokens[index++]]);
  }
  function and(): boolean {
    let result = atom();
    while (tokens[index] === "AND") { index++; const next = atom(); result = result && next; }
    return result;
  }
  function or(): boolean {
    let result = and();
    while (tokens[index] === "OR") { index++; const next = and(); result = result || next; }
    return result;
  }
  const result = or(); assert.equal(index, tokens.length); return result;
}

/** In-memory transport only: no SDK client/credentials/network is constructed.
 * Models atomic compare-and-swap and injected lost responses; it does not prove
 * DynamoDB expression syntax or Stripe's production idempotency behavior.
 */
function fixture() {
  const customer: Item = { userId: { S: contract.userId }, stripeCustomerId: { S: contract.stripeCustomerId }, checkoutRecoveryReady: { BOOL: true } };
  const attempts = new Map<string, Item>();
  const sessions = new Map<string, Stripe.Checkout.Session>();
  const posts: { key: string; params: Stripe.Checkout.SessionCreateParams }[] = [];
  let losePostResponse = false;
  let loseTransactionResponse = false;
  let failArm = false;
  let failKnownWrite = false;
  let failRetrieve = false;
  let beforeUpdate: ((input: UpdateItemCommand["input"], item: Item) => void | Promise<void>) | undefined;
  let pausePost: Promise<void> | undefined;
  const fail = () => { throw Object.assign(new Error("conditional conflict"), { name: "ConditionalCheckFailedException" }); };
  const db = { send: async (command: unknown) => {
    if (command instanceof GetItemCommand) {
      const input = command.input;
      const item = input.TableName === "customers" ? customer : attempts.get(input.Key!.checkoutAttemptId.S!);
      return { Item: item ? structuredClone(item) : undefined };
    }
    if (command instanceof TransactWriteItemsCommand) {
      const [put, update] = command.input.TransactItems!;
      const item = put.Put!.Item!;
      const values = update.Update!.ExpressionAttributeValues!;
      if (!conditionMatches(put.Put!.ConditionExpression!, attempts.get(item.checkoutAttemptId.S!) ?? {}, put.Put!.ExpressionAttributeValues ?? {}) ||
          !conditionMatches(update.Update!.ConditionExpression!, customer, values, update.Update!.ExpressionAttributeNames)) fail();
      attempts.set(item.checkoutAttemptId.S!, structuredClone(item));
      customer.activeCheckoutAttemptId = values[":attempt"];
      if (loseTransactionResponse) { loseTransactionResponse = false; throw new Error("Lost transaction response"); }
      return {};
    }
    if (command instanceof UpdateItemCommand) {
      const input = command.input;
      const item = attempts.get(input.Key!.checkoutAttemptId.S!)!;
      const values = input.ExpressionAttributeValues!;
      if (failArm && values[":creating"]) { failArm = false; throw new Error("Arm write not sent"); }
      if (failKnownWrite && values[":known"]) { failKnownWrite = false; throw new Error("Lost association write"); }
      await beforeUpdate?.(input, item);
      if (!conditionMatches(input.ConditionExpression!, item, values, input.ExpressionAttributeNames)) fail();
      if (values[":session"]) item.stripeCheckoutSessionId = values[":session"];
      item.sessionCreationState = values[":creating"] ?? values[":known"] ?? values[":ready"] ?? values[":expired"] ?? values[":retired"];
      if (values[":now"]) item.updatedAt = values[":now"];
      return {};
    }
    throw new Error("Unexpected database command");
  } } as unknown as DynamoDBClient;
  const stripe = { checkout: { sessions: {
    create: async (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
      posts.push({ key: options.idempotencyKey!, params: structuredClone(params) });
      let session = sessions.get(options.idempotencyKey!);
      if (!session) {
        session = {
          id: `cs_test_session${sessions.size}abcdef`, customer: params.customer,
          mode: "payment", livemode: false, client_reference_id: params.client_reference_id,
          currency: "pln", amount_total: 9900, metadata: params.metadata,
          status: "open", payment_status: "unpaid", expires_at: params.expires_at,
          url: "https://checkout.stripe.com/c/pay/session",
          line_items: { has_more: false, data: [{ quantity: 1, price: { id: contract.stripePriceId } }] },
        } as unknown as Stripe.Checkout.Session;
        sessions.set(options.idempotencyKey!, session);
      }
      if (pausePost) await pausePost;
      if (losePostResponse) { losePostResponse = false; throw new Error("Stripe response lost after remote success"); }
      return structuredClone(session);
    },
    retrieve: async (id: string) => {
      if (failRetrieve) { failRetrieve = false; throw new Error("GET timed out"); }
      const session = [...sessions.values()].find((value) => value.id === id);
      assert.ok(session);
      return structuredClone(session);
    },
  } } } as unknown as Stripe;
  const run = (override: Partial<CheckoutContract> = {}) => recoverOrCreateCheckout({
    db, stripe, attemptsTable: "attempts", customersTable: "customers", budget: new ResolverBudget(24_000),
  }, { ...contract, ...override });
  return {
    run, customer, attempts, sessions, posts,
    faults: {
      losePost: () => { losePostResponse = true; }, loseTransaction: () => { loseTransactionResponse = true; },
      failArm: () => { failArm = true; }, failKnown: () => { failKnownWrite = true; }, failGet: () => { failRetrieve = true; },
      beforeUpdate: (hook: NonNullable<typeof beforeUpdate>) => { beforeUpdate = hook; },
      pausePost: (promise: Promise<void>) => { pausePost = promise; },
    },
  };
}

describe("durable checkout recovery (offline transports)", () => {
  it("recovers an ambiguous POST with identical parameters/key and one remote session", async () => {
    const f = fixture(); f.faults.losePost();
    await assert.rejects(f.run());
    assert.equal([...f.attempts.values()][0].sessionCreationState.S, "CREATING");
    assert.equal((await f.run()).status, "READY");
    assert.equal(f.sessions.size, 1); assert.equal(f.attempts.size, 1);
    assert.deepEqual(f.posts[0], f.posts[1]);
  });
  it("recovers a committed reservation whose response was lost", async () => {
    const f = fixture(); f.faults.loseTransaction();
    await assert.rejects(f.run()); assert.equal(f.posts.length, 0);
    assert.equal((await f.run()).status, "READY"); assert.equal(f.attempts.size, 1);
  });
  it("distinguishes failure before arming from an attempted POST", async () => {
    const f = fixture(); f.faults.failArm();
    await assert.rejects(f.run()); assert.equal(f.posts.length, 0);
    assert.equal([...f.attempts.values()][0].sessionCreationState.S, "NOT_STARTED");
    await f.run(); assert.equal(f.sessions.size, 1);
  });
  it("recovers lost session-ID persistence with the original POST key", async () => {
    const f = fixture(); f.faults.failKnown(); await assert.rejects(f.run()); await f.run();
    assert.equal(f.sessions.size, 1); assert.deepEqual(f.posts[0], f.posts[1]);
  });
  it("persists the ID before a failing verification GET and never repeats POST", async () => {
    const f = fixture(); f.faults.failGet(); await assert.rejects(f.run());
    assert.ok([...f.attempts.values()][0].stripeCheckoutSessionId.S);
    await f.run(); assert.equal(f.posts.length, 1);
  });
  it("serializes different concurrent intents using one customer pointer", async () => {
    const f = fixture();
    const results = await Promise.allSettled([f.run(), f.run({ purchaseIntentId: "other-intent" })]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(f.attempts.size, 1); assert.equal(f.sessions.size, 1);
  });
  it("serializes concurrent retries of the same intent", async () => {
    const f = fixture(); await Promise.allSettled([f.run(), f.run()]);
    assert.equal(f.attempts.size, 1); assert.equal(f.sessions.size, 1);
    assert.equal((await f.run()).status, "READY");
  });
  it("never replays an unknown POST after the retention safety window", async () => {
    const f = fixture(); f.faults.losePost(); await assert.rejects(f.run());
    [...f.attempts.values()][0].createdAt = { S: new Date(Date.now() - 24 * 3600_000).toISOString() };
    await assert.rejects(f.run(), /manual reconciliation/); assert.equal(f.posts.length, 1);
  });
  it("does not treat a missing legacy pointer as an empty checkout inventory", async () => {
    const f = fixture(); delete f.customer.checkoutRecoveryReady;
    await assert.rejects(f.run(), /Legacy checkout/); assert.equal(f.posts.length, 0); assert.equal(f.attempts.size, 0);
  });
  it("does not reuse expired sessions and allows a separate new intent", async () => {
    const f = fixture(); await f.run(); [...f.sessions.values()][0].status = "expired";
    assert.equal((await f.run()).status, "EXPIRED"); assert.equal(f.posts.length, 1);
    assert.equal((await f.run({ purchaseIntentId: "new-intent" })).status, "READY"); assert.equal(f.sessions.size, 2);
  });
  it("waits for the payment transaction and remembers completed old intents", async () => {
    const f = fixture(); await f.run(); const session = [...f.sessions.values()][0];
    session.status = "complete"; session.payment_status = "paid";
    await assert.rejects(f.run(), /przetwarzana/);
    [...f.attempts.values()][0].status = { S: "PAID" };
    assert.equal((await f.run()).status, "COMPLETED");
    await f.run({ purchaseIntentId: "new-intent" });
    assert.equal((await f.run()).status, "COMPLETED"); assert.equal(f.sessions.size, 2);
  });
  it("preserves a concurrent webhook PAID write before the POST response", async () => {
    const f = fixture(); let release!: () => void;
    f.faults.pausePost(new Promise<void>((resolve) => { release = resolve; }));
    const running = f.run();
    while (!f.sessions.size) await new Promise((resolve) => setImmediate(resolve));
    const item = [...f.attempts.values()][0]; item.status = { S: "PAID" };
    item.stripeCheckoutSessionId = { S: [...f.sessions.values()][0].id };
    const session = [...f.sessions.values()][0]; session.status = "complete"; session.payment_status = "paid";
    release(); await assert.rejects(running);
    assert.equal(item.status.S, "PAID"); assert.equal((await f.run()).status, "COMPLETED");
  });
  for (const terminal of ["EXPIRED", "PAYMENT_FAILED"] as const) {
    it(`rejects a stale READY write after concurrent ${terminal}`, async () => {
      const f = fixture(); await f.run();
      f.faults.beforeUpdate((input, item) => {
        if (input.ExpressionAttributeValues?.[":ready"]) item.sessionCreationState = { S: terminal };
      });
      await assert.rejects(f.run(), /lifecycle conflict/);
      assert.equal([...f.attempts.values()][0].sessionCreationState.S, terminal);
      assert.equal(f.posts.length, 1);
    });
  }
  it("fences open-session recovery when concurrent recovery commits expiry", async () => {
    const f = fixture(); await f.run();
    let interleaved = false;
    f.faults.beforeUpdate(async (input) => {
      if (!interleaved && input.ExpressionAttributeValues?.[":ready"]) {
        interleaved = true;
        [...f.sessions.values()][0].status = "expired";
        assert.equal((await f.run()).status, "EXPIRED");
      }
    });
    await assert.rejects(f.run(), /lifecycle conflict/);
    assert.equal([...f.attempts.values()][0].sessionCreationState.S, "EXPIRED");
    assert.equal(f.posts.length, 1);
  });
  for (const state of ["READY", "PAYMENT_FAILED", "EXPIRED"] as const) {
    it(`preserves concurrent ${state} while a Stripe POST recovery response is pending`, async () => {
      const f = fixture(); let release!: () => void;
      f.faults.pausePost(new Promise<void>((resolve) => { release = resolve; }));
      const running = f.run();
      while (!f.sessions.size) await new Promise((resolve) => setImmediate(resolve));
      const item = [...f.attempts.values()][0];
      item.stripeCheckoutSessionId = { S: [...f.sessions.values()][0].id };
      item.sessionCreationState = { S: state };
      release(); await assert.rejects(running, /lifecycle conflict/);
      assert.equal(item.sessionCreationState.S, state);
      assert.equal(f.posts.length, 1); assert.equal(f.sessions.size, 1);
    });
  }
  for (const target of ["ready", "expired", "creating", "retired"] as const) {
    it(`preserves PAID committed immediately before ${target} update`, async () => {
      const f = fixture();
      if (target === "creating" || target === "retired") {
        f.faults.failArm(); await assert.rejects(f.run());
        if (target === "retired") [...f.attempts.values()][0].createdAt = { S: new Date(Date.now() - 2 * 3600_000).toISOString() };
      } else {
        await f.run();
        if (target === "expired") [...f.sessions.values()][0].status = "expired";
      }
      const item = [...f.attempts.values()][0];
      const previous = structuredClone(item.sessionCreationState);
      f.faults.beforeUpdate((input, current) => {
        if (input.ExpressionAttributeValues?.[`:${target}`]) current.status = { S: "PAID" };
      });
      await assert.rejects(f.run(), /lifecycle conflict/);
      assert.equal(item.status.S, "PAID"); assert.deepEqual(item.sessionCreationState, previous);
    });
  }
  it("does not overwrite webhook failure with a concurrent expiry write", async () => {
    const f = fixture(); await f.run(); [...f.sessions.values()][0].status = "expired";
    f.faults.beforeUpdate((input, item) => {
      if (input.ExpressionAttributeValues?.[":expired"]) item.sessionCreationState = { S: "PAYMENT_FAILED" };
    });
    await assert.rejects(f.run(), /lifecycle conflict/);
    assert.equal([...f.attempts.values()][0].sessionCreationState.S, "PAYMENT_FAILED");
    assert.equal(f.posts.length, 1);
  });
  for (const [name, mutate] of [
    ["owner", (s: Stripe.Checkout.Session) => { s.client_reference_id = "other"; }],
    ["customer", (s: Stripe.Checkout.Session) => { s.customer = "cus_other"; }],
    ["mode", (s: Stripe.Checkout.Session) => { s.livemode = true; }],
    ["amount", (s: Stripe.Checkout.Session) => { s.amount_total = 1; }],
    ["currency", (s: Stripe.Checkout.Session) => { s.currency = "eur"; }],
    ["plan", (s: Stripe.Checkout.Session) => { s.metadata!.planCode = "OTHER"; }],
    ["price", (s: Stripe.Checkout.Session) => { s.line_items!.data[0].price!.id = "price_other"; }],
  ] as const) {
    it(`rejects recovered ${name} mismatch`, async () => {
      const f = fixture(); await f.run(); mutate([...f.sessions.values()][0]);
      await assert.rejects(f.run()); assert.equal(f.posts.length, 1);
    });
  }
  it("does not POST a recovered attempt under a different Stripe environment", async () => {
    const f = fixture(); f.faults.losePost(); await assert.rejects(f.run());
    await assert.rejects(f.run({ livemode: true }), /environment mismatch/); assert.equal(f.posts.length, 1);
  });
  it("retires an old unarmed attempt before allowing a new intent", async () => {
    const f = fixture(); f.faults.failArm(); await assert.rejects(f.run());
    [...f.attempts.values()][0].createdAt = { S: new Date(Date.now() - 2 * 3600_000).toISOString() };
    assert.equal((await f.run()).status, "EXPIRED"); assert.equal(f.posts.length, 0);
    assert.equal([...f.attempts.values()][0].sessionCreationState.S, "NOT_STARTED_EXPIRED");
    assert.equal((await f.run({ purchaseIntentId: "next" })).status, "READY");
  });
  it("requires signed failure evidence before resolving complete/unpaid", async () => {
    const f = fixture(); await f.run(); [...f.sessions.values()][0].status = "complete";
    await assert.rejects(f.run(), /przetwarzana/);
    [...f.attempts.values()][0].sessionCreationState = { S: "PAYMENT_FAILED" };
    assert.equal((await f.run()).status, "EXPIRED");
    assert.equal((await f.run({ purchaseIntentId: "next" })).status, "READY");
  });
  it("namespaces operation identities by authenticated user", () => {
    assert.notEqual(checkoutAttemptKey("a", "intent"), checkoutAttemptKey("b", "intent"));
  });
});

describe("resolver budgets", () => {
  it("rejects an SDK call after the budget without starting it", async () => {
    let calls = 0;
    const client = budgetedClient({ send: async () => { calls++; } });
    await assert.rejects(withResolverBudget(1, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5)); await client.send();
    }));
    assert.equal(calls, 0);
  });
  it("passes an abort signal and isolates concurrent invocation budgets", async () => {
    const signals: AbortSignal[] = [];
    const client = budgetedClient({ send: async (_?: unknown, options?: { abortSignal?: AbortSignal }) => { signals.push(options!.abortSignal!); } });
    await Promise.all([withResolverBudget(1000, async () => { await client.send(); assert.equal(signals[0], resolverBudget().signal); }),
      withResolverBudget(2000, async () => { await client.send(); assert.equal(signals[1], resolverBudget().signal); })]);
    assert.notEqual(signals[0], signals[1]);
  });
});
