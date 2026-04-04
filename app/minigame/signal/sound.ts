/* ── SIGNAL 프로시저럴 사운드 시스템 ── */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

// 신호 전환: 짧은 "틱" (1000Hz 사인파, 50ms)
export function sfxSwitch() {
  if (muted) return;
  const c = getCtx();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1000, t);
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.05);
}

// 차량 통과: 부드러운 "슝" (화이트노이즈 + 로우패스, 100ms)
export function sfxPass() {
  if (muted) return;
  const c = getCtx();
  const t = c.currentTime;
  const bufSize = c.sampleRate * 0.1;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2000, t);
  lp.frequency.exponentialRampToValueAtTime(400, t + 0.1);
  const g = c.createGain();
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start(t);
}

// 충돌: 임팩트 "쾅" (200Hz 사인파 + 노이즈, 300ms)
export function sfxCrash() {
  if (muted) return;
  const c = getCtx();
  const t = c.currentTime;
  // 사인파 베이스
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(200, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
  og.gain.setValueAtTime(0.15, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(og);
  og.connect(c.destination);
  o.start(t);
  o.stop(t + 0.3);
  // 노이즈
  const bufSize = c.sampleRate * 0.3;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.1, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  src.connect(ng);
  ng.connect(c.destination);
  src.start(t);
}

// 레벨업: 상승 아르페지오 (C-E-G-C)
export function sfxLevelUp() {
  if (muted) return;
  const c = getCtx();
  const t = c.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6
  notes.forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t + i * 0.1);
    g.gain.setValueAtTime(0, t + i * 0.1);
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.15);
    o.connect(g);
    g.connect(c.destination);
    o.start(t + i * 0.1);
    o.stop(t + i * 0.1 + 0.15);
  });
}

// 게임 오버 사운드
export function sfxGameOver() {
  if (muted) return;
  const c = getCtx();
  const t = c.currentTime;
  const notes = [440, 370, 311, 261]; // 하강
  notes.forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t + i * 0.15);
    g.gain.setValueAtTime(0, t + i * 0.15);
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.15 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.2);
    o.connect(g);
    g.connect(c.destination);
    o.start(t + i * 0.15);
    o.stop(t + i * 0.15 + 0.2);
  });
}
