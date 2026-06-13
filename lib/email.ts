const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Recash <noreply@recash.ro>";

// const LOGO_URL = process.env.NEXT_PUBLIC_APP_URL
//   ? `${process.env.NEXT_PUBLIC_APP_URL}/images/recash-logo.webp`
//   : "https://recash.ro/images/recash-logo.webp";

const LOGO_URL = `https://res.cloudinary.com/dqyq1oiwi/image/upload/v1780763158/recash-header-logo_ebwwid.avif`;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://recash.ro";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend API error:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] send error:", err);
    return false;
  }
}

function buildEmailHtml({
  name,
  bodyHtml,
  ctaUrl,
  ctaLabel,
}: {
  name: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const cta =
    ctaUrl && ctaLabel
      ? `
    <div style="text-align:center;margin:5px 0 30px 0;">
      <a href="${ctaUrl}"
         style="
           display:inline-block;
           background-color:#123424;
           color:#ffffff;
           text-decoration:none;
           font-weight:700;
           font-size:14px;
           padding:14px 32px;
           border-radius:100px;
           letter-spacing:0.02em;
         ">
        ${ctaLabel}
      </a>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Recash</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:32px 20px 10px 20px;text-align:center;">
              <img src="${LOGO_URL}" alt="Recash" width="180" height="auto"
                   style="display:inline-block;max-width:180px;height:auto;"/>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0f172a;">
                Bună, ${name}! 👋
              </p>
              ${bodyHtml}
            </td>
          </tr>

          <!-- CTA -->
          ${cta ? `<tr><td style="padding:0 32px;">${cta}</td></tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 28px;border-top:1px solid #f1f5f9;margin-top:16px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                Email-ul a fost generat automat de platforma Recash.<br/>
                <a href="${APP_URL}" style="color:#a3e635;text-decoration:none;font-weight:600;">recash.ro</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/termeni" style="color:#94a3b8;text-decoration:none;">Termeni și condiții</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendCollectorRequestEmail({
  to,
  authorName,
  collectorName,
  bottleCount,
  postId,
}: {
  to: string;
  authorName: string;
  collectorName: string;
  bottleCount: number;
  postId: string;
}) {
  const html = buildEmailHtml({
    name: authorName,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">
        <strong style="color:#123424;">${collectorName}</strong> dorește să colecteze
        cele <strong>${bottleCount} sticle</strong> din anunțul tău.
      </p>
      <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">
        Intră pe website pentru a <strong>aproba sau refuza</strong> cererea.
        Odată aprobat, colectorul are <strong>60 de minute</strong> la dispoziție să ajungă la tine.
      </p>
    `,
    ctaUrl: `${APP_URL}/post/${postId}`,
    ctaLabel: "Vezi cererea",
  });

  return sendEmail({
    to,
    subject: `${collectorName} vrea să colecteze sticlele tale 🍾`,
    html,
  });
}

export async function sendClaimApprovedEmail({
  to,
  collectorName,
  posterName,
  bottleCount,
  postId,
}: {
  to: string;
  collectorName: string;
  posterName: string;
  bottleCount: number;
  postId: string;
}) {
  const html = buildEmailHtml({
    name: collectorName,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">
        Cererea ta a fost <strong style="color:#16a34a;">aprobată</strong> de
        <strong style="color:#123424;">${posterName}</strong>! 🎉
      </p>
      <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">
        Ai <strong>60 de minute</strong> să ajungi la locație și să colectezi cele
        <strong>${bottleCount} sticle</strong>.<br/> Nu întârzia!
      </p>
    `,
    ctaUrl: `${APP_URL}/post/${postId}`,
    ctaLabel: "Deschide anunțul",
  });

  return sendEmail({
    to,
    subject: "Cererea ta a fost aprobată! Grăbește-te ⏰",
    html,
  });
}

export async function sendClaimDeniedEmail({
  to,
  collectorName,
  posterName,
}: {
  to: string;
  collectorName: string;
  posterName: string;
  postId: string;
}) {
  const html = buildEmailHtml({
    name: collectorName,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">
        Din păcate, <strong style="color:#123424;">${posterName}</strong> a
        <strong style="color:#ef4444;">refuzat</strong> cererea ta pentru acest anunț.
      </p>
      <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.6;">
        Nu-ți face griji, mai sunt multe sticle de colectat pe hartă! 🗺️
      </p>
    `,
    ctaUrl: `${APP_URL}/map`,
    ctaLabel: "Caută alte anunțuri",
  });

  return sendEmail({
    to,
    subject: "Cererea ta a fost refuzată",
    html,
  });
}
