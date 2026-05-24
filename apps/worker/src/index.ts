import { handleRequest } from "./http/router";
import type { Env, DiscoverMessage, FetchMessage, MatchMessage } from "./runtime/env";

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },

  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(scheduleDiscover(event, env));
  },

  queue(batch: MessageBatch<DiscoverMessage | FetchMessage | MatchMessage>, _env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(handleQueueBatch(batch));
  }
};

async function scheduleDiscover(event: ScheduledEvent, env: Env): Promise<void> {
  if (!env.DISCOVER_QUEUE) {
    console.warn("discover_queue_missing", { cron: event.cron });
    return;
  }

  await env.DISCOVER_QUEUE.send({
    sourceId: "demo",
    seedUrl: "https://example.test/listings",
    requestedAt: new Date(event.scheduledTime).toISOString()
  });
}

async function handleQueueBatch(batch: MessageBatch<DiscoverMessage | FetchMessage | MatchMessage>): Promise<void> {
  for (const message of batch.messages) {
    console.log("queue_message_received", { id: message.id, body: message.body });
    message.ack();
  }
}
