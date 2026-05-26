import type { DiscoverMessage, Env, FetchMessage, MatchMessage } from "../runtime/env";
import { recordCrawlFailure } from "./crawlGovernance";
import { handleDiscoverMessage } from "./discoverPipeline";
import { handleFetchMessage } from "./fetchPipeline";

type QueueBody = DiscoverMessage | FetchMessage | MatchMessage;

export async function handleQueueBatch(batch: MessageBatch<QueueBody>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      await handleQueueMessage(message.body, env);
      message.ack();
    } catch (error) {
      console.error("queue_message_failed", { id: message.id, error: error instanceof Error ? error.message : String(error) });
      await recordQueueFailure(message.body, env, error);
      if (isPermanentQueueError(error)) {
        message.ack();
        continue;
      }
      message.retry();
    }
  }
}

async function handleQueueMessage(body: QueueBody, env: Env): Promise<void> {
  if (body.kind === "discover") {
    await handleDiscoverMessage(body, env);
    return;
  }

  if (body.kind === "fetch") {
    await handleFetchMessage(body, env);
    return;
  }

  console.log("queue_message_skipped", { kind: body.kind });
}

async function recordQueueFailure(body: QueueBody, env: Env, error: unknown): Promise<void> {
  if (!("sourceId" in body) || !body.sourceId) {
    return;
  }

  const results = await Promise.allSettled([recordCrawlFailure(env, body.sourceId, error)]);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") {
    console.warn("crawl_failure_governance_failed", {
      sourceId: body.sourceId,
      error: failure.reason instanceof Error ? failure.reason.message : String(failure.reason)
    });
  }
}

function isPermanentQueueError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const htmlFetchStatus = message.match(/^html_fetch_failed:(\d{3})$/u)?.[1];
  const isPermanentHttpFailure = htmlFetchStatus ? Number(htmlFetchStatus) >= 400 && Number(htmlFetchStatus) < 500 && Number(htmlFetchStatus) !== 429 : false;

  return (
    message === "html_fetch_too_large" ||
    isPermanentHttpFailure ||
    message.startsWith("listing_parse_failed:") ||
    message === "listing_discover_failed:missing_listing_links" ||
    message === "unapproved_seed_url" ||
    message === "invalid_crawl_url" ||
    message === "unsupported_crawl_url_protocol" ||
    message.startsWith("robots_disallowed_seed_url:")
  );
}
