import QRCode from 'qrcode';
import { toPng } from 'html-to-image';

/**
 * Renders the exact cybernetic Srishti 2.7 Entry Pass card.
 * Priority 1: Snapshots the exact live DOM pass element from the profile page.
 * Priority 2: Canvas-based pixel-perfect fallback.
 */
function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
    }
  });
}

function drawImageCover(ctx, img, x, y, w, h, alignX = 0.5, alignY = 0.5) {
  if (!img || !img.width || !img.height) return;
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sWidth, sHeight, sx, sy;

  if (imgRatio > targetRatio) {
    sHeight = img.height;
    sWidth = img.height * targetRatio;
    sx = (img.width - sWidth) * alignX;
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = img.width / targetRatio;
    sx = 0;
    sy = (img.height - sHeight) * alignY;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

export async function generateCardImagePng({
  attendeeName = 'Participant',
  college = 'St Thomas College Thrissur',
  passCode = 'SRI27-PASS',
  passToken = '',
  events = [],
  isVerified = true,
  statusText = 'VERIFIED'
}) {
  // 1. Primary: Snapshot exact live DOM pass card from the user's screen
  if (typeof document !== 'undefined') {
    const livePass = document.getElementById('participant-ticket-card') || document.querySelector('.tear-ticket');
    if (livePass) {
      try {
        const domDataUrl = await toPng(livePass, {
          pixelRatio: 2,
          cacheBust: true,
          quality: 1
        });
        if (domDataUrl && domDataUrl.length > 1000) {
          return domDataUrl;
        }
      } catch (domErr) {
        console.warn('DOM pass snapshot notice, falling back to canvas:', domErr);
      }
    }
  }

  // 2. High-fidelity Canvas rendering matching the TearTicket pass
  const [bgImg, stubImg] = await Promise.all([
    loadCanvasImage('/assets/ticket-bg-dark.png'),
    loadCanvasImage('/assets/ticket-stub-light.jpg')
  ]);

  // High-res canvas: 1320 x 640 (2x scale of 660 x 320 for Retina display crispness)
  const W = 1320;
  const H = 640;
  const stubW = 380;
  const bodyW = W - stubW; // 940
  const R = 32; // Corner radius (16 * 2)

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Helper: rounded rectangle path
  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 1. Clip outer rounded ticket container
  ctx.save();
  drawRoundedRect(0, 0, W, H, R);
  ctx.clip();

  // ----------------------------------------------------
  // LEFT BODY SECTION (0 to bodyW)
  // ----------------------------------------------------
  ctx.fillStyle = '#070a13';
  ctx.fillRect(0, 0, bodyW, H);

  if (bgImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, bodyW, H);
    ctx.clip();
    // Draw cyber artwork aligned to the right so the glowing 3D emblem shines beside perforation
    drawImageCover(ctx, bgImg, 0, 0, bodyW, H, 1.0, 0.5);
    ctx.restore();
  }

  // Dark cyber vignette overlay: provides crisp text contrast on the left, let emblem pop on the right
  const bodyOverlay = ctx.createLinearGradient(0, 0, bodyW, 0);
  bodyOverlay.addColorStop(0, 'rgba(3, 5, 12, 0.94)');
  bodyOverlay.addColorStop(0.55, 'rgba(3, 5, 12, 0.72)');
  bodyOverlay.addColorStop(1, 'rgba(3, 5, 12, 0.25)');
  ctx.fillStyle = bodyOverlay;
  ctx.fillRect(0, 0, bodyW, H);

  // Content Padding: left = 60, top = 55
  // Header Tag
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.fillStyle = '#e2e8f0';
  ctx.letterSpacing = '3px';
  ctx.fillText('SRISHTI 2.7', 60, 85);

  ctx.fillStyle = '#38bdf8';
  ctx.fillText('DELEGATE PASS', 60, 115);

  // Cyan horizontal accent rule
  const lineGrad = ctx.createLinearGradient(270, 105, 390, 105);
  lineGrad.addColorStop(0, '#38bdf8');
  lineGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(270, 107, 120, 4);

  // Main Attendee Name (Akira style matching profile)
  ctx.font = '900 48px "Akira", "Akira Expanded", "Outfit", "Arial Black", sans-serif';
  const nameGrad = ctx.createLinearGradient(60, 160, 60, 230);
  nameGrad.addColorStop(0, '#ffffff');
  nameGrad.addColorStop(0.4, '#ffffff');
  nameGrad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = nameGrad;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
  ctx.shadowBlur = 24;

  const displayName = (attendeeName || 'PARTICIPANT').toUpperCase();
  // If name is long, scale font size
  if (displayName.length > 20) {
    ctx.font = '900 34px "Akira", "Akira Expanded", "Outfit", "Arial Black", sans-serif';
  } else if (displayName.length > 14) {
    ctx.font = '900 40px "Akira", "Akira Expanded", "Outfit", "Arial Black", sans-serif';
  }
  ctx.fillText(displayName, 60, 195);
  ctx.shadowBlur = 0; // Reset shadow

  // Cyan vertical accent pill & College name
  ctx.fillStyle = '#00e5ff';
  drawRoundedRect(60, 222, 7, 46, 3);
  ctx.fill();

  ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(college || 'St Thomas College Thrissur', 82, 254);

  // Registered Events Badges
  const eventList = events && events.length > 0 ? events : ['FEST ALL-ACCESS DELEGATE'];
  let badgeX = 60;
  const badgeY = 300;
  const badgeHeight = 38;

  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  eventList.slice(0, 3).forEach(evt => {
    const text = (evt || '').toUpperCase();
    const textWidth = ctx.measureText(text).width;
    const badgeW = textWidth + 28;

    if (badgeX + badgeW < bodyW - 80) {
      // Badge background
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      drawRoundedRect(badgeX, badgeY, badgeW, badgeHeight, 8);
      ctx.fill();

      // Badge border
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Badge text
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(text, badgeX + 14, badgeY + 26);

      badgeX += badgeW + 14;
    }
  });

  if (eventList.length > 3) {
    const moreText = `+${eventList.length - 3} MORE`;
    const mWidth = ctx.measureText(moreText).width + 24;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    drawRoundedRect(badgeX, badgeY, mWidth, badgeHeight, 8);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(moreText, badgeX + 12, badgeY + 26);
  }

  // Bottom Row: Status Badge (bottom-left)
  const statusBoxW = 210;
  const statusBoxH = 88;
  const statusBoxX = 60;
  const statusBoxY = H - 130;

  // Frosted status glass container
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  drawRoundedRect(statusBoxX, statusBoxY, statusBoxW, statusBoxH, 18);
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Status label
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.letterSpacing = '2px';
  ctx.fillText('STATUS', statusBoxX + 20, statusBoxY + 30);

  // Status green circle
  const statusColor = isVerified ? '#10b981' : '#f59e0b';
  ctx.beginPath();
  ctx.arc(statusBoxX + 32, statusBoxY + 58, 14, 0, Math.PI * 2);
  ctx.fillStyle = statusColor;
  ctx.shadowColor = statusColor;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Checkmark inside circle
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(statusBoxX + 26, statusBoxY + 58);
  ctx.lineTo(statusBoxX + 30, statusBoxY + 63);
  ctx.lineTo(statusBoxX + 38, statusBoxY + 52);
  ctx.stroke();

  // Status text
  ctx.font = '900 24px "Arial Black", sans-serif';
  ctx.fillStyle = statusColor;
  ctx.fillText(statusText || 'VERIFIED', statusBoxX + 56, statusBoxY + 66);

  // Bottom Row: Events Enrolled (bottom-right)
  const eventsCount = events && events.length > 0 ? events.length : 1;
  ctx.textAlign = 'right';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('EVENTS ENROLLED', bodyW - 80, statusBoxY + 32);

  ctx.font = '900 32px "Akira", "Akira Expanded", "Arial Black", -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${eventsCount} Event(s)`, bodyW - 80, statusBoxY + 70);
  ctx.textAlign = 'left'; // Reset

  // ----------------------------------------------------
  // RIGHT STUB SECTION (bodyW to W)
  // ----------------------------------------------------
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bodyW, 0, stubW, H);

  if (stubImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyW, 0, stubW, H);
    ctx.clip();
    drawImageCover(ctx, stubImg, bodyW, 0, stubW, H, 0.5, 0.5);
    ctx.restore();
  }

  // Clean stub background matching official artwork

  // SCAN ME Header
  ctx.font = '900 28px "Akira", "Akira Expanded", "Arial Black", Impact, sans-serif';
  ctx.fillStyle = '#050714';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1.5px';
  const stubCenterX = bodyW + stubW / 2;
  ctx.fillText('SCAN ME', stubCenterX, 95);

  // Generate & Draw Server-Authoritative QR Code (Level H error correction)
  let qrContent = passCode;
  try {
    const { generatePassPayload } = await import('./cryptoSecurity');
    qrContent = generatePassPayload(passCode, passToken, attendeeName);
  } catch (_) {}

  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' }
  });

  const qrImage = new Image();
  await new Promise(resolve => {
    qrImage.onload = resolve;
    qrImage.src = qrDataUrl;
  });

  const qrSize = 250;
  const qrX = stubCenterX - qrSize / 2;
  const qrY = 135;

  // Cyan corner bracket markers around QR code
  const bracketLen = 32;
  const bracketThick = 7;
  const bracketOffset = 14;
  const bx1 = qrX - bracketOffset;
  const by1 = qrY - bracketOffset;
  const bx2 = qrX + qrSize + bracketOffset;
  const by2 = qrY + qrSize + bracketOffset;

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = bracketThick;
  ctx.lineCap = 'round';

  // Top-left
  ctx.beginPath();
  ctx.moveTo(bx1 + bracketLen, by1);
  ctx.lineTo(bx1, by1);
  ctx.lineTo(bx1, by1 + bracketLen);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(bx2 - bracketLen, by1);
  ctx.lineTo(bx2, by1);
  ctx.lineTo(bx2, by1 + bracketLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(bx1, by2 - bracketLen);
  ctx.lineTo(bx1, by2);
  ctx.lineTo(bx1 + bracketLen, by2);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(bx2 - bracketLen, by2);
  ctx.lineTo(bx2, by2);
  ctx.lineTo(bx2, by2 - bracketLen);
  ctx.stroke();

  // Draw QR Image
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  // Logo in center of QR (excavated white badge matching website QRCodeSVG)
  const badgeSize = 58;
  const badgeRadius = 10;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(stubCenterX - badgeSize / 2, qrY + qrSize / 2 - badgeSize / 2, badgeSize, badgeSize, badgeRadius);
  ctx.fill();

  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
      logoImg.src = origin ? `${origin}/assets/logo.png` : '/assets/logo.png';
    });

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const logoDrawSize = 44;
      ctx.drawImage(
        logoImg,
        stubCenterX - logoDrawSize / 2,
        qrY + qrSize / 2 - logoDrawSize / 2,
        logoDrawSize,
        logoDrawSize
      );
    } else {
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('SR', stubCenterX, qrY + qrSize / 2 + 8);
    }
  } catch (logoErr) {
    console.warn('Center logo draw notice:', logoErr);
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('SR', stubCenterX, qrY + qrSize / 2 + 8);
  }

  // Participant Code below QR
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(passCode, stubCenterX, qrY + qrSize + 48);

  ctx.textAlign = 'left'; // Reset
  ctx.restore(); // Restore outer clip

  // ----------------------------------------------------
  // PERFORATION LINE & 12 HOLE CUTOUTS (Matching TearTicket)
  // ----------------------------------------------------
  ctx.save();
  ctx.fillStyle = '#000000'; // Cutout punch through

  // Top semi-circular notch cutout
  ctx.beginPath();
  ctx.arc(bodyW, 0, 18, 0, Math.PI);
  ctx.fill();

  // Bottom semi-circular notch cutout
  ctx.beginPath();
  ctx.arc(bodyW, H, 18, Math.PI, 0);
  ctx.fill();

  // 12 circular perforation holes
  for (let i = 0; i < 12; i++) {
    const holeY = (H / 13) * (i + 1);
    ctx.beginPath();
    ctx.arc(bodyW, holeY, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Borderless pass matching TearTicket aesthetic

  return canvas.toDataURL('image/png');
}

/**
 * Universal rock-solid PNG downloader using Blob Object URL
 * Guarantees .png format and compatibility across desktop & mobile browsers
 */
export function downloadPngFromDataUrl(dataUrl, filename = 'srishti_entry_pass.png') {
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    const safeFilename = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1200);
    return true;
  } catch (err) {
    console.warn('Fallback download link:', err);
    const safeFilename = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}
