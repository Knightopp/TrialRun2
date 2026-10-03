/**
 * Srishti 2.7 — Cybernetic Digital Entry Pass Email Template Generator
 * Produces an email-safe, pixel-accurate HTML reproduction of the Srishti 2.7 entry pass card.
 */

export function generateEntryPassEmailHtml({
  eventName = 'EVENT PASS',
  attendeeName = 'Participant',
  college = 'College Name',
  passCode = 'SR27-PASS',
  teamSize = 1,
  status = 'VERIFIED'
}) {
  const isVerified = String(status).toUpperCase() === 'VERIFIED';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(passCode)}&margin=4`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Srishti 2.7 Entry Pass</title>
  <style>
    @media only screen and (max-width: 640px) {
      .ticket-container {
        width: 100% !important;
      }
      .ticket-body {
        display: block !important;
        width: 100% !important;
        border-radius: 16px 16px 0 0 !important;
        border-right: none !important;
        border-bottom: 2px dashed #0284c7 !important;
        box-sizing: border-box !important;
      }
      .ticket-stub {
        display: block !important;
        width: 100% !important;
        border-radius: 0 0 16px 16px !important;
        box-sizing: border-box !important;
      }
      .event-title {
        font-size: 22px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #030712;">
    <tr>
      <td align="center" style="padding: 10px;">
        
        <!-- Header message -->
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; width: 100%; margin-bottom: 20px;">
          <tr>
            <td align="center">
              <p style="color: #38bdf8; font-size: 13px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px 0;">Official Registration Pass</p>
              <h2 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">SRISHTI 2.7 NATIONAL TECH-CULTURAL FESTIVAL</h2>
            </td>
          </tr>
        </table>

        <!-- THE EXACT CYBERNETIC TICKET -->
        <table class="ticket-container" cellpadding="0" cellspacing="0" border="0" width="660" style="max-width: 660px; width: 660px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(14,165,233,0.2); border: 1px solid rgba(56,189,248,0.35);">
          <tr>
            <!-- LEFT BODY: Cybernetic Glow & Attendee Info -->
            <td class="ticket-body" width="460" valign="top" style="width: 460px; background-color: #070a13; background-image: repeating-linear-gradient(115deg, rgba(14,165,233,0) 0px, rgba(14,165,233,0) 35px, rgba(14,165,233,0.15) 35px, rgba(14,165,233,0.35) 55px, rgba(14,165,233,0) 55px, rgba(14,165,233,0) 80px); padding: 32px 30px; border-right: 2px dashed rgba(56,189,248,0.35); position: relative;">
              
              <!-- Header tag -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 14px;">
                <tr>
                  <td>
                    <div style="font-family: 'Courier New', monospace; font-size: 13px; color: #e2e8f0; letter-spacing: 2px; font-weight: bold; line-height: 1.3;">
                      SRISHTI 2.7<br/><span style="color: #38bdf8;">ENTRY PASS</span>
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <div style="height: 2px; width: 60px; background-color: #38bdf8;"></div>
                  </td>
                </tr>
              </table>

              <!-- Event Title -->
              <div class="event-title" style="font-family: 'Arial Black', Impact, -apple-system, sans-serif; font-size: 26px; color: #ffffff; margin: 0 0 18px 0; line-height: 1.1; text-transform: uppercase; letter-spacing: -0.5px;">
                ${eventName}
              </div>

              <!-- Attendee Info with Cyan Bar -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="4" style="width: 4px; background-color: #00e5ff; border-radius: 2px;"></td>
                  <td style="padding-left: 14px;">
                    <div style="color: #ffffff; font-weight: bold; font-size: 19px; text-transform: capitalize; margin: 0; line-height: 1.2;">
                      ${attendeeName}
                    </div>
                    <div style="color: #94a3b8; font-size: 13px; margin-top: 3px;">
                      ${college}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Bottom Row: Status Badge & Team Size -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <!-- Status Glass Badge -->
                  <td valign="bottom">
                    <table cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(255,255,255,0.06); border: 1px solid rgba(56,189,248,0.35); border-radius: 10px; padding: 6px 14px;">
                      <tr>
                        <td>
                          <div style="font-size: 10px; color: #94a3b8; letter-spacing: 1px; font-weight: bold; margin-bottom: 3px;">STATUS</div>
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right: 6px;">
                                <div style="width: 14px; height: 14px; background-color: ${isVerified ? '#10b981' : '#f59e0b'}; border-radius: 50%; text-align: center; line-height: 14px; font-size: 10px; color: #ffffff; font-weight: bold;">✓</div>
                              </td>
                              <td>
                                <span style="color: ${isVerified ? '#10b981' : '#f59e0b'}; font-weight: 800; font-size: 14px; letter-spacing: 1px;">
                                  ${isVerified ? 'VERIFIED' : 'PENDING'}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Team Size -->
                  <td align="right" valign="bottom">
                    <div style="font-size: 11px; color: #94a3b8; letter-spacing: 1px; font-weight: bold; margin-bottom: 2px;">TEAM</div>
                    <div style="color: #ffffff; font-weight: bold; font-size: 18px; letter-spacing: 0.5px;">${teamSize} Member(s)</div>
                  </td>
                </tr>
              </table>

            </td>

            <!-- RIGHT STUB: White Section with QR Code -->
            <td class="ticket-stub" width="200" valign="middle" align="center" style="width: 200px; background-color: #ffffff; padding: 24px 18px; text-align: center; position: relative;">
              
              <!-- SCAN ME -->
              <div style="font-family: 'Arial Black', Impact, sans-serif; font-size: 16px; font-weight: 900; color: #000000; letter-spacing: 1px; margin-bottom: 14px;">
                SCAN ME
              </div>

              <!-- Bracketed QR Code Container -->
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td style="border: 3px solid #06b6d4; border-radius: 8px; padding: 6px; background-color: #ffffff;">
                    <img src="${qrUrl}" width="125" height="125" alt="Entry Pass QR" style="display: block; border: 0; outline: none; text-decoration: none;" />
                  </td>
                </tr>
              </table>

              <!-- Participant Monospace Code -->
              <div style="font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; color: #475569; letter-spacing: 1px; margin-top: 12px;">
                ${passCode}
              </div>

            </td>
          </tr>
        </table>

        <!-- Instructions & Portal Button -->
        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; width: 100%; margin-top: 25px; text-align: center;">
          <tr>
            <td>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 18px 0;">
                Please show this pass (digital on phone or printed) at the registration desk for instant check-in.
              </p>
              <div>
                <a href="https://srishti2-7.vercel.app/profile" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(2,132,199,0.4);">
                  View Interactive 3D Pass on Srishti Portal →
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
                Srishti 2.7 • National Tech-Cultural Festival • St Thomas College Thrissur
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
