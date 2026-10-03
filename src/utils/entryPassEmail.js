/**
 * Srishti 2.7 — Cybernetic Digital Entry Pass Email Template Generator
 * Embeds the 1:1 high-resolution cybernetic card image via CID inline attachment,
 * with graceful fallback for universal inbox compatibility.
 */

export function generateEntryPassEmailHtml({
  attendeeName = 'Participant',
  college = 'St Thomas College Thrissur',
  passCode = 'SR27-PASS',
  eventName = 'FEST PASS',
  status = 'VERIFIED'
}) {
  const isVerified = String(status).toUpperCase() === 'VERIFIED';
  const qrFallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(passCode)}&margin=4`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Srishti 2.7 Entry Pass</title>
</head>
<body style="margin: 0; padding: 25px 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff;">
  
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #030712;">
    <tr>
      <td align="center" style="padding: 10px;">
        
        <!-- Header message -->
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; width: 100%; margin-bottom: 22px; text-align: center;">
          <tr>
            <td align="center">
              <img src="https://srishti2-7.vercel.app/assets/logo.png" width="60" height="60" alt="Srishti 2.7 Logo" style="display: block; margin: 0 auto 12px auto; width: 60px; height: 60px; object-fit: contain; border: 0;" />
              <p style="color: #38bdf8; font-size: 13px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 6px 0;">Official Srishti 2.7 Pass</p>
              <h2 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">YOUR DIGITAL ENTRY DELEGATE PASS</h2>
            </td>
          </tr>
        </table>

        <!-- 1:1 CYBERNETIC PASS IMAGE (EMBEDDED INLINE VIA CID) -->
        <table cellpadding="0" cellspacing="0" border="0" width="660" style="max-width: 660px; width: 100%; margin: 0 auto; text-align: center;">
          <tr>
            <td align="center" style="padding: 0;">
              <img src="cid:srishti_entry_pass" alt="Srishti 2.7 Entry Pass" style="width: 100%; max-width: 660px; height: auto; border-radius: 16px; display: block; margin: 0 auto; box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 35px rgba(14,165,233,0.3); border: 1px solid rgba(56,189,248,0.35);" />
            </td>
          </tr>
        </table>

        <!-- Fallback / Accessible Information Box -->
        <table cellpadding="0" cellspacing="0" border="0" width="660" style="max-width: 660px; width: 100%; margin-top: 22px; background-color: #070a13; border-radius: 14px; border: 1px solid rgba(56,189,248,0.25);">
          <tr>
            <td style="padding: 24px 28px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <div style="font-size: 11px; color: #94a3b8; letter-spacing: 1.5px; font-weight: bold; text-transform: uppercase;">DELEGATE</div>
                    <div style="font-size: 22px; color: #ffffff; font-weight: 800; margin: 4px 0 2px 0; text-transform: uppercase;">${attendeeName}</div>
                    <div style="font-size: 14px; color: #64748b;">${college}</div>
                  </td>
                  <td align="right" valign="middle">
                    <div style="font-size: 11px; color: #94a3b8; letter-spacing: 1.5px; font-weight: bold; text-transform: uppercase;">PASS CODE</div>
                    <div style="font-family: 'Courier New', monospace; font-size: 22px; color: #38bdf8; font-weight: 800; margin: 4px 0 2px 0;">${passCode}</div>
                    <div style="font-size: 13px; color: ${isVerified ? '#10b981' : '#f59e0b'}; font-weight: 800;">
                      ${isVerified ? '● VERIFIED' : '● PENDING'}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Instructions & Portal Button -->
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; width: 100%; margin-top: 25px; text-align: center;">
          <tr>
            <td>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
                Present this digital pass or QR code at the registration desk for instant venue access.
                The card is also attached as a high-resolution PNG image to this email.
              </p>
              <div>
                <a href="https://srishti2-7.vercel.app/profile" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: bold; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 18px rgba(2,132,199,0.45);">
                  Open Srishti Delegate Portal →
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px; margin-top: 28px;">
                Srishti 2.7 • National Tech-Cultural Festival • Department of Computer Science • St Thomas College Thrissur
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}
