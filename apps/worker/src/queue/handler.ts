import type { DiscoverMessage, Env, FetchMessage, MatchMessage } from "../runtime/env";
import { handleFetchMessage } from "./fetchPipeline";

type QueueBody = DiscoverMessage | FetchMessage | MatchMessage;

export async function handleQueueBatch(batch: MessageBatch<QueueBody>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      await handleQueueMessage(message.body, env);
      message.ack();
    } catch (error) {
      console.error("queue_message_failed", { id: message.id, error: error instanceof Error ? error.message : String(error) });
      message.retry();
    }
  }
}

async function handleQueueMessage(body: QueueBody, env: Env): Promise<void> {
  if (body.kind === "fetch") {
    await handleFetchMessage(body, env);
    return;
  }

  console.log("queue_message_skipped", { kind: body.kind });
}
