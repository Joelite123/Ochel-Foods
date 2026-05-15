import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";

const router = Router();

/**
 * POST /api/newsletter/send
 * Send a newsletter email to a list of recipients.
 * Requires SMTP env vars.
 */
router.post("/send", async (req: Request, res: Response) => {
  const { subject, body, recipients } = req.body as {
    subject: string;
    body: string;
    recipients: Array<{ email: string; name?: string }>;
  };

  if (!subject || !body || !recipients?.length) {
    return res.status(400).json({ error: "subject, body, and recipients required" });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || smtpUser || "noreply@ochelfoods.com";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(500).json({
      error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.",
    });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: `O'chel Foods <${fromEmail}>`,
        to: recipient.email,
        subject,
        text: body,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#E8192C;padding:20px;text-align:center">
            <h1 style="color:white;margin:0;font-size:24px">O'chel Foods</h1>
          </div>
          <div style="padding:24px;background:#fff">
            ${body.split("\n").map((l) => l ? `<p style="margin:0 0 12px">${l}</p>` : "<br/>").join("")}
          </div>
          <div style="padding:16px;background:#f9f9f9;text-align:center;font-size:12px;color:#999">
            <p>You're receiving this because you subscribed to O'chel Foods updates.</p>
            <p>O'chel Foods | +234 905 635 1651</p>
          </div>
        </div>`,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return res.json({ sent, failed, total: recipients.length });
});

export default router;
