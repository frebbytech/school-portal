jest.mock("../../jobs/handlers", () => ({
  "test-job": jest.fn(),
}));

const handlers = require("../../jobs/handlers");
const { getQueue, events, resetForTests } = require("../../jobs/queue");

describe("background queue (in-process driver)", () => {
  const originalRedis = process.env.REDIS_URL;
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    await resetForTests();
    handlers["test-job"].mockReset();
  });
  afterAll(async () => {
    await resetForTests();
    if (originalRedis) process.env.REDIS_URL = originalRedis;
  });

  it("uses the in-process driver when there is no REDIS_URL", () => {
    expect(getQueue().driver).toBe("memory");
  });

  it("runs jobs one at a time, in order", async () => {
    const order = [];
    handlers["test-job"].mockImplementation(async ({ n }) => {
      order.push(`start ${n}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(`end ${n}`);
      return { n };
    });
    const queue = getQueue();
    await queue.add("test-job", { n: 1 });
    await queue.add("test-job", { n: 2 });
    await queue.drain();
    expect(order).toEqual(["start 1", "end 1", "start 2", "end 2"]);
  });

  it("re-emits progress and the result", async () => {
    handlers["test-job"].mockImplementation(async (data, ctx) => {
      ctx.progress({ done: 1, total: 2 });
      return { status: "completed", done: 2 };
    });
    const progress = jest.fn();
    const finished = jest.fn();
    events.on("progress", progress);
    events.on("finished", finished);
    const queue = getQueue();
    await queue.add("test-job", {});
    await queue.drain();
    expect(progress).toHaveBeenCalledWith({ done: 1, total: 2 });
    expect(finished).toHaveBeenCalledWith({ status: "completed", done: 2 });
  });

  it("reports a job that throws, and carries on with the next one", async () => {
    handlers["test-job"].mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ status: "completed" });
    const finished = jest.fn();
    events.on("finished", finished);
    const queue = getQueue();
    await queue.add("test-job", { publicationId: "p1" });
    await queue.add("test-job", { publicationId: "p2" });
    await queue.drain();
    expect(finished).toHaveBeenCalledTimes(2);
    expect(finished.mock.calls[0][0]).toMatchObject({ publicationId: "p1", status: "failed", needsLookup: true });
    expect(finished.mock.calls[1][0]).toMatchObject({ status: "completed" });
  });
});
