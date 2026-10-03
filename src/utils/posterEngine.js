/**
 * EnrollIQ — Poster engine
 * ------------------------------------------------------------------
 * Save as:  frontend/src/utils/posterEngine.js
 *
 * Draws school posters (festival wishes, holiday notices, announcements)
 * on an HTML canvas. All artwork is drawn with code — no image files —
 * so it is licence-free, tiny, and the text (school name, dates, wishes)
 * is always spelled exactly as typed. The AI never draws the words.
 *
 * Works with any Canvas 2D context (browser <canvas>, or node canvas
 * for testing), because drawPoster() only touches the ctx it is given.
 */

const TAU = Math.PI * 2

/* ═══════════════ public config ═══════════════ */
export const SIZES = {
  portrait: { w: 1080, h: 1350, label: 'Portrait 4:5 — best for the parent app' },
  square:   { w: 1080, h: 1080, label: 'Square 1:1 — WhatsApp / Instagram' },
  story:    { w: 1080, h: 1920, label: 'Story 9:16 — status / reels' },
}

export const TEMPLATES = [
  { key: 'diwali',      label: 'Diwali',           emoji: '🪔', group: 'Festival',
    headline: 'Happy Diwali', sub: 'May the festival of lights fill your home with joy, health and prosperity', tag: '' },
  { key: 'holi',        label: 'Holi',             emoji: '🎨', group: 'Festival',
    headline: 'Happy Holi', sub: 'Wishing you a season of colour, laughter and togetherness', tag: '' },
  { key: 'eid',         label: 'Eid',              emoji: '🌙', group: 'Festival',
    headline: 'Eid Mubarak', sub: 'May this blessed day bring peace, happiness and togetherness to your family', tag: '' },
  { key: 'christmas',   label: 'Christmas',        emoji: '🎄', group: 'Festival',
    headline: 'Merry Christmas', sub: 'Warm wishes for a joyful season and a wonderful new year', tag: '' },
  { key: 'sankranti',   label: 'Sankranti',        emoji: '🪁', group: 'Festival',
    headline: 'Happy Sankranti', sub: 'May your life soar high like a kite — wishing you a bright and prosperous harvest season', tag: '' },
  { key: 'tricolor',    label: 'Independence / Republic Day', emoji: '🇮🇳', group: 'National',
    headline: 'Happy Independence Day', sub: 'Celebrating the spirit of freedom, unity and pride in our nation', tag: '' },
  { key: 'holiday',     label: 'Holiday Notice',   emoji: '🏖️', group: 'Notice',
    headline: 'School Holiday', sub: 'School will remain closed. Classes resume as per the school calendar', tag: 'HOLIDAY NOTICE' },
  { key: 'celebration', label: 'Celebration / Event', emoji: '🎉', group: 'Event',
    headline: 'Annual Day Celebration', sub: 'Join us for an evening of performances, awards and celebration', tag: 'YOU ARE INVITED' },
  { key: 'announcement',label: 'Notice / Announcement', emoji: '📢', group: 'Notice',
    headline: 'Important Announcement', sub: 'Please read this notice carefully', tag: 'NOTICE' },
]

export const FONT_HEAD = '"Playfair Display","Noto Serif Telugu","Noto Serif Devanagari",Georgia,"Times New Roman",serif'
export const FONT_BODY = '"Inter","Noto Sans Telugu","Noto Sans Devanagari","Nirmala UI","Segoe UI",Arial,sans-serif'

/** Google Fonts stylesheet covering Latin + Telugu + Devanagari (Hindi). */
export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700' +
  '&family=Noto+Sans+Telugu:wght@500;700&family=Noto+Serif+Telugu:wght@700' +
  '&family=Noto+Sans+Devanagari:wght@500;700&family=Noto+Serif+Devanagari:wght@700&display=swap'

/** Browser only: make sure the fonts (incl. the right script subsets for the typed text) are ready. */
export async function ensureFonts(sampleText = '') {
  if (typeof document === 'undefined' || !document.fonts) return
  const sample = `Aa ${sampleText}`.slice(0, 300)
  const specs = [`800 60px "Playfair Display"`, `700 60px "Noto Serif Telugu"`, `700 60px "Noto Serif Devanagari"`,
                 `500 30px "Inter"`, `700 30px "Inter"`, `700 30px "Noto Sans Telugu"`, `700 30px "Noto Sans Devanagari"`]
  await Promise.all(specs.map(s => document.fonts.load(s, sample).catch(() => {})))
}

/** Browser only: load an image URL for use on the canvas (CORS-clean so the canvas can be exported). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = url
  })
}

/* ═══════════════ small helpers ═══════════════ */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hexA(hex, a) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g }
function rad(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g }
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath(); ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function glow(ctx, x, y, r, hex, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha
  ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, hexA(hex, 0.95)], [0.4, hexA(hex, 0.35)], [1, hexA(hex, 0)]])
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore()
}
function sparkle(ctx, x, y, s, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(x, y - s)
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y)
  ctx.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s)
  ctx.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y)
  ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s)
  ctx.fill(); ctx.restore()
}
function star5(ctx, cx, cy, R, r, rot = -Math.PI / 2) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad_ = i % 2 ? r : R, a = rot + (i * Math.PI) / 5
    const x = cx + Math.cos(a) * rad_, y = cy + Math.sin(a) * rad_
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
}
function waveTop(ctx, w, baseY, amp, periods, phase = 0, bottomY = null) {
  ctx.beginPath(); ctx.moveTo(0, bottomY ?? baseY + amp * 6)
  ctx.lineTo(0, baseY)
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w
    ctx.lineTo(x, baseY + Math.sin((i / steps) * TAU * periods + phase) * amp)
  }
  ctx.lineTo(w, bottomY ?? baseY + amp * 6); ctx.closePath()
}
function stripEmoji(s) { return (s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim() }

/* ═══════════════ shared motifs ═══════════════ */
function mandala(ctx, cx, cy, r, color, alpha = 0.25) {
  ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = alpha; ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, r * 0.012)
  ;[[12, 0.42, 0.06, 0.17], [16, 0.68, 0.055, 0.15], [24, 0.90, 0.05, 0.13]].forEach(([n, d, pw, ph]) => {
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate((i * TAU) / n)
      ctx.beginPath(); ctx.ellipse(0, -r * d, r * pw, r * ph, 0, 0, TAU); ctx.stroke(); ctx.restore()
    }
  })
  ;[0.22, 0.56, 0.8, 1].forEach(k => { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, TAU); ctx.stroke() })
  ctx.restore()
}
function diya(ctx, cx, cy, s) {
  glow(ctx, cx, cy - s * 0.6, s * 1.5, '#ffb703', 0.7)
  ctx.save(); ctx.translate(cx, cy - s * 0.32)
  ctx.beginPath(); ctx.moveTo(0, -s * 0.8)
  ctx.bezierCurveTo(s * 0.36, -s * 0.38, s * 0.3, -s * 0.02, 0, s * 0.06)
  ctx.bezierCurveTo(-s * 0.3, -s * 0.02, -s * 0.36, -s * 0.38, 0, -s * 0.8); ctx.closePath()
  ctx.fillStyle = lin(ctx, 0, -s * 0.8, 0, s * 0.06, [[0, '#fff6c2'], [0.5, '#ffb703'], [1, '#e85d04']]); ctx.fill()
  ctx.beginPath(); ctx.moveTo(0, -s * 0.5)
  ctx.bezierCurveTo(s * 0.14, -s * 0.26, s * 0.12, -s * 0.06, 0, 0)
  ctx.bezierCurveTo(-s * 0.12, -s * 0.06, -s * 0.14, -s * 0.26, 0, -s * 0.5); ctx.closePath()
  ctx.fillStyle = '#fffbe6'; ctx.fill(); ctx.restore()
  // bowl
  ctx.beginPath(); ctx.moveTo(cx - s, cy - s * 0.22)
  ctx.quadraticCurveTo(cx - s * 0.82, cy + s * 0.62, cx, cy + s * 0.66)
  ctx.quadraticCurveTo(cx + s * 0.82, cy + s * 0.62, cx + s, cy - s * 0.22)
  ctx.quadraticCurveTo(cx, cy - s * 0.02, cx - s, cy - s * 0.22); ctx.closePath()
  ctx.fillStyle = lin(ctx, cx, cy - s * 0.2, cx, cy + s * 0.66, [[0, '#f4a261'], [0.5, '#c8501f'], [1, '#7a2410']]); ctx.fill()
  ctx.strokeStyle = 'rgba(255,220,150,0.7)'; ctx.lineWidth = s * 0.05
  ctx.beginPath(); ctx.moveTo(cx - s * 0.96, cy - s * 0.2); ctx.quadraticCurveTo(cx, cy - s * 0.02, cx + s * 0.96, cy - s * 0.2); ctx.stroke()
}
function ashoka(ctx, cx, cy, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.fillStyle = color
  ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke()
  ctx.lineWidth = r * 0.028
  for (let i = 0; i < 24; i++) {
    const a = (i * TAU) / 24
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.16, cy + Math.sin(a) * r * 0.16)
    ctx.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94); ctx.stroke()
    const b = a + TAU / 48
    ctx.beginPath(); ctx.arc(cx + Math.cos(b) * r * 0.86, cy + Math.sin(b) * r * 0.86, r * 0.04, 0, TAU); ctx.fill()
  }
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.12, 0, TAU); ctx.fill(); ctx.restore()
}
function crescent(ctx, x, y, r, c1, c2) {
  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip()           // stay inside the moon
  ctx.beginPath(); ctx.rect(x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8)
  ctx.arc(x + r * 0.42, y - r * 0.1, r * 0.82, 0, TAU)              // ...minus the bite
  ctx.fillStyle = lin(ctx, x - r, y - r, x + r, y + r, [[0, c1], [1, c2]]); ctx.fill('evenodd'); ctx.restore()
}
function lantern(ctx, x, y, s, len) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,225,150,0.8)'; ctx.lineWidth = Math.max(2, s * 0.05)
  ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.stroke()
  glow(ctx, x, y + s * 0.9, s * 1.6, '#ffc857', 0.55)
  ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(x - s * 0.34, y); ctx.quadraticCurveTo(x, y - s * 0.55, x + s * 0.34, y); ctx.closePath(); ctx.fill()
  const body = lin(ctx, x - s * 0.5, y, x + s * 0.5, y + s * 1.4, [[0, '#ffe08a'], [1, '#f4a127']])
  ctx.fillStyle = body
  ctx.beginPath(); ctx.moveTo(x - s * 0.34, y); ctx.lineTo(x + s * 0.34, y)
  ctx.quadraticCurveTo(x + s * 0.62, y + s * 0.6, x + s * 0.3, y + s * 1.25)
  ctx.lineTo(x - s * 0.3, y + s * 1.25); ctx.quadraticCurveTo(x - s * 0.62, y + s * 0.6, x - s * 0.34, y); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(120,60,0,0.55)'; ctx.lineWidth = Math.max(1.5, s * 0.04)
  ;[-0.12, 0.12].forEach(o => { ctx.beginPath(); ctx.moveTo(x + s * o, y + s * 0.05); ctx.lineTo(x + s * o * 1.2, y + s * 1.2); ctx.stroke() })
  ctx.fillStyle = '#c47a12'; ctx.beginPath(); ctx.moveTo(x - s * 0.3, y + s * 1.25); ctx.lineTo(x + s * 0.3, y + s * 1.25); ctx.lineTo(x, y + s * 1.55); ctx.closePath(); ctx.fill()
  ctx.restore()
}
function mosque(ctx, w, baseY, s, color) {
  ctx.save(); ctx.fillStyle = color
  const cx = w / 2
  ctx.fillRect(0, baseY, w, s * 3)
  // main dome
  ctx.beginPath(); ctx.moveTo(cx - s * 1.5, baseY); ctx.bezierCurveTo(cx - s * 1.5, baseY - s * 2.1, cx + s * 1.5, baseY - s * 2.1, cx + s * 1.5, baseY); ctx.closePath(); ctx.fill()
  ctx.fillRect(cx - s * 0.05, baseY - s * 2.5, s * 0.1, s * 0.6)
  ctx.beginPath(); ctx.arc(cx, baseY - s * 2.55, s * 0.1, 0, TAU); ctx.fill()
  // side domes
  ;[-2.5, 2.5].forEach(o => { ctx.beginPath(); ctx.moveTo(cx + s * (o - 0.9), baseY); ctx.bezierCurveTo(cx + s * (o - 0.9), baseY - s * 1.2, cx + s * (o + 0.9), baseY - s * 1.2, cx + s * (o + 0.9), baseY); ctx.closePath(); ctx.fill() })
  // minarets
  ;[-4.2, 4.2, -6.2, 6.2].forEach((o, i) => {
    const mh = i < 2 ? 3.6 : 2.6, mw = 0.42
    ctx.fillRect(cx + s * o - s * mw / 2, baseY - s * mh, s * mw, s * mh)
    ctx.beginPath(); ctx.moveTo(cx + s * o - s * 0.34, baseY - s * mh); ctx.lineTo(cx + s * o + s * 0.34, baseY - s * mh)
    ctx.lineTo(cx + s * o, baseY - s * (mh + 0.9)); ctx.closePath(); ctx.fill()
  })
  ctx.restore()
}
function snowflake(ctx, x, y, r, alpha = 0.9) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.28, -r * 0.8); ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.28, -r * 0.8); ctx.stroke()
  }
  ctx.restore()
}
function tree(ctx, x, baseY, s) {
  ctx.save()
  ctx.fillStyle = '#5b3a1e'; ctx.fillRect(x - s * 0.1, baseY - s * 0.25, s * 0.2, s * 0.3)
  ;[[1.0, 0.0, '#1f8f5f'], [0.82, -0.62, '#26a56f'], [0.62, -1.15, '#2fbf80']].forEach(([wd, oy, col]) => {
    ctx.fillStyle = col; ctx.beginPath()
    ctx.moveTo(x, baseY - s * (1.0 - oy * 0.0) + s * oy * 0.55 - s * 0.55)
    ctx.lineTo(x + s * wd * 0.62, baseY - s * 0.2 + s * oy * 0.55)
    ctx.lineTo(x - s * wd * 0.62, baseY - s * 0.2 + s * oy * 0.55); ctx.closePath(); ctx.fill()
  })
  ctx.fillStyle = '#ffd166'; star5(ctx, x, baseY - s * 1.55, s * 0.13, s * 0.055); ctx.fill()
  ;[['#ff5d73', -0.22, -0.55], ['#ffd166', 0.2, -0.8], ['#4cc9f0', -0.12, -1.05], ['#ff5d73', 0.14, -1.2]].forEach(([c, ox, oy]) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + s * ox, baseY + s * oy * 0.9, s * 0.06, 0, TAU); ctx.fill()
  })
  ctx.restore()
}
function kite(ctx, x, y, s, c1, c2, rot, rand) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  // tail
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(2, s * 0.03)
  ctx.beginPath(); ctx.moveTo(0, s * 1.05)
  for (let i = 1; i <= 8; i++) ctx.quadraticCurveTo((i % 2 ? 1 : -1) * s * 0.22, s * (1.05 + i * 0.22 - 0.1), 0, s * (1.05 + i * 0.22))
  ctx.stroke()
  for (let i = 1; i <= 4; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2
    ctx.beginPath(); ctx.moveTo(0, s * (1.05 + i * 0.4)); ctx.lineTo(s * 0.13, s * (1.05 + i * 0.4) + s * 0.11); ctx.lineTo(-s * 0.13, s * (1.05 + i * 0.4) + s * 0.11); ctx.closePath(); ctx.fill()
  }
  // body
  ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(-s * 0.62, 0); ctx.lineTo(0, s * 1.05); ctx.closePath(); ctx.fill()
  ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.62, 0); ctx.lineTo(0, s * 1.05); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.03)
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.05); ctx.moveTo(-s * 0.62, 0); ctx.lineTo(s * 0.62, 0); ctx.stroke()
  ctx.restore()
}
function splash(ctx, x, y, r, color, rand, alpha = 0.9) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color
  const n = 12, pts = []
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rr_ = r * (0.72 + rand() * 0.55); pts.push([x + Math.cos(a) * rr_, y + Math.sin(a) * rr_]) }
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2
    i === 0 ? ctx.moveTo(mx, my) : ctx.quadraticCurveTo(p[0], p[1], mx, my)
  }
  ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2); ctx.closePath(); ctx.fill()
  for (let i = 0; i < 7; i++) { const a = rand() * TAU, d = r * (1.15 + rand() * 0.7); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.05 + rand() * 0.1), 0, TAU); ctx.fill() }
  ctx.restore()
}
function confetti(ctx, w, h, count, palette, rand, avoid = null) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = rand() * h
    if (avoid && x > avoid.x && x < avoid.x + avoid.w && y > avoid.y && y < avoid.y + avoid.h) continue
    ctx.save(); ctx.translate(x, y); ctx.rotate(rand() * TAU); ctx.fillStyle = palette[Math.floor(rand() * palette.length)]
    ctx.globalAlpha = 0.85
    const s = w * (0.008 + rand() * 0.012)
    if (rand() < 0.35) { ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.fill() } else ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8)
    ctx.restore()
  }
}
function cloud(ctx, x, y, s, alpha = 0.95) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.arc(x + s * 0.55, y - s * 0.22, s * 0.62, 0, TAU); ctx.arc(x + s * 1.2, y, s * 0.5, 0, TAU)
  ctx.rect(x, y, s * 1.2, s * 0.5); ctx.fill(); ctx.restore()
}

/* ═══════════════ template backgrounds ═══════════════
   Each template: { layout, background(ctx,w,h,rand,d) }
   layout: cy (headline centre, fraction of h), textColor, subColor, headerColor,
           footerColor, pill{bg,fg}, panel{fill,radius}|null, shadow, upper                */
const T = {}

T.diwali = {
  layout: { cy: 0.47, textColor: '#ffe6a0', subColor: '#ffeecf', headerColor: '#fff3d6', footerColor: '#ffe9bd',
            pill: { bg: '#ffb703', fg: '#3b0d0d' }, panel: null, shadow: true },
  background(ctx, w, h, rand) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#1b0536'], [0.45, '#4a1148'], [0.8, '#8f2d4a'], [1, '#c2503a']]); ctx.fillRect(0, 0, w, h)
    mandala(ctx, w * 0.5, h * 0.38, w * 0.62, '#ffd166', 0.16)
    mandala(ctx, w * 0.5, h * 0.38, w * 0.4, '#ffd166', 0.14)
    glow(ctx, w * 0.5, h * 0.42, w * 0.6, '#ff9e00', 0.16)
    // string lights
    ctx.strokeStyle = 'rgba(255,214,120,0.55)'; ctx.lineWidth = 3
    ;[0.05, 0.11].forEach((yy, k) => {
      ctx.beginPath(); ctx.moveTo(-10, h * yy)
      for (let i = 0; i <= 8; i++) ctx.quadraticCurveTo(w * ((i + 0.5) / 8), h * (yy + 0.03), w * ((i + 1) / 8), h * yy)
      ctx.stroke()
      for (let i = 0; i < 8; i++) {
        const bx = w * ((i + 0.5) / 8), by = h * (yy + 0.0225)
        glow(ctx, bx, by, w * 0.032, i % 2 ? '#ffb703' : '#ff7b54', 0.9)
        ctx.fillStyle = i % 2 ? '#ffe08a' : '#ffb18a'; ctx.beginPath(); ctx.arc(bx, by, w * 0.008, 0, TAU); ctx.fill()
      }
    })
    for (let i = 0; i < 26; i++) sparkle(ctx, rand() * w, rand() * h * 0.85, w * (0.006 + rand() * 0.012), '#ffe9a8', 0.4 + rand() * 0.5)
    // diyas along the bottom
    const dy = h * 0.85
    ;[0.13, 0.3, 0.5, 0.7, 0.87].forEach((fx, i) => diya(ctx, w * fx, dy - (i % 2 ? 0 : h * 0.012), w * (i === 2 ? 0.05 : 0.04)))
  },
}

T.holi = {
  layout: { cy: 0.5, textColor: '#3a0ca3', subColor: '#4a4a6a', headerColor: '#2b2b4a', footerColor: '#3a3a5a',
            pill: { bg: '#f72585', fg: '#ffffff' }, panel: { fill: 'rgba(255,255,255,0.86)', radius: 44 }, shadow: false,
            footerPill: 'rgba(255,255,255,0.88)' },
  background(ctx, w, h, rand) {
    ctx.fillStyle = lin(ctx, 0, 0, w, h, [[0, '#fff5e6'], [1, '#ffe3f1']]); ctx.fillRect(0, 0, w, h)
    const cols = ['#e91e8c', '#00b4d8', '#ffd60a', '#ff7b00', '#52b788', '#7b2cbf', '#ef476f']
    ;[[0.08, 0.1, 0.24], [0.92, 0.07, 0.2], [0.1, 0.9, 0.22], [0.9, 0.88, 0.26], [0.5, 0.03, 0.13], [0.52, 0.97, 0.13], [0.03, 0.48, 0.12], [0.98, 0.5, 0.12]]
      .forEach(([fx, fy, fr], i) => splash(ctx, w * fx, h * fy, w * fr, cols[i % cols.length], rand, 0.9))
    for (let i = 0; i < 40; i++) {
      const x = rand() * w, y = rand() * h
      if (x > w * 0.12 && x < w * 0.88 && y > h * 0.22 && y < h * 0.78) continue
      ctx.fillStyle = cols[Math.floor(rand() * cols.length)]; ctx.globalAlpha = 0.8
      ctx.beginPath(); ctx.arc(x, y, w * (0.006 + rand() * 0.014), 0, TAU); ctx.fill(); ctx.globalAlpha = 1
    }
  },
}

T.eid = {
  layout: { cy: 0.47, textColor: '#ffe9a8', subColor: '#e6f6f2', headerColor: '#e6f6f2', footerColor: '#d7efe9',
            pill: { bg: '#ffd166', fg: '#053b3a' }, panel: null, shadow: true },
  background(ctx, w, h, rand) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#04151f'], [0.5, '#0a4a55'], [1, '#12867a']]); ctx.fillRect(0, 0, w, h)
    glow(ctx, w * 0.8, h * 0.17, w * 0.5, '#ffe08a', 0.22)
    crescent(ctx, w * 0.8, h * 0.17, w * 0.13, '#fff1b8', '#f2b632')
    for (let i = 0; i < 60; i++) sparkle(ctx, rand() * w, rand() * h * 0.7, w * (0.004 + rand() * 0.01), '#fff7d1', 0.25 + rand() * 0.65)
    sparkle(ctx, w * 0.62, h * 0.11, w * 0.022, '#ffe9a8', 1); sparkle(ctx, w * 0.9, h * 0.31, w * 0.016, '#ffe9a8', 0.9)
    lantern(ctx, w * 0.12, h * 0.11, w * 0.055, h * 0.11); lantern(ctx, w * 0.27, h * 0.075, w * 0.042, h * 0.075)
    mosque(ctx, w, h * 0.905, w * 0.034, '#031d24')
    ctx.fillStyle = '#021419'; ctx.fillRect(0, h * 0.905, w, h * 0.1)
  },
}

T.christmas = {
  layout: { cy: 0.47, textColor: '#ffffff', subColor: '#e9f7ee', headerColor: '#f2fff7', footerColor: '#0b3d2e',
            pill: { bg: '#e63946', fg: '#ffffff' }, panel: null, shadow: true, footerShadow: false },
  background(ctx, w, h, rand) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#082d22'], [0.6, '#0f5a3f'], [1, '#146b4a']]); ctx.fillRect(0, 0, w, h)
    glow(ctx, w * 0.5, h * 0.4, w * 0.7, '#3ddc97', 0.1)
    for (let i = 0; i < 46; i++) snowflake(ctx, rand() * w, rand() * h * 0.82, w * (0.008 + rand() * 0.022), 0.35 + rand() * 0.55)
    // bunting
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3
    const by0 = h * 0.165, sag = h * 0.045
    ctx.beginPath(); ctx.moveTo(0, by0); ctx.quadraticCurveTo(w * 0.5, by0 + sag * 2, w, by0); ctx.stroke()
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9, x = w * t, y = by0 + 2 * sag * t * (1 - t) * 2
      ctx.fillStyle = ['#e63946', '#ffd166', '#f1faee', '#4cc9f0'][i % 4]
      ctx.beginPath(); ctx.moveTo(x - w * 0.02, y); ctx.lineTo(x + w * 0.02, y); ctx.lineTo(x, y + w * 0.045); ctx.closePath(); ctx.fill()
    }
    // snowy ground + trees
    ctx.fillStyle = '#f4fbff'; waveTop(ctx, w, h * 0.885, h * 0.012, 2.2, 0.6, h); ctx.fill()
    ctx.fillStyle = '#dff1fb'; waveTop(ctx, w, h * 0.925, h * 0.01, 1.6, 2.2, h); ctx.fill()
    tree(ctx, w * 0.1, h * 0.945, w * 0.15); tree(ctx, w * 0.9, h * 0.945, w * 0.17); tree(ctx, w * 0.25, h * 0.955, w * 0.09); tree(ctx, w * 0.76, h * 0.955, w * 0.1)
  },
}

T.sankranti = {
  layout: { cy: 0.5, textColor: '#ffffff', subColor: '#fff4e0', headerColor: '#ffffff', footerColor: '#fff4e0',
            pill: { bg: '#ffffff', fg: '#b4470f' }, panel: { fill: 'rgba(122,40,8,0.34)', radius: 44 }, shadow: true, footerBottom: 112 },
  background(ctx, w, h, rand) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#1c6dd0'], [0.35, '#57a6f0'], [0.62, '#ffc36b'], [0.85, '#ff9a3c'], [1, '#e8631a']]); ctx.fillRect(0, 0, w, h)
    glow(ctx, w * 0.5, h * 0.78, w * 0.75, '#fff2b0', 0.7)
    ctx.fillStyle = lin(ctx, 0, h * 0.7, 0, h * 0.86, [[0, '#fff7c9'], [1, '#ffb347']]); ctx.beginPath(); ctx.arc(w * 0.5, h * 0.84, w * 0.19, Math.PI, TAU); ctx.fill()
    cloud(ctx, w * 0.04, h * 0.3, w * 0.12, 0.8); cloud(ctx, w * 0.72, h * 0.22, w * 0.1, 0.7)
    const kc = [['#ff4d6d', '#ffd166'], ['#06d6a0', '#118ab2'], ['#ffd166', '#ef476f'], ['#8338ec', '#ff9e00'], ['#00b4d8', '#f72585'], ['#ff7b00', '#3a86ff']]
    ;[[0.9, 0.075, 0.06, 0.3], [0.74, 0.16, 0.045, -0.35], [0.12, 0.2, 0.05, -0.3], [0.93, 0.3, 0.045, -0.25], [0.28, 0.27, 0.04, 0.4], [0.06, 0.4, 0.035, 0.2], [0.7, 0.045, 0.03, 0.1]]
      .forEach(([fx, fy, fs, rot], i) => kite(ctx, w * fx, h * fy, w * fs, kc[i % 6][0], kc[i % 6][1], rot, rand))
    // muggu / rangoli dots at the bottom
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    const gy = h * 0.948
    for (let r = 0; r < 3; r++) for (let c = 0; c < 21; c++) {
      const off = (r % 2) * 0.5
      const x = w * ((c + off) / 20.2), y = gy + r * h * 0.014
      ctx.beginPath(); ctx.arc(x, y, w * 0.005, 0, TAU); ctx.fill()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(w * 0.04, gy + h * 0.008)
    for (let i = 0; i < 10; i++) ctx.quadraticCurveTo(w * (0.04 + (i + 0.5) * 0.092), gy - h * 0.02, w * (0.04 + (i + 1) * 0.092), gy + h * 0.008)
    ctx.stroke()
  },
}

T.tricolor = {
  layout: { cy: 0.585, textColor: '#0a2a6b', subColor: '#33415f', headerColor: '#ffffff', footerColor: '#ffffff',
            pill: { bg: '#0a2a6b', fg: '#ffffff' }, panel: null, shadow: false, headSize: 96, subMaxLines: 3 },
  background(ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = lin(ctx, 0, 0, 0, h * 0.3, [[0, '#ff8c1a'], [1, '#ffa94d']]); waveTop(ctx, w, h * 0.215, h * 0.012, 1.5, 0.4, 0); ctx.fill()
    ctx.fillStyle = lin(ctx, 0, h * 0.8, 0, h, [[0, '#26a641'], [1, '#0e7a25']]); waveTop(ctx, w, h * 0.815, h * 0.012, 1.5, 3.4, h); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(w * 0.9, h * 0.06, w * 0.22, 0, TAU); ctx.fill()
    ashoka(ctx, w * 0.5, h * 0.5, w * 0.42, '#0a2a6b', 0.06)
    ashoka(ctx, w * 0.5, h * 0.305, w * 0.072, '#0a2a6b', 1)
  },
}

T.holiday = {
  layout: { cy: 0.5, textColor: '#0b3c5d', subColor: '#1d5c85', headerColor: '#0b3c5d', footerColor: '#0b3c5d',
            pill: { bg: '#0b3c5d', fg: '#ffffff' }, panel: null, shadow: false },
  background(ctx, w, h, rand) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#4fb8f0'], [0.6, '#bfe9fb'], [1, '#e9f8ff']]); ctx.fillRect(0, 0, w, h)
    const sx = w * 0.84, sy = h * 0.14
    glow(ctx, sx, sy, w * 0.45, '#fff3a3', 0.65)
    ctx.save(); ctx.translate(sx, sy)
    for (let i = 0; i < 16; i++) { ctx.rotate(TAU / 16); ctx.fillStyle = 'rgba(255,224,102,0.7)'; ctx.beginPath(); ctx.moveTo(-w * 0.012, -w * 0.115); ctx.lineTo(0, -w * 0.17); ctx.lineTo(w * 0.012, -w * 0.115); ctx.fill() }
    ctx.restore()
    ctx.fillStyle = lin(ctx, sx, sy - w * 0.09, sx, sy + w * 0.09, [[0, '#ffe066'], [1, '#ffb703']]); ctx.beginPath(); ctx.arc(sx, sy, w * 0.09, 0, TAU); ctx.fill()
    cloud(ctx, w * 0.05, h * 0.21, w * 0.16); cloud(ctx, w * 0.5, h * 0.09, w * 0.12, 0.85); cloud(ctx, w * 0.7, h * 0.34, w * 0.1, 0.8)
    ctx.fillStyle = '#7bd389'; waveTop(ctx, w, h * 0.86, h * 0.02, 1.4, 0.3, h); ctx.fill()
    ctx.fillStyle = '#4fbf71'; waveTop(ctx, w, h * 0.9, h * 0.02, 1.9, 2.4, h); ctx.fill()
    ctx.fillStyle = '#2f9e5b'; waveTop(ctx, w, h * 0.95, h * 0.014, 2.4, 4.2, h); ctx.fill()
    for (let i = 0; i < 10; i++) { const x = rand() * w, y = h * (0.9 + rand() * 0.08); ctx.fillStyle = ['#ff6b6b', '#ffd166', '#fff'][i % 3]; ctx.beginPath(); ctx.arc(x, y, w * 0.007, 0, TAU); ctx.fill() }
  },
}

T.celebration = {
  layout: { cy: 0.5, textColor: '#ffffff', subColor: '#f3e8ff', headerColor: '#ffffff', footerColor: '#f3e8ff',
            pill: { bg: '#ffd166', fg: '#3a0ca3' }, panel: { fill: 'rgba(30,8,80,0.42)', radius: 44 }, shadow: true },
  background(ctx, w, h, rand) {
    ctx.fillStyle = lin(ctx, 0, 0, w, h, [[0, '#3a0ca3'], [0.55, '#7209b7'], [1, '#f72585']]); ctx.fillRect(0, 0, w, h)
    ctx.save(); ctx.translate(w * 0.5, h * 0.46)
    for (let i = 0; i < 28; i++) { ctx.rotate(TAU / 28); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-w * 0.05, -h * 1); ctx.lineTo(w * 0.05, -h * 1); ctx.fill() }
    ctx.restore()
    glow(ctx, w * 0.5, h * 0.46, w * 0.7, '#ffd166', 0.16)
    confetti(ctx, w, h, 130, ['#ffd166', '#06d6a0', '#4cc9f0', '#ffffff', '#ff9e00', '#ef476f'], rand, { x: w * 0.1, y: h * 0.25, w: w * 0.8, h: h * 0.5 })
    ;[[0.9, 0.09, 0.05], [0.07, 0.24, 0.035], [0.86, 0.87, 0.05], [0.1, 0.86, 0.04]].forEach(([fx, fy, fs]) => { ctx.fillStyle = '#ffd166'; star5(ctx, w * fx, h * fy, w * fs, w * fs * 0.45, -Math.PI / 2 + fx); ctx.fill() })
    for (let i = 0; i < 20; i++) sparkle(ctx, rand() * w, rand() * h, w * (0.006 + rand() * 0.012), '#ffffff', 0.4 + rand() * 0.5)
  },
}

T.announcement = {
  layout: { cy: 0.5, textColor: '#111827', subColor: '#4b5563', headerColor: '#111827', footerColor: '#ffffff',
            pill: { bg: 'BRAND', fg: '#ffffff' }, panel: null, shadow: false, upper: false },
  background(ctx, w, h, rand, d) {
    const b = d.brandColor || '#4f46e5'
    ctx.fillStyle = '#f7f8fc'; ctx.fillRect(0, 0, w, h)
    // diagonal brand shapes
    ctx.fillStyle = hexA(b, 0.12); ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, h * 0.34); ctx.lineTo(w * 0.42, 0); ctx.closePath(); ctx.fill()
    ctx.fillStyle = hexA(b, 0.9); ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, h * 0.16); ctx.lineTo(w * 0.72, 0); ctx.closePath(); ctx.fill()
    ctx.fillStyle = hexA(b, 0.16); ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.7); ctx.lineTo(w * 0.5, h); ctx.closePath(); ctx.fill()
    ctx.fillStyle = b; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, h); ctx.lineTo(w, h * 0.868); ctx.lineTo(0, h * 0.905); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = hexA(b, 0.25); ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(w * 0.9, h * 0.62, w * 0.11, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(w * 0.9, h * 0.62, w * 0.075, 0, TAU); ctx.stroke()
    ctx.fillStyle = hexA(b, 0.16)
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { ctx.beginPath(); ctx.arc(w * 0.06 + c * w * 0.026, h * 0.62 + r * w * 0.026, w * 0.0048, 0, TAU); ctx.fill() }
  },
}

/* ═══════════════ text layout ═══════════════ */
function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean), lines = []
  let cur = ''
  for (const wd of words) {
    const test = cur ? `${cur} ${wd}` : wd
    if (ctx.measureText(test).width <= maxW || !cur) cur = test
    else { lines.push(cur); cur = wd }
  }
  if (cur) lines.push(cur)
  return lines
}
function fitText(ctx, text, { maxW, maxLines, size, minSize, weight, family, lineH = 1.16, upper = false }) {
  const t = upper ? text.toUpperCase() : text
  let s = size, lines = [t]
  for (;;) {
    ctx.font = `${weight} ${s}px ${family}`
    lines = wrapLines(ctx, t, maxW)
    const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
    if ((lines.length <= maxLines && widest <= maxW) || s <= minSize) return { lines, size: s, lh: s * lineH, font: `${weight} ${s}px ${family}`, widest }
    s -= 2
  }
}
function drawLines(ctx, block, cx, top, color, opts = {}) {
  ctx.font = block.font; ctx.fillStyle = color; ctx.textAlign = opts.align || 'center'; ctx.textBaseline = 'middle'
  if (opts.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = block.size * 0.12; ctx.shadowOffsetY = block.size * 0.05 }
  block.lines.forEach((ln, i) => ctx.fillText(ln, cx, top + block.lh * (i + 0.5)))
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
}
function initials(name) {
  const p = (name || 'S').replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] || 'S') + (p[1]?.[0] || '')).toUpperCase()
}

function drawHeader(ctx, w, h, d, L, s) {
  const m = 64 * s, r = 44 * s, cy = 96 * s + (h > w * 1.6 ? 40 * s : 0), cx = m + r
  // logo or monogram
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 14 * s
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r + 5 * s, 0, TAU); ctx.fill()
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip()
  if (d.logo) {
    const iw = d.logo.width || d.logo.naturalWidth || r * 2, ih = d.logo.height || d.logo.naturalHeight || r * 2
    const k = Math.max((r * 2) / iw, (r * 2) / ih)
    ctx.drawImage(d.logo, cx - (iw * k) / 2, cy - (ih * k) / 2, iw * k, ih * k)
  } else {
    ctx.fillStyle = d.brandColor || '#4f46e5'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = '#fff'; ctx.font = `800 ${r * 0.95}px ${FONT_HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(initials(d.schoolName), cx, cy + r * 0.04)
  }
  ctx.restore()
  const tx = cx + r + 24 * s, maxW = w - tx - m
  const blk = fitText(ctx, stripEmoji(d.schoolName) || 'Your School', { maxW, maxLines: 2, size: 36 * s, minSize: 22 * s, weight: 700, family: FONT_BODY, lineH: 1.18 })
  drawLines(ctx, blk, tx, cy - (blk.lh * blk.lines.length) / 2, L.headerColor, { align: 'left', shadow: L.shadow })
}

function drawBlock(ctx, w, h, d, L, s, T_) {
  const m = 84 * s, maxW = w - m * 2
  const upper = !!L.upper
  const head = fitText(ctx, stripEmoji(d.headline) || ' ', { maxW, maxLines: 3, size: (L.headSize || 124) * s, minSize: 50 * s, weight: 800, family: FONT_HEAD, lineH: 1.1, upper })
  const sub = d.subline ? fitText(ctx, stripEmoji(d.subline), { maxW: maxW * 0.94, maxLines: L.subMaxLines || 5, size: 40 * s, minSize: 26 * s, weight: 500, family: FONT_BODY, lineH: 1.38 }) : null
  const tag = d.tag ? stripEmoji(d.tag).toUpperCase() : ''
  const date = d.dateText ? stripEmoji(d.dateText) : ''

  const gap = 34 * s, tagH = tag ? 58 * s : 0, dateH = date ? 74 * s : 0
  const H = tagH + (tag ? gap * 0.8 : 0) + head.lh * head.lines.length + (sub ? gap + sub.lh * sub.lines.length : 0) + (date ? gap + dateH : 0)
  let y = h * L.cy - H / 2
  // Keep long text clear of the artwork at the bottom (and of the header at the top)
  const padPx = L.panel ? 54 * s : 0
  const maxBottom = h * (L.maxBottom || 0.8) - padPx
  if (y + H > maxBottom) y = Math.max(h * 0.155 + padPx, maxBottom - H)
  const cx = w / 2

  if (L.panel) {
    const widest = Math.max(head.widest, sub ? sub.widest : 0, 300 * s)
    const pw = Math.min(w - 60 * s, widest + 110 * s), pad = 54 * s
    ctx.save(); ctx.fillStyle = L.panel.fill; rr(ctx, cx - pw / 2, y - pad, pw, H + pad * 2, L.panel.radius * s); ctx.fill(); ctx.restore()
  }
  if (tag) {
    ctx.font = `700 ${26 * s}px ${FONT_BODY}`
    const tw = ctx.measureText(tag).width + 64 * s
    const bg = L.pill.bg === 'BRAND' ? (d.brandColor || '#4f46e5') : L.pill.bg
    ctx.fillStyle = bg; rr(ctx, cx - tw / 2, y, tw, tagH, tagH / 2); ctx.fill()
    ctx.fillStyle = L.pill.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${3 * s}px`
    ctx.fillText(tag, cx + (1.5 * s), y + tagH / 2 + 1 * s)
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
    y += tagH + gap * 0.8
  }
  drawLines(ctx, head, cx, y, L.textColor, { shadow: L.shadow })
  y += head.lh * head.lines.length
  if (sub) { y += gap; drawLines(ctx, sub, cx, y, L.subColor, { shadow: L.shadow && !L.panel ? false : false }); y += sub.lh * sub.lines.length }
  if (date) {
    y += gap
    ctx.font = `700 ${34 * s}px ${FONT_BODY}`
    const dw = ctx.measureText(date).width + 84 * s
    const bg = L.pill.bg === 'BRAND' ? (d.brandColor || '#4f46e5') : L.pill.bg
    ctx.fillStyle = bg; rr(ctx, cx - dw / 2, y, dw, dateH, dateH / 2); ctx.fill()
    ctx.fillStyle = L.pill.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(date, cx, y + dateH / 2 + 1 * s)
  }
}

function drawFooter(ctx, w, h, d, L, s) {
  const cx = w / 2
  const lines = []
  if (d.principalName) lines.push({ text: `${stripEmoji(d.principalName)}`, size: 34 * s, weight: 700 })
  if (d.principalName && d.schoolName) lines.push({ text: `${stripEmoji(d.schoolName)}`, size: 26 * s, weight: 500 })
  else if (d.tagline) lines.push({ text: stripEmoji(d.tagline), size: 26 * s, weight: 500 })
  if (!lines.length) return
  const bottom = h - (L.footerBottom || 46) * s
  const totalH = lines.reduce((a, l) => a + l.size * 1.45, 0)
  let y = bottom - totalH
  if (L.footerPill) {
    ctx.font = `700 ${34 * s}px ${FONT_BODY}`
    const pw = Math.min(w - 120 * s, Math.max(...lines.map(l => { ctx.font = `${l.weight} ${l.size}px ${FONT_BODY}`; return ctx.measureText(l.text).width })) + 100 * s)
    ctx.fillStyle = L.footerPill; rr(ctx, cx - pw / 2, y - 14 * s, pw, totalH + 22 * s, 30 * s); ctx.fill()
  }
  const fShadow = L.footerShadow === undefined ? L.shadow : L.footerShadow
  lines.forEach(l => {
    ctx.font = `${l.weight} ${l.size}px ${FONT_BODY}`
    const t = fitText(ctx, l.text, { maxW: w - 160 * s, maxLines: 1, size: l.size, minSize: l.size * 0.6, weight: l.weight, family: FONT_BODY })
    drawLines(ctx, t, cx, y, L.footerColor, { shadow: fShadow }); y += l.size * 1.45
  })
}

/* ═══════════════ main entry ═══════════════ */
/**
 * @param ctx   canvas 2D context
 * @param w,h   pixel size (see SIZES)
 * @param d     { template, headline, subline, tag, dateText, schoolName, tagline,
 *                principalName, brandColor, logo (Image|Canvas|null) }
 */
export function drawPoster(ctx, w, h, d) {
  const tpl = T[d.template] || T.announcement
  const s = w / 1080
  const rand = rng(hashStr(d.template || 'x'))
  ctx.save()
  ctx.clearRect(0, 0, w, h)
  tpl.background(ctx, w, h, rand, d)
  drawHeader(ctx, w, h, d, tpl.layout, s)
  drawBlock(ctx, w, h, d, tpl.layout, s)
  drawFooter(ctx, w, h, d, tpl.layout, s)
  ctx.restore()
}