import type { Context, Middleware } from "../src/deps.deno.ts";
import { Router } from "../src/router.ts";
import { assertEquals } from "./deps.test.ts";

type TestContext = Context & {
    log: string[];
    route?: PropertyKey;
};

function context(route?: PropertyKey): TestContext {
    return { log: [], route } as unknown as TestContext;
}

async function run(router: Router<TestContext>, ctx: TestContext) {
    await router.middleware()(ctx, () => {
        ctx.log.push("next");
        return Promise.resolve();
    });
}

Deno.test("routes updates using async routing functions", async () => {
    const router = new Router<TestContext>(async (ctx) => {
        await Promise.resolve();
        return ctx.route;
    });
    router.route("match", (ctx) => ctx.log.push("route"));
    router.otherwise((ctx) => ctx.log.push("otherwise"));

    const ctx = context("match");
    await run(router, ctx);

    assertEquals(ctx.log, ["route"]);
});

Deno.test("uses otherwise middleware for missing and undefined routes", async () => {
    const router = new Router<TestContext>((ctx) => ctx.route);
    router.otherwise((ctx) => ctx.log.push("otherwise"));

    const missing = context("missing");
    const undefinedRoute = context();
    await run(router, missing);
    await run(router, undefinedRoute);

    assertEquals(missing.log, ["otherwise"]);
    assertEquals(undefinedRoute.log, ["otherwise"]);
});

Deno.test("passes through when no route or fallback matches", async () => {
    const router = new Router<TestContext>((ctx) => ctx.route);

    const ctx = context("missing");
    await run(router, ctx);

    assertEquals(ctx.log, ["next"]);
});

Deno.test("supports preinstalled symbol routes", async () => {
    const route = Symbol("route");
    const handlers = new Map<PropertyKey, Middleware<TestContext>>([
        [route, (ctx) => ctx.log.push("symbol")],
    ]);
    const router = new Router<TestContext>((ctx) => ctx.route, handlers);

    const ctx = context(route);
    await run(router, ctx);

    assertEquals(ctx.log, ["symbol"]);
});
