import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { sendEmail } from "./email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://recash.ro";
const LOGO_URL = `${APP_URL}/images/recash-logo.webp`;

/** Haversine formula — returns distance in km between two lat/lng points */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RadarDispatchOptions {
  postId: string;
  postAuthorId: string;
  postLatitude: number;
  postLongitude: number;
  postLocationName: string | null;
  bottleCount: number;
  estimatedValue: number;
  collectorSharePercent: number;
}

/**
 * Fan-out radar notifications to all users whose radar center
 * is within radiusKm of the new post's location.
 *
 * Fire-and-forget — does not throw.
 */
export async function dispatchRadarNotifications(
  opts: RadarDispatchOptions,
): Promise<void> {
  try {
    // Fetch all active radars (excluding the post author)
    const radars = await prisma.radar.findMany({
      where: {
        active: true,
        userId: { not: opts.postAuthorId },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (radars.length === 0) return;

    const collectorEarning =
      (opts.estimatedValue * opts.collectorSharePercent) / 100;

    const matching = radars.filter((r) => {
      const dist = haversineKm(
        r.latitude,
        r.longitude,
        opts.postLatitude,
        opts.postLongitude,
      );
      return dist <= r.radiusKm;
    });

    if (matching.length === 0) return;

    const locationLabel = opts.postLocationName ?? "locația ta";

    await Promise.allSettled(
      matching.map(async (r) => {
        const firstName = r.user.name?.split(" ")[0] ?? "utilizator";

        // In-app notification
        await createNotification({
          userId: r.user.id,
          type: "SYSTEM",
          title: `📡 Radar: anunț nou la ${locationLabel}`,
          message: `${opts.bottleCount} sticle disponibile la ${locationLabel}. Câștiguri posibile: +${collectorEarning.toFixed(2)} RON.`,
          link: `/post/${opts.postId}`,
        });

        // Email if opted in
        if (r.emailEnabled && r.user.email) {
          await sendEmail({
            to: r.user.email,
            subject: `📡 Radar Recash: ${opts.bottleCount} sticle lângă tine`,
            html: buildRadarEmailHtml({
              firstName,
              bottleCount: opts.bottleCount,
              locationName: locationLabel,
              collectorEarning,
              radiusKm: r.radiusKm,
              postId: opts.postId,
            }),
          });
        }
      }),
    );
  } catch (err) {
    console.error("[dispatchRadarNotifications]", err);
  }
}

function buildRadarEmailHtml(opts: {
  firstName: string;
  bottleCount: number;
  locationName: string;
  collectorEarning: number;
  radiusKm: number;
  postId: string;
}): string {
  return `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

        <tr><td style="background:linear-gradient(135deg,#123424,#1a4d36);padding:28px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Recash" width="120" style="display:inline-block;max-width:120px;height:auto;"/>
        </td></tr>

        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#a3e635;letter-spacing:0.1em;text-transform:uppercase;">📡 Alertă Radar</p>
          <p style="margin:0 0 20px;font-size:17px;font-weight:700;color:#0f172a;">Bună, ${opts.firstName}!</p>
          <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.65;">
            A apărut un anunț nou în raza ta de <strong style="color:#123424;">${opts.radiusKm} km</strong>:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;margin-bottom:20px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#14532d;">🍾 ${opts.bottleCount} sticle</p>
                <p style="margin:0 0 6px;font-size:14px;color:#166534;">📍 ${opts.locationName}</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#16a34a;">+${opts.collectorEarning.toFixed(2)} RON pentru tine</p>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 12px;font-size:14px;color:#64748b;line-height:1.6;">
            Grăbește-te — alte persoane pot revendica anunțul înainte ta!
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 28px;">
          <div style="text-align:center;margin:16px 0 8px;">
            <a href="${APP_URL}/post/${opts.postId}"
               style="display:inline-block;background:#123424;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:100px;">
              Colectează acum →
            </a>
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            Primești acest email deoarece ai configurat un Radar Recash.<br/>
            <a href="${APP_URL}/profil" style="color:#a3e635;text-decoration:none;font-weight:600;">Modifică setările radarului</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
