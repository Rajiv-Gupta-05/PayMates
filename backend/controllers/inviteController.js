const nodemailer = require('nodemailer');

// ─── Validate SMTP config at startup ─────────────────────────────────────────
const smtpReady =
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_USER !== 'your-gmail@gmail.com' &&
  process.env.SMTP_PASS !== 'your-16-char-app-password';

if (!smtpReady) {
  console.warn(`
⚠️  INVITE (Email): Gmail SMTP is NOT configured.
    Set SMTP_USER and SMTP_PASS in backend/.env
    Get an App Password → https://myaccount.google.com/apppasswords
  `);
}

// ─── Build invite HTML email ──────────────────────────────────────────────────
function buildEmailHTML(senderName, personalMessage, registerLink) {
  const msgBlock = personalMessage
    ? `<div style="margin:20px 0;padding:16px 20px;background:rgba(162,155,254,0.08);border-left:3px solid #a29bfe;border-radius:8px;">
         <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);font-style:italic;line-height:1.6;">"${personalMessage}"</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to PayMates!</title>
</head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:100%;background:linear-gradient(145deg,#0f1627,#161e35);border-radius:20px;border:1px solid rgba(0,255,204,0.12);overflow:hidden;">
          <tr><td style="height:3px;background:linear-gradient(90deg,#00ffcc,#0099ff,#a29bfe);"></td></tr>
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;background:linear-gradient(135deg,rgba(0,255,204,0.06),rgba(0,123,255,0.06));">
              <h1 style="margin:0;font-size:34px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PayMates<span style="color:#00ffcc;">.</span></h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.35);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Split Expenses · Effortlessly</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 36px;">
              <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#ffffff;">Hey there! 👋</p>
              <p style="margin:0 0 16px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.75;">
                <strong style="color:#ffffff;">${senderName}</strong> has invited you to join
                <strong style="color:#00ffcc;">PayMates</strong> — the smartest way to track,
                split, and settle shared expenses with friends and groups.
              </p>
              ${msgBlock}
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(0,255,204,0.04);border:1px solid rgba(0,255,204,0.12);border-radius:14px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 12px;font-size:13px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">✨ What you can do with PayMates</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.7);">💸 &nbsp;Split bills with friends &amp; groups instantly</td></tr>
                      <tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.7);">📊 &nbsp;Track who owes what in real-time</td></tr>
                      <tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.7);">🤝 &nbsp;Settle up with one tap</td></tr>
                      <tr><td style="padding:5px 0;font-size:14px;color:rgba(255,255,255,0.7);">📈 &nbsp;Smart spending analytics</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;margin:32px 0 20px;">
                <a href="${registerLink}" style="display:inline-block;background:linear-gradient(135deg,#00ffcc,#0099ff);color:#0b0f19;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:50px;">
                  Join PayMates Now →
                </a>
              </div>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center;">
                Or copy this link: <a href="${registerLink}" style="color:#00ffcc;word-break:break-all;">${registerLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);text-align:center;line-height:1.7;">
                This invite was sent by <strong style="color:rgba(255,255,255,0.35);">${senderName}</strong> through PayMates.<br>
                If you weren't expecting this, you can safely ignore this email.
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

// @desc    Send an invite via email
// @route   POST /api/invite
// @access  Private
exports.sendInvite = async (req, res) => {
  try {
    const { type, value, message } = req.body;
    const senderName = req.user?.name || 'A friend';

    if (!type || !value) {
      return res.status(400).json({ message: 'type and value are required' });
    }

    if (type !== 'email') {
      return res.status(400).json({ message: "Only email invites are supported" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (!smtpReady) {
      return res.status(503).json({
        message: 'Email delivery is not configured. Set SMTP_USER and SMTP_PASS in backend/.env',
        code: 'SMTP_NOT_CONFIGURED',
      });
    }

    const registerLink = `${process.env.APP_URL || 'http://localhost:4200'}/register`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"PayMates" <${process.env.SMTP_USER}>`,
      to: value.trim(),
      subject: `${senderName} invited you to join PayMates! 🎉`,
      html: buildEmailHTML(senderName, message?.trim() || '', registerLink),
    });

    console.log(`✅ Email invite sent to ${value.trim()} — MessageId: ${info.messageId}`);
    return res.json({ success: true, message: `Invite email sent to ${value.trim()}` });

  } catch (error) {
    console.error('Invite error:', error.message || error);

    // ── Gmail SMTP errors ─────────────────────────────────────────────
    if (error.code === 'EAUTH') {
      return res.status(500).json({
        message: 'Gmail authentication failed. Check your App Password at https://myaccount.google.com/apppasswords',
        code: 'SMTP_AUTH_FAILED',
      });
    }
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      return res.status(500).json({
        message: 'Cannot connect to Gmail SMTP. Check your internet connection.',
        code: 'SMTP_CONNECTION_FAILED',
      });
    }

    res.status(500).json({ message: 'Failed to send invite. ' + (error.message || 'Unknown error') });
  }
};
