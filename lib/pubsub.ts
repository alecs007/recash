import { redis } from "./redis";

export type WsEventType =
  | "notification:new"
  | "post:status_changed"
  | "post:code_ready"
  | "post:completed"
  | "post:cancelled";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
}

export function publishToUser(userId: string, event: WsEvent): void {
  const channel = `recash:user:${userId}`;
  const message = JSON.stringify(event);
  redis
    .publish(channel, message)
    .catch((err) =>
      console.error(`[pubsub] publish to ${channel} failed:`, err),
    );
}

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

export function publishPostStatus(
  payload: PostStatusPayload,
  affectedUserIds: string[] = [],
): void {
  const event: WsEvent<PostStatusPayload> = {
    type: "post:status_changed",
    payload,
  };
  // Post room — detail page
  publishToPost(payload.postId, event);
  // User channels — header active indicator
  for (const uid of affectedUserIds) {
    publishToUser(uid, event);
  }
}

export interface PostCompletedPayload {
  postId: string;
  actualValue: number;
  collectorEarning: number;
  posterEarning: number;
  bottleCount: number;
}

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
