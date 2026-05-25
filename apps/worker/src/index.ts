import { demoSearchFixtureHtml, sourceRegistry } from "@thor-crm/adapters";
import { buildScheduledDiscoverMessages } from "./crawler/scheduler";
import { handleRequest } from "./http/router";
import type { Env, DiscoverMessage, FetchMessage, MatchMessage } from "./runtime/env";
import { handleQueueBatch } from "./queue/handler";

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },

  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(scheduleDiscover(event, env));
  },

  queue(batch: MessageBatch<DiscoverMessage | FetchMessage | MatchMessage>, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(handleQueueBatch(batch, env));
  }
};

async function scheduleDiscover(event: ScheduledEvent, env: Env): Promise<void> {
  if (!env.DISCOVER_QUEUE) {
    console.warn("discover_queue_missing", { cron: event.cron });
    return;
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("discover_skipped_missing_supabase_config", { cron: event.cron });
    return;
  }

  const requestedAt = new Date(event.scheduledTime).toISOString();
  await env.DISCOVER_QUEUE.send({
    kind: "discover",
    sourceId: "demo",
    seedUrl: "https://example.test/listings",
    requestedAt,
    fixtureHtml: demoSearchFixtureHtml
  });

  for (const message of buildScheduledDiscoverMessages(sourceRegistry, requestedAt)) {
    await env.DISCOVER_QUEUE.send(message);
  }
}
