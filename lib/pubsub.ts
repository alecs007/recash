import { redis } from "./redis";

export type WsEventType =
  | "connected"
  | "notification:new"
  | "post:status_changed"
  | "post:code_ready"
  | "post:completed"
  | "post:cancelled"
  | "post:rating_updated"
  | "chat:message"
  | "chat:typing";

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

export interface PostRatingPayload {
  postId: string;
  ratedBy: "poster" | "collector";
}

export function publishRatingUpdated(
  postId: string,
  affectedUserIds: string[],
  payload: PostRatingPayload,
): void {
  const event: WsEvent<PostRatingPayload> = {
    type: "post:rating_updated",
    payload,
  };
  publishToPost(postId, event);
  for (const uid of affectedUserIds) {
    publishToUser(uid, event);
  }
}

export interface ChatMessagePayload {
  id: string;
  postId: string;
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  text: string;
  createdAt: string;
}

export function publishChatMessage(
  postId: string,
  payload: ChatMessagePayload,
): void {
  publishToPost(postId, { type: "chat:message" as WsEventType, payload });
}

export interface ChatTypingPayload {
  postId: string;
  senderId: string;
  senderName: string | null;
}

export function publishChatTyping(
  postId: string,
  payload: ChatTypingPayload,
): void {
  publishToPost(postId, { type: "chat:typing" as WsEventType, payload });
}
