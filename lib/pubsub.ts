import { redis } from "./redis";

export type WsEventType =
  | "notification:new" // new Notification row created for a user
  | "post:status_changed" // post status mutated (claim, approve, complete, cancel)
  | "post:code_ready" // IN_PROGRESS code generated, poster should show it
  | "post:completed" // transaction finalised
  | "post:cancelled"; // post or collection cancelled

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
}

/**
 * Publish an event to a **user** channel.
 * Fire-and-forget — never throws.
 */
export function publishToUser(userId: string, event: WsEvent): void {
  const channel = `recash:user:${userId}`;
  const message = JSON.stringify(event);
  redis
    .publish(channel, message)
    .catch((err) =>
      console.error(`[pubsub] publish to ${channel} failed:`, err),
    );
}

/**
 * Publish an event to a **post** channel.
 * Fire-and-forget — never throws.
 */
export function publishToPost(postId: string, event: WsEvent): void {
  const channel = `recash:post:${postId}`;
  const message = JSON.stringify(event);
  redis
    .publish(channel, message)
    .catch((err) =>
      console.error(`[pubsub] publish to ${channel} failed:`, err),
    );
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
}

export function publishNotification(
  userId: string,
  notif: NotificationPayload,
): void {
  publishToUser(userId, { type: "notification:new", payload: notif });
}

export interface PostStatusPayload {
  postId: string;
  status: string;
  collectorId?: string | null;
  collectorName?: string | null;
  expiresAt?: string | null;
}

export function publishPostStatus(payload: PostStatusPayload): void {
  // Notify everyone watching the post
  publishToPost(payload.postId, {
    type: "post:status_changed",
    payload,
  });
}

export interface PostCompletedPayload {
  postId: string;
  actualValue: number;
  collectorEarning: number;
  posterEarning: number;
  bottleCount: number;
}

/** Called after the transaction is created in /complete. */
export function publishPostCompleted(
  postId: string,
  authorId: string,
  collectorId: string,
  payload: PostCompletedPayload,
): void {
  const event: WsEvent<PostCompletedPayload> = {
    type: "post:completed",
    payload,
  };
  publishToPost(postId, event);
  publishToUser(authorId, event);
  publishToUser(collectorId, event);
}

export interface PostCancelledPayload {
  postId: string;
  cancelledBy: "poster" | "collector";
  newStatus: string;
}

/** Called after a cancellation. */
export function publishPostCancelled(
  postId: string,
  affectedUserIds: string[],
  payload: PostCancelledPayload,
): void {
  const event: WsEvent<PostCancelledPayload> = {
    type: "post:cancelled",
    payload,
  };
  publishToPost(postId, event);
  for (const uid of affectedUserIds) {
    publishToUser(uid, event);
  }
}
