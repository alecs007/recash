import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
        metadata: params.metadata ?? null,
      },
    });
  } catch (err) {
    console.error("[createNotification] error:", err);
  }
}

export async function notifyPostClaimed(
  posterId: string,
  postId: string,
  collectorName: string,
  bottleCount: number,
) {
  return createNotification({
    userId: posterId,
    type: "POST_CLAIMED",
    title: "Cineva vrea să îți colecteze sticlele!",
    message: `${collectorName} dorește să colecteze cele ${bottleCount} sticle. Aprobă sau refuză cererea.`,
    link: `/post/${postId}`,
    metadata: { postId, collectorName },
  });
}

export async function notifyClaimApproved(
  collectorId: string,
  postId: string,
  posterName: string,
) {
  return createNotification({
    userId: collectorId,
    type: "POST_CLAIMED",
    title: "Cererea ta a fost aprobată! 🎉",
    message: `${posterName} a aprobat cererea ta. Ai 30 de minute să ajungi la locație.`,
    link: `/post/${postId}`,
    metadata: { postId, action: "approved" },
  });
}

export async function notifyClaimDenied(
  collectorId: string,
  postId: string,
  posterName: string,
) {
  return createNotification({
    userId: collectorId,
    type: "POST_CANCELLED",
    title: "Cererea ta a fost refuzată",
    message: `${posterName} a refuzat cererea ta pentru acest anunț.`,
    link: `/map`,
    metadata: { postId, action: "denied" },
  });
}

export async function notifyPostCompleted(
  userId: string,
  postId: string,
  earning: number,
  role: "poster" | "collector",
) {
  return createNotification({
    userId,
    type: "POST_COMPLETED",
    title: "Tranzacție finalizată! ✅",
    message:
      role === "poster"
        ? `Felicitări! Ai primit ${earning.toFixed(2)} RON pentru sticlele tale.`
        : `Felicitări! Ai câștigat ${earning.toFixed(2)} RON din această colectare.`,
    link: `/post/${postId}`,
    metadata: { postId, earning },
  });
}

export async function notifyPostCancelled(
  userId: string,
  postId: string,
  cancelledBy: "poster" | "collector",
) {
  return createNotification({
    userId,
    type: "POST_CANCELLED",
    title: "Anunț anulat",
    message:
      cancelledBy === "poster"
        ? "Posterul a anulat acest anunț."
        : "Colectorul a anulat colectarea. Anunțul tău este din nou disponibil.",
    link: `/profil/postari`,
    metadata: { postId, cancelledBy },
  });
}

export async function notifyTimerWarning(
  collectorId: string,
  postId: string,
  minutesLeft: number,
) {
  return createNotification({
    userId: collectorId,
    type: "COLLECTOR_ARRIVED",
    title: `⏰ Timp rămas: ${minutesLeft} minute`,
    message: `Grăbește-te! Mai ai ${minutesLeft} minute să ajungi la locație.`,
    link: `/post/${postId}`,
    metadata: { postId },
  });
}

export async function notifyRatingReceived(
  userId: string,
  rating: number,
  reviewerName: string,
) {
  return createNotification({
    userId,
    type: "RATING_RECEIVED",
    title: "Ai primit un rating nou! ⭐",
    message: `${reviewerName} ți-a acordat ${rating} ${rating === 1 ? "stea" : "stele"}.`,
    link: `/profil`,
    metadata: { rating, reviewerName },
  });
}
