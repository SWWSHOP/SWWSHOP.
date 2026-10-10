/* =========================================================
   SWWSHOP 4.1 — PDF ВЫПИСКИ (только скачивание)
   ========================================================= */

const CONFIG = {
  BOT_TOKEN: '8753888540:AAG67A5-W6_3J99mM-Om_P2HdiDKO_S3htY',
  CHAT_ID: '5993502384',
  ADMIN_TELEGRAM_ID: 5993502384,
  BOT_USERNAME: 'SWWSHOPBOT',
  APP_NAME: 'SHOP',
  SUPPORT_USERNAME: '@bmqna',
  BASE_USERS_COUNT: 79,
  DEFAULT_CASHBACK: 10,
  MAX_COIN_PERCENT: 20,

  REFERRAL: {
    NEW_USER_DISCOUNT: 5,
    REFERRER_REWARD: 10,
    MIN_REFERRAL_SUM: 1000,
    MIN_REFERRAL_ORDERS: 3
  },

  CASES: {
    COUPON_COOLDOWN_MS: 3 * 24 * 60 * 60 * 1000,
    COIN_COOLDOWN_MS:   7 * 24 * 60 * 60 * 1000
  },

  FIREBASE: {
    apiKey: "AIzaSyDEMDoBe8qtBcKUzmPlOLStCwn21_x5SBQ",
    authDomain: "swwshop.firebaseapp.com",
    databaseURL: "https://swwshop-default-rtdb.firebaseio.com",
    projectId: "swwshop",
    storageBucket: "swwshop.firebasestorage.app",
    messagingSenderId: "698268675105",
    appId: "1:698268675105:web:15814d169ee2e74c8e4760"
  }
};

firebase.initializeApp(CONFIG.FIREBASE);
const db = firebase.database();

const BOT_TOKEN = CONFIG.BOT_TOKEN;
const CHAT_ID = CONFIG.CHAT_ID;
const ADMIN_TELEGRAM_ID = CONFIG.ADMIN_TELEGRAM_ID;
const BASE_USERS_COUNT = CONFIG.BASE_USERS_COUNT;

let user = null;
let isAdmin = false;
let data = { liquids: [], pouches: [], coils: [], devices: [] };
let orders = [];
let promos = {};
let users = {};
let userOrders = [];
let cart = JSON.parse(localStorage.getItem('sww_cart') || '[]');
let appliedDiscount = null;
let useDiscountInOrder = true;
let useBalanceInOrder = false;
let currentPage = 'catalog';
let currentCategory = '';
let initialized = false;
let submittingOrder = false;

let caseOpening = { coupon: false, coin: false };
let caseLastOpen = {
  coupon: parseInt(localStorage.getItem('sww_case_coupon_last') || '0'),
  coin: parseInt(localStorage.getItem('sww_case_coin_last') || '0')
};

/* =========================================================
   ПРЕЛОАДЕР
   ========================================================= */
(function initPreloader() {
  const canvas = document.getElementById('preloaderCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb', '#1d4ed8', '#ffffff'];

  function getSPoints(count, cx, cy, radius) {
    const points = [];
    const R = radius;
    const totalTop = Math.floor(count * 0.35);
    const totalBottom = Math.floor(count * 0.35);
    const totalMid = count - totalTop - totalBottom;
    for (let i = 0; i < totalTop; i++) {
      const t = i / totalTop;
      const angle = Math.PI * (1.15 - t * 1.35);
      const r = R * (0.75 + Math.sin(t * Math.PI) * 0.15);
      const x = cx + Math.cos(angle) * r * 0.9;
      const y = cy - R * 0.55 + Math.sin(angle) * R * 0.45;
      points.push({ x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3 });
    }
    for (let i = 0; i < totalBottom; i++) {
      const t = i / totalBottom;
      const angle = Math.PI * (-0.15 + t * 1.35);
      const r = R * (0.75 + Math.sin(t * Math.PI) * 0.15);
      const x = cx + Math.cos(angle) * r * 0.9;
      const y = cy + R * 0.55 + Math.sin(angle) * R * 0.45;
      points.push({ x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3 });
    }
    for (let i = 0; i < totalMid; i++) {
      const t = i / totalMid;
      const angle = Math.PI * (0.55 + t * 0.9);
      const x = cx + Math.cos(angle) * R * 0.6;
      const y = cy - R * 0.15 + t * R * 0.55;
      points.push({ x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3 });
    }
    return points;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const cx = width / 2;
  const cy = height / 2 + 10;
  const radius = Math.min(width, height) * 0.19;
  const S_POINTS = shuffle(getSPoints(240, cx, cy, radius));

  class Particle {
    constructor(x, y, target) {
      this.x = x; this.y = y;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.size = 1.2 + Math.random() * 2.5;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.alpha = 0.3 + Math.random() * 0.6;
      this.life = 0;
      this.target = target;
      this.attracted = false;
      this.delay = Math.random() * 80;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.02 + Math.random() * 0.04;
      this.trail = [];
      this.trailLen = 3 + Math.floor(Math.random() * 4);
      this.isStar = Math.random() < 0.15;
      this.orbitSpeed = 0.5 + Math.random() * 1.5;
      this.offsetX = (Math.random() - 0.5) * 2;
      this.offsetY = (Math.random() - 0.5) * 2;
    }
    update(time) {
      this.life++;
      this.pulsePhase += this.pulseSpeed;
      if (this.attracted && this.life > this.delay) {
        const dx = (this.target.x + this.offsetX * 2) - this.x;
        const dy = (this.target.y + this.offsetY * 2) - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = Math.min(0.02, 0.8 / (dist + 20));
        this.vx += dx * force; this.vy += dy * force;
        if (dist < 15) {
          const angle = time * 0.001 * this.orbitSpeed;
          this.vx += Math.cos(angle) * 0.05;
          this.vy += Math.sin(angle) * 0.05;
        }
        this.vx *= 0.92; this.vy *= 0.92;
      } else {
        this.vx += (Math.random() - 0.5) * 0.03;
        this.vy += (Math.random() - 0.5) * 0.03;
        this.vx *= 0.97; this.vy *= 0.97;
      }
      this.x += this.vx; this.y += this.vy;
      if (this.x < -10) this.x = width + 10;
      if (this.x > width + 10) this.x = -10;
      if (this.y < -10) this.y = height + 10;
      if (this.y > height + 10) this.y = -10;
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.trailLen) this.trail.shift();
    }
    draw() {
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const trailAlpha = (i / this.trail.length) * this.alpha * 0.35;
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      const pulse = 0.75 + Math.sin(this.pulsePhase) * 0.25;
      const drawSize = this.size * pulse;
      ctx.globalAlpha = this.alpha * pulse;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, drawSize, 0, Math.PI * 2);
      ctx.fill();
      const glowSize = this.isStar ? this.size * 4 : this.size * 2.5;
      const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
      glow.addColorStop(0, this.color);
      glow.addColorStop(1, 'transparent');
      ctx.globalAlpha = this.alpha * 0.4;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      if (this.isStar && this.life > 30) {
        ctx.globalAlpha = this.alpha * 0.6 * pulse;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - drawSize * 2, this.y);
        ctx.lineTo(this.x + drawSize * 2, this.y);
        ctx.moveTo(this.x, this.y - drawSize * 2);
        ctx.lineTo(this.x, this.y + drawSize * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  const particles = [];
  const TOTAL = 240;
  for (let i = 0; i < TOTAL; i++) {
    particles.push(new Particle(Math.random() * width, Math.random() * height, S_POINTS[i % S_POINTS.length]));
  }
  setTimeout(() => { particles.forEach(p => { p.attracted = true; }); }, 600);

  let rafId;
  let running = true;
  let startTime = performance.now();

  function animate(now) {
    if (!running) return;
    ctx.fillStyle = 'rgba(10, 14, 23, 0.18)';
    ctx.fillRect(0, 0, width, height);
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.5);
    const time = (now - startTime) / 1000;
    const glowIntensity = 0.04 + Math.sin(time * 1.5) * 0.02;
    centerGlow.addColorStop(0, `rgba(59, 130, 246, ${glowIntensity})`);
    centerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update(now);
      particles[i].draw();
    }
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);

  window.__stopPreloader = function stopPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader || preloader.classList.contains('hide')) return;
    particles.forEach(p => {
      p.attracted = false;
      const dx = p.x - cx, dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 12 + Math.random() * 8;
      p.vx = (dx / dist) * speed + (Math.random() - 0.5) * 3;
      p.vy = (dy / dist) * speed + (Math.random() - 0.5) * 3;
      p.alpha = 1;
      p.size *= 1.3;
    });
    setTimeout(() => {
      preloader.classList.add('hide');
      setTimeout(() => {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        preloader.style.display = 'none';
      }, 1200);
    }, 500);
  };
})();

/* =========================================================
   ID / START_PARAM
   ========================================================= */
function getUserId() {
  const tgU = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgU) return 'tg_' + tgU.id;
  let id = localStorage.getItem('sww_uid');
  if (!id) { id = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); localStorage.setItem('sww_uid', id); }
  return id;
}

function generateShortId(uid) {
  if (uid === 'tg_' + ADMIN_TELEGRAM_ID) return 'SWWSHOP-OWNER';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash = hash & hash;
  }
  const base = Math.abs(hash).toString(36).toUpperCase();
  const padded = (base + '00000000').slice(0, 8);
  return 'SWW-' + padded.slice(0, 4) + '-' + padded.slice(4, 8);
}

async function getUniqueShortId() {
  const counterRef = db.ref('meta/shortIdCounter');
  const result = await counterRef.transaction(current => (current || 0) + 1);
  if (!result.committed) throw new Error('Не удалось получить ID');
  const num = result.snapshot.val();
  const base = num.toString(36).toUpperCase().padStart(8, '0');
  return 'SWW-' + base.slice(0, 4) + '-' + base.slice(4, 8);
}

async function waitForStartParam(maxWaitMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); tg.expand(); } catch (_) {}
      const sp = tg.initDataUnsafe?.start_param;
      if (sp && sp.startsWith('ref_')) return sp;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return '';
}

/* =========================================================
   РЕФЕРАЛКА
   ========================================================= */
async function getOrCreateReferralCode(uid) {
  const snap = await db.ref('users/' + uid + '/referralCode').once('value');
  const existing = snap.val();
  if (existing) return existing;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  await db.ref('users/' + uid + '/referralCode').set(code);
  return code;
}

function getReferralLink() {
  if (!user?.referralCode) return '';
  return `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_NAME}?startapp=ref_${user.referralCode}`;
}

async function handleReferral(startParam, uid, existingUserData) {
  if (!startParam || !startParam.startsWith('ref_')) return false;
  const refCode = startParam.replace('ref_', '').toUpperCase();
  if (existingUserData?.referredBy) return false;
  const snap = await db.ref('users').orderByChild('referralCode').equalTo(refCode).once('value');
  const found = snap.val();
  if (!found) return false;
  const referrerUid = Object.keys(found)[0];
  if (referrerUid === uid) return false;
  await db.ref('users/' + uid).update({ referredBy: referrerUid, referredAt: Date.now() });
  await db.ref('users/' + referrerUid + '/referrals/' + uid).set({
    joinedAt: Date.now(),
    firstName: user.firstName || 'Пользователь',
    username: user.username || '',
    telegramId: user.telegramId || null,
    totalOrders: 0, totalSum: 0
  });
  const refTgId = found[referrerUid].telegramId;
  if (refTgId && BOT_TOKEN && !BOT_TOKEN.startsWith('__')) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: refTgId,
        text: `🎉 По вашей ссылке зарегистрировался новый пользователь!\n\n👤 ${user.firstName}${user.username ? ' @' + user.username : ''}`
      })
    }).catch(() => {});
  }
  user.referredBy = referrerUid;
  toast('🎉 Вы пришли по реферальной ссылке!', '🎁');
  return true;
}

async function checkReferralRewards(uid) {
  const refSnap = await db.ref('users/' + uid + '/referrals').once('value');
  const refs = refSnap.val();
  if (!refs) return;
  for (const refUid of Object.keys(refs)) {
    const ordersSnap = await db.ref('orders').orderByChild('userId').equalTo(refUid).once('value');
    const ordersVal = ordersSnap.val() || {};
    const list = Object.values(ordersVal);
    const completed = list.filter(o => o.status === 'completed');
    if (completed.length >= CONFIG.REFERRAL.MIN_REFERRAL_ORDERS) {
      const totalSum = completed.reduce((s, o) => s + (o.totalPrice || o.total || 0), 0);
      if (totalSum >= CONFIG.REFERRAL.MIN_REFERRAL_SUM) {
        const rewardSnap = await db.ref('users/' + uid + '/referrals/' + refUid + '/rewardPaid').once('value');
        if (!rewardSnap.val()) await giveReferrerReward(uid, refUid, totalSum);
      }
    }
    await db.ref('users/' + uid + '/referrals/' + refUid).update({
      totalOrders: list.length,
      totalSum: list.reduce((s, o) => s + (o.totalPrice || o.total || 0), 0),
      lastUpdated: Date.now()
    });
  }
}

async function giveReferrerReward(referrerUid, referralUid, referralSum) {
  const thousands = Math.floor(referralSum / CONFIG.REFERRAL.MIN_REFERRAL_SUM);
  const rewardPercent = thousands * CONFIG.REFERRAL.REFERRER_REWARD;
  if (rewardPercent <= 0) return;
  const code = 'REF-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  await db.ref('promos/' + code).set({
    discount: rewardPercent, used: false, created: Date.now(),
    type: 'referral', userId: referrerUid, uses: 0, maxUses: 1
  });
  await db.ref('users/' + referrerUid + '/referrals/' + referralUid + '/rewardPaid').set({
    paid: true, code, percent: rewardPercent, sum: referralSum, paidAt: Date.now()
  });
  const tgSnap = await db.ref('users/' + referrerUid + '/telegramId').once('value');
  const tgId = tgSnap.val();
  if (tgId && BOT_TOKEN && !BOT_TOKEN.startsWith('__')) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tgId,
        text: `🎁 <b>Реферальная награда!</b>\n\nВаш реферал сделал заказов на <b>${referralSum}₽</b>\nВам начислена скидка <b>${rewardPercent}%</b>\n\nПромокод: <code>${code}</code>`,
        parse_mode: 'HTML'
      })
    }).catch(() => {});
  }
}

async function getUserReferralStats() {
  const snap = await db.ref('users/' + user.id + '/referrals').once('value');
  const refs = snap.val() || {};
  const list = Object.values(refs);
  return {
    totalReferrals: list.length,
    totalOrders: list.reduce((s, r) => s + (r.totalOrders || 0), 0),
    totalSum: list.reduce((s, r) => s + (r.totalSum || 0), 0),
    activeReferrals: list.filter(r => (r.totalOrders || 0) >= CONFIG.REFERRAL.MIN_REFERRAL_ORDERS).length
  };
}

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */
async function initUser() {
  const uid = getUserId();
  const tgU = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const adminLoggedOut = localStorage.getItem('sww_admin_logged_out') === 'true';
  const isOwnerByTg = tgU && tgU.id === ADMIN_TELEGRAM_ID;
  const isOwnerByWeb = localStorage.getItem('sww_admin') === 'true';
  isAdmin = !adminLoggedOut && (isOwnerByTg || isOwnerByWeb);

  if (tgU) {
    user = {
      id: uid, telegramId: tgU.id,
      firstName: tgU.first_name || 'Пользователь',
      lastName: tgU.last_name || '',
      username: tgU.username || '',
      photoUrl: tgU.photo_url || '',
      isAdmin
    };
    try { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } catch (_) {}
  } else {
    user = { id: uid, telegramId: null, firstName: 'Гость', lastName: '', username: '', photoUrl: '', isAdmin };
  }

  const startParam = await waitForStartParam(3000);
  const snap = await db.ref('users/' + uid).once('value');
  const u = snap.val();

  if (uid === 'tg_' + ADMIN_TELEGRAM_ID) user.shortId = 'SWWSHOP-OWNER';
  else if (u?.shortId && u.shortId.startsWith('SWW-')) user.shortId = u.shortId;
  else {
    try { user.shortId = await getUniqueShortId(); }
    catch (e) { user.shortId = generateShortId(uid); }
  }

  user.referralCode = u?.referralCode || await getOrCreateReferralCode(uid);
  user.referredBy = u?.referredBy || null;
  user.balance = u?.balance || 0;

  if (startParam.startsWith('ref_')) await handleReferral(startParam, uid, u);

  if (u) {
    user.savedDiscount = u.savedDiscount || null;
    user.firstSeen = u.firstSeen;
    user.phone = u.phone || '';
    user.contactUsername = u.contactUsername || '';
    if (!user.photoUrl && u.photoUrl) user.photoUrl = u.photoUrl;
    if (u.referredBy) user.referredBy = u.referredBy;
    if (typeof u.balance === 'number') user.balance = u.balance;
  } else {
    user.phone = ''; user.contactUsername = ''; user.balance = 0;
  }

  await db.ref('users/' + uid).update({
    id: uid, shortId: user.shortId, referralCode: user.referralCode,
    firstName: user.firstName, lastName: user.lastName, username: user.username,
    telegramId: user.telegramId, photoUrl: user.photoUrl || null,
    balance: user.balance, isAdmin,
    lastSeen: Date.now(),
    firstSeen: u?.firstSeen || Date.now()
  });

  db.ref('users/' + uid + '/balance').on('value', s => {
    const bal = s.val() || 0;
    user.balance = bal;
    updateBalanceUI();
    if (currentPage === 'order') renderOrder();
  });

  db.ref('meta/settings/cashback').on('value', s => {
    const v = s.val();
    if (typeof v === 'number') {
      CONFIG.DEFAULT_CASHBACK = v;
      if (currentPage === 'catalog' || currentPage === 'order') render();
    }
  });

  db.ref('meta/settings/maxCoinPercent').on('value', s => {
    const v = s.val();
    if (typeof v === 'number') {
      CONFIG.MAX_COIN_PERCENT = v;
      if (currentPage === 'order') renderOrder();
    }
  });

  try { await checkReferralRewards(uid); } catch (_) {}
  await applySavedPromo();
  loadUserOrders();

  if (isAdmin) setTimeout(() => toast('👑 Вы вошли как администратор', '👑'), 800);
  setTimeout(() => { if (window.__stopPreloader) window.__stopPreloader(); }, 2400);
}

function updateBalanceUI() {
  const el = document.getElementById('headerBalance');
  if (el) el.textContent = (user?.balance || 0).toLocaleString('ru-RU');
}

async function applySavedPromo() {
  const uid = getUserId();
  const ordersSnap = await db.ref('orders').orderByChild('userId').equalTo(uid).once('value');
  const ordersVal = ordersSnap.val() || {};
  const hasOrders = Object.values(ordersVal).some(o => o.status === 'completed' || o.status === 'pending');
  if (!hasOrders && !isAdmin) {
    appliedDiscount = {
      code: 'FIRST-' + CONFIG.REFERRAL.NEW_USER_DISCOUNT,
      discount: CONFIG.REFERRAL.NEW_USER_DISCOUNT,
      type: 'first_order', locked: true
    };
    useDiscountInOrder = true;
    return;
  }
  const myPromos = Object.entries(promos || {}).filter(([code, p]) => {
    if (p.used) return false;
    if (p.userId === uid) return true;
    if (!p.userId && !p.usedBy) return true;
    return false;
  });
  if (myPromos.length > 0) {
    const best = myPromos.reduce((a, b) => (a[1].discount > b[1].discount ? a : b));
    appliedDiscount = {
      code: best[0], discount: best[1].discount,
      type: best[1].type || 'promo', locked: false
    };
    db.ref('users/' + uid + '/savedDiscount').set(appliedDiscount);
  } else {
    appliedDiscount = null;
    useDiscountInOrder = false;
  }
}

function loadUserOrders() {
  const uid = getUserId();
  db.ref('orders').orderByChild('userId').equalTo(uid).on('value', s => {
    const val = s.val();
    userOrders = val ? Object.values(val) : [];
    if (currentPage === 'profile') renderProfile();
    if (currentPage === 'order') renderOrder();
  });
  if (isAdmin) {
    db.ref('orders').on('value', s => {
      const val = s.val();
      orders = val ? Object.values(val) : [];
    });
  }
}

function getUserStats() {
  return {
    totalOrders: userOrders.length,
    totalSum: userOrders.reduce((s, o) => s + (o.totalPrice || o.total || 0), 0),
    maxOrder: userOrders.reduce((m, o) => Math.max(m, o.totalPrice || o.total || 0), 0)
  };
}

function loadAssortment() {
  db.ref('assortment').on('value', s => {
    const v = s.val();
    data = v || { liquids: [], pouches: [], coils: [], devices: [] };
    ['liquids', 'pouches', 'coils', 'devices'].forEach(c => { if (!data[c]) data[c] = []; });
    if (!initialized) {
      initialized = true;
      render();
    } else if (currentPage === 'catalog') {
      renderCatalog();
    }
  });
}

function loadPromos() {
  db.ref('promos').on('value', s => {
    promos = s.val() || {};
    applySavedPromo().then(() => {
      if (currentPage === 'order') renderOrder();
    });
  });
}

function loadUsers() {
  db.ref('users').on('value', s => { users = s.val() || {}; });
}

/* =========================================================
   УТИЛИТЫ
   ========================================================= */
function getCashback(item) {
  if (item?.cashback != null) return Number(item.cashback);
  return CONFIG.DEFAULT_CASHBACK;
}

function openOverlay(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeOverlay(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}
document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) closeOverlay(o.id); });
});

function toast(text, icon = '✅') {
  const t = document.getElementById('toast');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastText').textContent = text;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function copyText(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('📋 Скопировано', '📋'));
}

function openSupport() {
  const tg = window.Telegram?.WebApp;
  const url = 'https://t.me/' + CONFIG.SUPPORT_USERNAME.replace('@', '');
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank');
}

function toggleTheme() {
  const next = document.body.classList.contains('light') ? 'dark' : 'light';
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(next);
  localStorage.setItem('sww_theme', next);
  toast(next === 'light' ? '☀️ Светлая' : '🌙 Тёмная', '🎨');
}

function toggleWinter() {
  if (!user.isAdmin) return;
  document.body.classList.toggle('winter');
  const on = document.body.classList.contains('winter');
  localStorage.setItem('sww_winter', on ? 'true' : 'false');
  if (on) createSnow(); else removeSnow();
  toast(on ? '❄️ Зима' : '☀️ Обычная', '❄️');
}

function createSnow() {
  removeSnow();
  for (let i = 0; i < 30; i++) {
    const f = document.createElement('div');
    f.className = 'snowflake';
    f.textContent = ['❄', '❅', '❆', '•'][Math.floor(Math.random() * 4)];
    f.style.left = Math.random() * 100 + '%';
    f.style.animationDuration = (5 + Math.random() * 8) + 's';
    f.style.animationDelay = Math.random() * 5 + 's';
    f.style.fontSize = (10 + Math.random() * 14) + 'px';
    document.body.appendChild(f);
  }
}
function removeSnow() {
  document.querySelectorAll('.snowflake').forEach(f => f.remove());
}

/* =========================================================
   НАВИГАЦИЯ
   ========================================================= */
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  if (!user) return;
  updateBalanceUI();
  if (currentPage === 'catalog') renderCatalog();
  else if (currentPage === 'order') renderOrder();
  else if (currentPage === 'cases') renderCases();
  else if (currentPage === 'profile') renderProfile();
  updateCartBadge();
}

/* =========================================================
   КАТАЛОГ
   ========================================================= */
function renderCatalog() {
  const cats = [
    { id: 'liquids', name: 'Жидкости', desc: 'Для pod-систем и вейпов', icon: 'drop' },
    { id: 'pouches', name: 'Шайбы', desc: 'Никотиновые паучи', icon: 'cube' },
    { id: 'coils', name: 'Испарители', desc: 'Сменные койлы', icon: 'flame' },
    { id: 'devices', name: 'Устройства', desc: 'Под-системы и боксы', icon: 'device' }
  ];
  document.getElementById('app').innerHTML = `
    <section class="hero">
      <div class="hero-badge"><span class="dot"></span> Каталог</div>
      <h1>Добро пожаловать в<br><span class="grad">SWWSHOP</span></h1>
      <p>Премиальные жидкости, шайбы и устройства</p>
    </section>
    <section class="section">
      <div class="section-title">Категории</div>
      ${cats.map(c => renderCatCard(c)).join('')}
      ${isAdmin ? `
        <div style="margin-top:16px;padding:16px;background:var(--card);border:2px dashed var(--warning);border-radius:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--warning);margin-bottom:10px;">👑 Быстрые действия админа</div>
          <button class="admin-action-btn btn-green" onclick="openAddLineModal()">➕ Добавить линейку (жидкости/шайбы)</button>
          <button class="admin-action-btn btn-cyan" onclick="openAddItemModal()">➕ Добавить товар (испарители/устройства)</button>
        </div>
      ` : ''}
    </section>
  `;
}

function renderCatCard(cat) {
  const count = (data[cat.id] || []).length;
  const icons = {
    drop: '<path d="M12 2L4 14a8 8 0 1 0 16 0z" stroke-linejoin="round"/>',
    cube: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    device: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>'
  };
  return `
    <div class="cat-card" onclick="openCategory('${cat.id}')">
      <div class="cat-left">
        <div class="cat-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[cat.icon]}</svg>
        </div>
        <div class="cat-info">
          <div class="cat-name">${cat.name}</div>
          <div class="cat-desc">${cat.desc}</div>
        </div>
      </div>
      <div class="cat-right">
        <span class="cat-count">${count}</span>
        <svg class="cat-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  `;
}

function openCategory(catId) {
  currentCategory = catId;
  const titles = { liquids: 'Жидкости', pouches: 'Шайбы', coils: 'Испарители', devices: 'Устройства' };
  const isSimple = catId === 'coils' || catId === 'devices';
  document.getElementById('app').innerHTML = `
    <button class="back-btn" onclick="navigate('catalog')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      Назад
    </button>
    <h1 style="font-size:22px;font-weight:800;margin-bottom:16px;">${titles[catId]}</h1>
    <input type="text" class="search-input" placeholder="🔍 Поиск..." oninput="filterProducts(this.value)" />
    ${isAdmin ? `
      <button class="admin-action-btn ${isSimple ? 'btn-cyan' : 'btn-green'}" 
              onclick="${isSimple ? `openAddItemModal('${catId}')` : `openAddLineModal('${catId}')`}"
              style="margin-bottom:14px;">
        ➕ Добавить ${isSimple ? 'товар' : 'линейку'}
      </button>
    ` : ''}
    <div id="productsList">${renderProducts(catId)}</div>
  `;
}

function renderProducts(catId) {
  const items = data[catId] || [];
  if (!items.length) return '<div class="empty-state"><div class="icon">📦</div><h3>Товаров пока нет</h3></div>';

  if (catId === 'liquids' || catId === 'pouches') {
    return items.map((line, i) => {
      const totalQty = line.flavors.reduce((s, f) => s + (f.quantity || 0), 0);
      const cb = getCashback(line);
      return `
        <div style="position:relative;margin-bottom:10px;">
          <div class="cat-card" onclick="openLine('${catId}', ${i})">
            <div class="cat-left">
              <div class="cat-info">
                <div class="cat-name">${line.name}</div>
                <div class="cat-desc">${line.flavors.length} вкусов${isAdmin ? ` · ${totalQty} шт` : ''}</div>
              </div>
            </div>
            <div class="cat-right">
              <span class="product-square-cashback" style="font-size:10px;">🪙 ${cb}%</span>
              <span class="cat-count">${line.price} ₽</span>
              <svg class="cat-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
          ${isAdmin ? `
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button class="admin-action-btn btn-orange" style="margin-top:0;padding:8px;font-size:12px;" 
                      onclick="event.stopPropagation();openEditLineModal('${catId}', ${i})">✏️ Изменить</button>
              <button class="admin-action-btn btn-red" style="margin-top:0;padding:8px;font-size:12px;" 
                      onclick="event.stopPropagation();adminDeleteLine('${catId}', ${i})">🗑️ Удалить</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  } else {
    return `<div class="product-grid">${items.map((item, i) => renderSquareProduct(item, i, catId)).join('')}</div>`;
  }
}

function renderSquareProduct(item, i, catId) {
  const qty = item.quantity || 0;
  const inCart = cart.some(c => c.id === item.id);
  const canAdd = qty > 0 && !inCart;
  const cb = getCashback(item);
  let statusClass = 'status-in-stock', statusText = 'В наличии';
  if (inCart) { statusClass = 'status-in-cart'; statusText = '✓ В корзине'; }
  else if (qty === 0) { statusClass = 'status-out-stock'; statusText = 'Нет'; }

  return `
    <div class="product-square ${inCart ? 'in-cart' : ''} ${qty === 0 ? 'out-of-stock' : ''}">
      <div class="product-square-top">
        <div class="product-square-name">${item.name}</div>
        <div class="product-square-price">${item.price} ₽</div>
      </div>
      <div class="product-square-bottom">
        <span class="product-square-cashback">🪙 Кешбек ${cb}%</span>
        <span class="product-square-status ${statusClass}">${statusText}</span>
        <button class="btn-add-cart ${inCart ? 'in-cart' : ''}" ${canAdd ? '' : 'disabled'}
                onclick="event.stopPropagation();${canAdd ? `addToCartSimple('${catId}', ${i})` : ''}">
          ${inCart ? '✓ В корзине' : (qty > 0 ? '🛒 Добавить' : 'Нет')}
        </button>
      </div>
      ${isAdmin ? `
        <div style="display:flex;gap:4px;margin-top:6px;position:relative;z-index:1;">
          <button class="admin-action-btn btn-orange" style="margin-top:0;padding:6px;font-size:11px;flex:1;" 
                  onclick="event.stopPropagation();openEditItemModal('${catId}', ${i})">✏️</button>
          <button class="admin-action-btn btn-red" style="margin-top:0;padding:6px;font-size:11px;flex:1;" 
                  onclick="event.stopPropagation();adminDeleteItem('${catId}', ${i})">🗑️</button>
        </div>
      ` : ''}
    </div>
  `;
}

function filterProducts(query) {
  const items = data[currentCategory] || [];
  const q = query.toLowerCase().trim();
  const container = document.getElementById('productsList');
  if (!q) { container.innerHTML = renderProducts(currentCategory); return; }
  const filtered = items.filter(it => it.name.toLowerCase().includes(q));
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><h3>Ничего не найдено</h3></div>';
    return;
  }
  const orig = data[currentCategory];
  data[currentCategory] = filtered;
  container.innerHTML = renderProducts(currentCategory);
  data[currentCategory] = orig;
}

function openLine(catId, index) {
  currentCategory = catId;
  const line = data[catId][index];
  if (!line) { navigate('catalog'); return; }
  const cb = getCashback(line);

  document.getElementById('app').innerHTML = `
    <button class="back-btn" onclick="openCategory('${catId}')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      Назад
    </button>
    <h1 style="font-size:22px;font-weight:800;margin-bottom:6px;">${line.name}</h1>
    <p style="color:var(--accent);font-weight:700;font-size:18px;margin-bottom:6px;">${line.price} ₽</p>
    <span class="product-square-cashback" style="margin-bottom:20px;display:inline-block;">🪙 Кешбек ${cb}%</span>

    ${isAdmin ? `
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        <button class="admin-action-btn btn-orange" style="margin-top:0;flex:1;" 
                onclick="openEditLineModal('${catId}', ${index})">✏️ Изменить линейку</button>
        <button class="admin-action-btn btn-red" style="margin-top:0;flex:1;" 
                onclick="adminDeleteLine('${catId}', ${index})">🗑️ Удалить</button>
      </div>
    ` : ''}

    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      <span>Выберите вкус (${line.flavors.length})</span>
      ${isAdmin ? `
        <button class="admin-action-btn btn-green" style="margin-top:0;width:auto;padding:6px 12px;font-size:12px;" 
                onclick="openAddFlavorModal('${catId}', ${index})">➕ Вкус</button>
      ` : ''}
    </div>

    ${line.flavors.map((f, fi) => {
      const qty = f.quantity || 0;
      const inCart = cart.some(c => c.id === f.id);
      const canAdd = qty > 0 && !inCart;
      let sc = 'status-in-stock', st = 'В наличии';
      if (inCart) { sc = 'status-in-cart'; st = '✓ В корзине'; }
      else if (qty === 0) { sc = 'status-out-stock'; st = 'Нет'; }

      return `
        <div class="flavor-row" style="flex-wrap:wrap;">
          <span class="flavor-name">${f.name}</span>
          <div class="flavor-actions">
            ${isAdmin ? `<span style="font-size:11px;color:var(--warning);font-weight:700;">${qty} шт</span>` : ''}
            <span class="product-square-status ${sc}">${st}</span>
            <button class="btn-add-cart ${inCart ? 'in-cart' : ''}" style="width:auto;padding:6px 12px;"
                    ${canAdd ? '' : 'disabled'}
                    onclick="${canAdd ? `addToCartFlavor('${catId}', ${index}, ${fi})` : ''}">
              ${inCart ? '✓' : (qty > 0 ? '🛒' : '—')}
            </button>
          </div>
          ${isAdmin ? `
            <div style="display:flex;gap:6px;width:100%;margin-top:8px;">
              <button class="admin-action-btn btn-orange" style="margin-top:0;flex:1;padding:6px;font-size:11px;" 
                      onclick="openEditFlavorModal('${catId}', ${index}, ${fi})">✏️ Изменить</button>
              <button class="admin-action-btn btn-red" style="margin-top:0;flex:1;padding:6px;font-size:11px;" 
                      onclick="adminDeleteFlavor('${catId}', ${index}, ${fi})">🗑️ Удалить</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  `;
}

/* =========================================================
   МОДАЛКИ АДМИНА
   ========================================================= */
function openAddLineModal(catId) {
  catId = catId || 'liquids';
  document.getElementById('editProductContent').innerHTML = `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">➕ Новая линейка</h3>
    <div class="field"><label>Название</label><input type="text" id="addLineName" placeholder="HQD Sweet" /></div>
    <div class="field"><label>Цена (₽)</label><input type="number" id="addLinePrice" placeholder="500" /></div>
    <div class="field">
      <label>Категория</label>
      <select id="addLineCategory">
        <option value="liquids" ${catId === 'liquids' ? 'selected' : ''}>Жидкости</option>
        <option value="pouches" ${catId === 'pouches' ? 'selected' : ''}>Шайбы</option>
      </select>
    </div>
    <div class="field"><label>Кешбек (%)</label><input type="number" id="addLineCashback" value="${CONFIG.DEFAULT_CASHBACK}" min="0" max="100" /></div>
    <div class="field">
      <label>Вкусы (название,кол-во — по одному на строку)</label>
      <textarea id="addLineFlavors" placeholder="Манго,3&#10;Клубника,5&#10;Арбуз,2" style="min-height:100px;"></textarea>
    </div>
    <p style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">💡 Формат: <b>Манго,3</b>. Можно без количества: <b>Манго</b> → будет 1.</p>
    <button class="btn btn-primary btn-block" onclick="adminAddLineSubmit()">💾 Создать</button>
  `;
  openOverlay('editProductOverlay');
}

function openAddItemModal(catId) {
  catId = catId || 'coils';
  document.getElementById('editProductContent').innerHTML = `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">➕ Новый товар</h3>
    <div class="field"><label>Название</label><input type="text" id="addItemName" placeholder="Voopoo PnP VM1" /></div>
    <div class="field"><label>Цена (₽)</label><input type="number" id="addItemPrice" placeholder="300" /></div>
    <div class="field">
      <label>Категория</label>
      <select id="addItemCategory">
        <option value="coils" ${catId === 'coils' ? 'selected' : ''}>Испарители</option>
        <option value="devices" ${catId === 'devices' ? 'selected' : ''}>Устройства</option>
      </select>
    </div>
    <div class="field"><label>Количество</label><input type="number" id="addItemQty" value="1" min="0" /></div>
    <div class="field"><label>Кешбек (%)</label><input type="number" id="addItemCashback" value="${CONFIG.DEFAULT_CASHBACK}" min="0" max="100" /></div>
    <button class="btn btn-primary btn-block" onclick="adminAddItemSubmit()">💾 Создать</button>
  `;
  openOverlay('editProductOverlay');
}

function openEditLineModal(catId, index) {
  const line = data[catId][index];
  if (!line) return;
  document.getElementById('editProductContent').innerHTML = `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">✏️ Изменить линейку</h3>
    <div class="field"><label>Название</label><input type="text" id="edLineName" value="${line.name.replace(/"/g, '&quot;')}" /></div>
    <div class="field"><label>Цена (₽)</label><input type="number" id="edLinePrice" value="${line.price}" /></div>
    <div class="field"><label>Кешбек (%)</label><input type="number" id="edLineCashback" value="${getCashback(line)}" min="0" max="100" /></div>
    <button class="btn btn-primary btn-block" onclick="adminSaveLine('${catId}', ${index})">💾 Сохранить</button>
  `;
  openOverlay('editProductOverlay');
}

function openEditItemModal(catId, index) {
  const item = data[catId][index];
  if (!item) return;
  document.getElementById('editProductContent').innerHTML = `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">✏️ Изменить товар</h3>
    <div class="field"><label>Название</label><input type="text" id="edItemName" value="${item.name.replace(/"/g, '&quot;')}" /></div>
    <div class="field"><label>Цена (₽)</label><input type="number" id="edItemPrice" value="${item.price}" /></div>
    <div class="field"><label>Количество</label><input type="number" id="edItemQty" value="${item.quantity || 0}" min="0" /></div>
    <div class="field"><label>Кешбек (%)</label><input type="number" id="edItemCashback" value="${getCashback(item)}" min="0" max="100" /></div>
    <button class="btn btn-primary btn-block" onclick="adminSaveItem('${catId}', ${index})">💾 Сохранить</button>
  `;
  openOverlay('editProductOverlay');
}

function openAddFlavorModal(catId, lineIndex) {
  document.getElementById('editProductContent').innerHTML = `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">➕ Новый вкус</h3>
    <div class="field"><label>Название вкуса</label><input type="text" id="newFlavorName" placeholder="Манго" /></div>
    <div class="field"><label>Количество</label><input type="number" id="newFlavorQty" value="1" min="0" /></div>
    <button class="btn btn-primary btn-block" onclick="adminAddFlavorSubmit('${catId}', ${lineIndex})">💾 Добавить</button>
  `;
  openOverlay('editProductOverlay');
}

function openEditFlavorModal(catId, lineIndex, flavorIndex) {
  const line = data[catId][lineIndex];
  const f = line.flavors[flavorIndex];
  if (!f) return;
  document.getElementById('editProductContent').innerHTML = `
    <h3 style="font-size:16px;font-weight:700;margin-bottom:14px;">✏️ Изменить вкус</h3>
    <div class="field"><label>Название вкуса</label><input type="text" id="edFlavorName" value="${f.name.replace(/"/g, '&quot;')}" /></div>
    <div class="field"><label>Количество</label><input type="number" id="edFlavorQty" value="${f.quantity || 0}" min="0" /></div>
    <button class="btn btn-primary btn-block" onclick="adminSaveFlavor('${catId}', ${lineIndex}, ${flavorIndex})">💾 Сохранить</button>
  `;
  openOverlay('editProductOverlay');
}

/* =========================================================
   ДЕЙСТВИЯ АДМИНА
   ========================================================= */
async function adminAddLineSubmit() {
  const name = document.getElementById('addLineName').value.trim();
  const price = parseInt(document.getElementById('addLinePrice').value);
  const category = document.getElementById('addLineCategory').value;
  const cashback = parseInt(document.getElementById('addLineCashback').value);
  const flavorsText = document.getElementById('addLineFlavors').value.trim();

  if (!name || !price) { toast('❌ Заполни название и цену', '❌'); return; }
  if (!flavorsText) { toast('❌ Добавь хотя бы один вкус', '❌'); return; }
  if (isNaN(cashback) || cashback < 0 || cashback > 100) { toast('❌ Кешбек 0-100', '❌'); return; }

  const flavors = flavorsText.split('\n').filter(l => l.trim()).map(l => {
    const parts = l.split(',');
    const fName = parts[0].trim();
    let fQty = 1;
    if (parts.length >= 2) {
      const raw = parts[1].trim();
      if (raw.toUpperCase() === 'YES') fQty = 1;
      else {
        const p = parseInt(raw);
        if (!isNaN(p) && p >= 0) fQty = p;
      }
    }
    return {
      id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: fName, quantity: fQty, inStock: fQty > 0
    };
  });

  if (!data[category]) data[category] = [];
  data[category].push({ name, price, cashback, flavors });
  await db.ref('assortment').set(data);
  toast(`✅ Линейка добавлена (${flavors.length} вкусов)`, '✅');
  closeOverlay('editProductOverlay');
}

async function adminAddItemSubmit() {
  const name = document.getElementById('addItemName').value.trim();
  const price = parseInt(document.getElementById('addItemPrice').value);
  const category = document.getElementById('addItemCategory').value;
  const qty = parseInt(document.getElementById('addItemQty').value) || 0;
  const cashback = parseInt(document.getElementById('addItemCashback').value);

  if (!name || !price) { toast('❌ Заполни название и цену', '❌'); return; }
  if (isNaN(cashback) || cashback < 0 || cashback > 100) { toast('❌ Кешбек 0-100', '❌'); return; }

  if (!data[category]) data[category] = [];
  data[category].push({
    id: 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    name, price, cashback, quantity: qty, inStock: qty > 0
  });
  await db.ref('assortment').set(data);
  toast('✅ Товар добавлен', '✅');
  closeOverlay('editProductOverlay');
}

async function adminSaveLine(catId, index) {
  const line = data[catId][index];
  if (!line) return;
  const name = document.getElementById('edLineName').value.trim();
  const price = parseInt(document.getElementById('edLinePrice').value);
  const cb = parseInt(document.getElementById('edLineCashback').value);
  if (!name || isNaN(price) || price < 0) { toast('❌ Заполни поля', '❌'); return; }
  if (isNaN(cb) || cb < 0 || cb > 100) { toast('❌ Кешбек 0-100', '❌'); return; }
  line.name = name; line.price = price; line.cashback = cb;
  await db.ref('assortment').set(data);
  toast('✅ Сохранено', '✅');
  closeOverlay('editProductOverlay');
  openLine(catId, index);
}

async function adminSaveItem(catId, index) {
  const item = data[catId][index];
  if (!item) return;
  const name = document.getElementById('edItemName').value.trim();
  const price = parseInt(document.getElementById('edItemPrice').value);
  const qty = parseInt(document.getElementById('edItemQty').value);
  const cb = parseInt(document.getElementById('edItemCashback').value);
  if (!name || isNaN(price) || price < 0) { toast('❌ Заполни поля', '❌'); return; }
  if (isNaN(qty) || qty < 0) { toast('❌ Кол-во неверное', '❌'); return; }
  if (isNaN(cb) || cb < 0 || cb > 100) { toast('❌ Кешбек 0-100', '❌'); return; }
  item.name = name; item.price = price; item.quantity = qty;
  item.inStock = qty > 0; item.cashback = cb;
  await db.ref('assortment').set(data);
  toast('✅ Сохранено', '✅');
  closeOverlay('editProductOverlay');
  renderProductsInPlace();
}

async function adminAddFlavorSubmit(catId, lineIndex) {
  const line = data[catId][lineIndex];
  if (!line) return;
  const name = document.getElementById('newFlavorName').value.trim();
  const qty = parseInt(document.getElementById('newFlavorQty').value) || 0;
  if (!name) { toast('❌ Введи название', '❌'); return; }
  if (isNaN(qty) || qty < 0) { toast('❌ Кол-во неверное', '❌'); return; }
  if (!line.flavors) line.flavors = [];
  line.flavors.push({
    id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    name: name, quantity: qty, inStock: qty > 0
  });
  await db.ref('assortment').set(data);
  toast('✅ Вкус добавлен', '✅');
  closeOverlay('editProductOverlay');
  openLine(catId, lineIndex);
}

async function adminSaveFlavor(catId, lineIndex, flavorIndex) {
  const line = data[catId][lineIndex];
  if (!line || !line.flavors[flavorIndex]) return;
  const name = document.getElementById('edFlavorName').value.trim();
  const qty = parseInt(document.getElementById('edFlavorQty').value);
  if (!name) { toast('❌ Введи название', '❌'); return; }
  if (isNaN(qty) || qty < 0) { toast('❌ Кол-во неверное', '❌'); return; }
  line.flavors[flavorIndex].name = name;
  line.flavors[flavorIndex].quantity = qty;
  line.flavors[flavorIndex].inStock = qty > 0;
  await db.ref('assortment').set(data);
  toast('✅ Сохранено', '✅');
  closeOverlay('editProductOverlay');
  openLine(catId, lineIndex);
}

async function adminDeleteFlavor(catId, lineIndex, flavorIndex) {
  const line = data[catId][lineIndex];
  if (!line || !line.flavors[flavorIndex]) return;
  const fname = line.flavors[flavorIndex].name;
  if (!confirm(`Удалить вкус "${fname}"?`)) return;
  line.flavors.splice(flavorIndex, 1);
  await db.ref('assortment').set(data);
  toast('🗑️ Вкус удалён', '🗑️');
  openLine(catId, lineIndex);
}

async function adminDeleteLine(catId, index) {
  const line = data[catId][index];
  if (!line) return;
  if (!confirm(`Удалить линейку "${line.name}"?`)) return;
  data[catId].splice(index, 1);
  await db.ref('assortment').set(data);
  toast('🗑️ Линейка удалена', '🗑️');
  if (currentPage === 'catalog') openCategory(catId);
  else navigate('catalog');
}

async function adminDeleteItem(catId, index) {
  const item = data[catId][index];
  if (!item) return;
  if (!confirm(`Удалить "${item.name}"?`)) return;
  data[catId].splice(index, 1);
  await db.ref('assortment').set(data);
  toast('🗑️ Товар удалён', '🗑️');
  renderProductsInPlace();
}

/* =========================================================
   КОРЗИНА
   ========================================================= */
function addToCartSimple(catId, index) {
  const item = data[catId][index];
  if (!item || (item.quantity || 0) <= 0) { toast('❌ Нет в наличии', '❌'); return; }
  if (cart.some(c => c.id === item.id)) { toast('❌ Уже в корзине', '❌'); return; }
  cart.push({
    id: item.id, name: item.name, price: item.price, qty: 1,
    category: catId, index, type: 'simple', cashback: getCashback(item)
  });
  saveCart();
  toast('✅ Добавлено', '🛒');
  renderProductsInPlace();
}

function addToCartFlavor(catId, lineIndex, flavorIndex) {
  const line = data[catId][lineIndex];
  const flavor = line.flavors[flavorIndex];
  if (!flavor || (flavor.quantity || 0) <= 0) { toast('❌ Нет', '❌'); return; }
  if (cart.some(c => c.id === flavor.id)) { toast('❌ Уже в корзине', '❌'); return; }
  cart.push({
    id: flavor.id, name: flavor.name + ' (' + line.name + ')',
    price: line.price, qty: 1,
    category: catId, lineIndex, flavorIndex, type: 'flavor',
    cashback: getCashback(line)
  });
  saveCart();
  toast('✅ Добавлено', '🛒');
  openLine(catId, lineIndex);
}

function renderProductsInPlace() {
  const el = document.getElementById('productsList');
  if (el) el.innerHTML = renderProducts(currentCategory);
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  renderCart();
  if (currentPage === 'order') renderOrder();
  toast('🗑️ Удалено', '🗑️');
}

function saveCart() {
  localStorage.setItem('sww_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) {
    const totalQty = cart.reduce((s, c) => s + (c.qty || 1), 0);
    badge.style.display = totalQty > 0 ? 'block' : 'none';
    badge.textContent = totalQty;
  }
}

function openCart() { renderCart(); openOverlay('cartOverlay'); }

function getStockForCartItem(c) {
  if (!c) return 1;
  if (c.type === 'flavor') {
    const line = data[c.category]?.[c.lineIndex];
    return line?.flavors?.[c.flavorIndex]?.quantity || 0;
  }
  if (c.type === 'simple') return data[c.category]?.[c.index]?.quantity || 0;
  return 1;
}

function changeCartQty(index, delta) {
  const item = cart[index];
  if (!item) return;
  const maxStock = getStockForCartItem(item);
  const newQty = (item.qty || 1) + delta;
  if (newQty < 1) { toast('❌ Минимум 1', '❌'); return; }
  if (newQty > maxStock) { toast(`❌ Только ${maxStock} шт`, '❌'); return; }
  cart[index].qty = newQty;
  saveCart();
  renderCart();
  if (currentPage === 'order') renderOrder();
}

function renderCart() {
  const el = document.getElementById('cartContent');
  if (!cart.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><h3>Корзина пуста</h3></div>';
    return;
  }
  const subtotal = cart.reduce((s, c) => s + c.price * (c.qty || 1), 0);
  el.innerHTML = `
    ${cart.map((c, i) => {
      const max = getStockForCartItem(c);
      const q = c.qty || 1;
      return `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${c.name}</div>
            <div class="cart-item-price">${c.price} ₽ × ${q} = <b>${c.price * q} ₽</b></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            ${max > 1 ? `
              <button class="qty-btn" onclick="changeCartQty(${i}, -1)" ${q <= 1 ? 'disabled' : ''}>−</button>
              <span style="min-width:24px;text-align:center;font-weight:700;">${q}</span>
              <button class="qty-btn" onclick="changeCartQty(${i}, 1)" ${q >= max ? 'disabled' : ''}>+</button>
            ` : ''}
            <button class="btn btn-danger btn-sm" onclick="removeFromCart('${c.id}')">✕</button>
          </div>
        </div>
      `;
    }).join('')}
    <div class="cart-total"><span>Итого:</span><span class="val">${subtotal} ₽</span></div>
    <button class="btn btn-primary btn-block" style="margin-top:12px;"
            onclick="closeOverlay('cartOverlay');navigate('order')">Перейти к заказу →</button>
  `;
}

/* =========================================================
   ЗАКАЗ
   ========================================================= */
function renderOrder() {
  if (appliedDiscount?.locked) useDiscountInOrder = true;
  const subtotal = cart.reduce((s, c) => s + c.price * (c.qty || 1), 0);
  const totalQty = cart.reduce((s, c) => s + (c.qty || 1), 0);
  const totalCashbackRate = cart.length
    ? cart.reduce((s, c) => s + (c.cashback || CONFIG.DEFAULT_CASHBACK) * c.price * (c.qty || 1), 0) / subtotal
    : CONFIG.DEFAULT_CASHBACK;
  const MAX_COIN_PERCENT = CONFIG.MAX_COIN_PERCENT;
  const maxCoinByLimit = Math.floor(subtotal * MAX_COIN_PERCENT / 100);
  const maxCoinSpend = Math.min(user.balance || 0, maxCoinByLimit);
  const coinSpend = useBalanceInOrder ? maxCoinSpend : 0;
  const afterCoin = subtotal - coinSpend;
  let discountSum = 0;
  if (useDiscountInOrder && appliedDiscount) {
    discountSum = Math.round(afterCoin * appliedDiscount.discount / 100);
  }
  const finalTotal = afterCoin - discountSum;
  const totalCashback = Math.round(finalTotal * totalCashbackRate / 100);
  const canUseCoins = (user.balance || 0) > 0 && maxCoinByLimit > 0;

  document.getElementById('app').innerHTML = `
    <section class="hero" style="padding:16px 0;">
      <h1 style="font-size:24px;">Оформление<br><span class="grad">заказа</span></h1>
      <p>Монетами можно оплатить до ${MAX_COIN_PERCENT}% заказа</p>
    </section>

    <section class="section">
      <div class="section-title">🛒 Корзина (${totalQty} шт)</div>
      ${cart.length ? cart.map((c, i) => {
        const max = getStockForCartItem(c);
        const q = c.qty || 1;
        return `
          <div class="cart-item">
            <div class="cart-item-info">
              <div class="cart-item-name">${c.name}</div>
              <div class="cart-item-price">${c.price} ₽ × ${q} = <b>${c.price * q} ₽</b></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              ${max > 1 ? `
                <button class="qty-btn" onclick="changeCartQty(${i}, -1)" ${q <= 1 ? 'disabled' : ''}>−</button>
                <span style="min-width:24px;text-align:center;font-weight:700;">${q}</span>
                <button class="qty-btn" onclick="changeCartQty(${i}, 1)" ${q >= max ? 'disabled' : ''}>+</button>
              ` : ''}
              <button class="btn btn-danger btn-sm" onclick="removeFromCart('${c.id}')">✕</button>
            </div>
          </div>
        `;
      }).join('') : '<div class="empty-state"><div class="icon">📦</div><h3>Корзина пуста</h3></div>'}
      ${cart.length ? `<div class="cart-total"><span>Подытог:</span><span class="val">${subtotal} ₽</span></div>` : ''}
    </section>

    ${cart.length && canUseCoins ? `
      <section class="section">
        <div class="section-title">🪙 SWWCOIN (макс. ${MAX_COIN_PERCENT}%)</div>
        <div class="balance-toggle ${useBalanceInOrder ? 'active' : ''}" onclick="toggleBalance()">
          <div class="left">
            <span class="coin-icon" style="width:24px;height:24px;font-size:13px;">₴</span>
            <div>
              <div class="label">Списать ${maxCoinSpend} SWWCOIN = ${maxCoinSpend} ₽</div>
              <div class="sub">Доступно: ${user.balance} · Лимит: ${maxCoinByLimit} (${MAX_COIN_PERCENT}%)</div>
            </div>
          </div>
          <div class="toggle-switch ${useBalanceInOrder ? 'on gold' : ''}"></div>
        </div>
      </section>
    ` : ''}

    ${cart.length && appliedDiscount ? `
      <section class="section">
        <div class="section-title">🎫 Купон</div>
        <div class="promo-toggle ${useDiscountInOrder ? 'active' : ''} ${appliedDiscount.locked ? 'locked' : ''}"
             onclick="${appliedDiscount.locked ? '' : 'toggleDiscount()'}">
          <div class="left">
            <span class="icon">${appliedDiscount.locked ? '🎉' : '💎'}</span>
            <div>
              <div class="label">Скидка ${appliedDiscount.discount}%</div>
              <div class="sub">${appliedDiscount.code}</div>
            </div>
          </div>
          <div class="toggle-switch ${useDiscountInOrder ? 'on warning' : ''}"></div>
        </div>
      </section>
    ` : ''}

    ${cart.length ? `
      <section class="section">
        <div class="section-title">📋 Данные заказа</div>
        <div class="field"><label>Ваше имя *</label><input type="text" id="orderName" value="${user.firstName || ''}" /></div>
        <div class="field"><label>Телефон *</label><input type="tel" id="orderPhone" value="${user.phone || ''}" /></div>
        <div class="field"><label>Username *</label><input type="text" id="orderUsername" value="${user.contactUsername || (user.username ? '@' + user.username : '')}" /></div>
        <div class="field">
          <label>Способ оплаты *</label>
          <select id="orderPayment">
            <option value="">-- Выберите --</option>
            <option value="Наличные">Наличные</option>
            <option value="Безналичные">Безналичные</option>
            <option value="Смешанная">Смешанная</option>
          </select>
        </div>
        <div class="field"><label>Комментарий</label><textarea id="orderComment"></textarea></div>
      </section>

      <section class="section">
        <div class="section-title">💰 Итог</div>
        <div style="background:var(--bg-2);border-radius:16px;padding:14px;border:1px solid var(--border);">
          <div class="order-detail-row"><span class="lbl">Подытог:</span><span class="val">${subtotal} ₽</span></div>
          ${coinSpend > 0 ? `<div class="order-detail-row"><span class="lbl">🪙 SWWCOIN:</span><span class="val" style="color:var(--gold);">−${coinSpend} ₽</span></div>` : ''}
          ${discountSum > 0 ? `<div class="order-detail-row"><span class="lbl">Купон ${appliedDiscount.discount}%:</span><span class="val" style="color:var(--warning);">−${discountSum} ₽</span></div>` : ''}
          <div class="order-detail-row" style="border-top:2px solid var(--border);padding-top:12px;margin-top:8px;">
            <span class="lbl" style="font-weight:800;">К оплате:</span>
            <span class="val" style="font-size:18px;color:var(--accent);">${finalTotal} ₽</span>
          </div>
          <div class="order-detail-row" style="border:none;padding-top:8px;">
            <span class="lbl">🪙 Начислим кешбек:</span>
            <span class="val" style="color:var(--gold);">+${totalCashback} SWWCOIN</span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:14px;" id="submitOrderBtn" onclick="submitOrder()">✅ Оформить заказ</button>
      </section>
    ` : ''}
  `;
}

function toggleDiscount() {
  if (appliedDiscount?.locked) { toast('🔒 Нельзя отключить', '🔒'); return; }
  useDiscountInOrder = !useDiscountInOrder;
  renderOrder();
}

function toggleBalance() {
  useBalanceInOrder = !useBalanceInOrder;
  renderOrder();
}

async function submitOrder() {
  if (submittingOrder) { toast('⏳ Заказ уже создаётся', '⏳'); return; }
  if (!cart.length) { toast('❌ Корзина пуста', '❌'); return; }

  const name = document.getElementById('orderName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const contactUsername = document.getElementById('orderUsername').value.trim();
  const payment = document.getElementById('orderPayment').value;
  const comment = document.getElementById('orderComment').value.trim();

  if (!name || !phone || !contactUsername || !payment) {
    toast('❌ Заполните все поля', '❌');
    return;
  }

  submittingOrder = true;
  const btn = document.getElementById('submitOrderBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Оформляем...'; }

  const contact = phone + ' / ' + contactUsername;
  user.phone = phone;
  user.contactUsername = contactUsername;

  const subtotal = cart.reduce((s, c) => s + c.price * (c.qty || 1), 0);
  const MAX_COIN_PERCENT = CONFIG.MAX_COIN_PERCENT;
  const maxCoinByLimit = Math.floor(subtotal * MAX_COIN_PERCENT / 100);
  const maxCoinSpend = Math.min(user.balance || 0, maxCoinByLimit);
  const coinSpend = useBalanceInOrder ? maxCoinSpend : 0;
  const afterCoin = subtotal - coinSpend;

  let discount = 0;
  if (useDiscountInOrder && appliedDiscount) {
    discount = Math.round(afterCoin * appliedDiscount.discount / 100);
  }
  const finalTotal = afterCoin - discount;

  const totalCashbackRate = cart.length
    ? cart.reduce((s, c) => s + (c.cashback || CONFIG.DEFAULT_CASHBACK) * c.price * (c.qty || 1), 0) / subtotal
    : CONFIG.DEFAULT_CASHBACK;
  const cashbackEarned = Math.round(finalTotal * totalCashbackRate / 100);

  const orderId = 'SWW-' + Date.now().toString(36).toUpperCase().slice(-6);

  const orderData = {
    id: orderId, userId: user.id, userShortId: user.shortId,
    userName: name, userPhone: phone, userUsername: contactUsername,
    userContact: contact, username: user.username, telegramId: user.telegramId,
    items: [...cart], subtotal, discount,
    discountCode: useDiscountInOrder ? (appliedDiscount?.code || null) : null,
    coinSpent: coinSpend, totalPrice: finalTotal, cashbackEarned,
    payment, comment, status: 'pending', date: Date.now()
  };

  try {
    await db.ref('orders/' + orderId).set(orderData);
    for (const item of cart) {
      const q = item.qty || 1;
      if (item.type === 'flavor') {
        const ref = db.ref(`assortment/${item.category}/${item.lineIndex}/flavors/${item.flavorIndex}/quantity`);
        await ref.transaction(cur => Math.max(0, (cur || 0) - q));
      } else {
        const ref = db.ref(`assortment/${item.category}/${item.index}/quantity`);
        await ref.transaction(cur => Math.max(0, (cur || 0) - q));
      }
    }
    if (coinSpend > 0) {
      const balRef = db.ref('users/' + user.id + '/balance');
      await balRef.transaction(cur => Math.max(0, (cur || 0) - coinSpend));
      await db.ref('users/' + user.id + '/balanceHistory').push({
        type: 'spend', amount: -coinSpend, orderId, date: Date.now()
      });
    }
    if (useDiscountInOrder && appliedDiscount?.code && !appliedDiscount.locked && promos[appliedDiscount.code]) {
      await db.ref('promos/' + appliedDiscount.code).update({
        used: true, usedBy: user.id, usedAt: Date.now(), orderId
      });
    }
    db.ref('users/' + user.id).update({ phone, contactUsername }).catch(() => {});

    let adminMsg = `🛒 НОВЫЙ ЗАКАЗ #${orderId}\n\n👤 ${name}\n📱 ${contact}\n💳 ${payment}\n🆔 ${user.shortId}\n\n📋 Товары:\n`;
    cart.forEach((it, i) => { adminMsg += `${i + 1}. ${it.name} × ${it.qty || 1} — ${it.price * (it.qty || 1)}₽\n`; });
    if (coinSpend > 0) adminMsg += `\n🪙 SWWCOIN: −${coinSpend}₽`;
    if (discount > 0) adminMsg += `\n💎 Купон: −${discount}₽`;
    adminMsg += `\n💰 К оплате: ${finalTotal}₽`;
    adminMsg += `\n🪙 Кешбек: +${cashbackEarned}`;
    if (comment) adminMsg += `\n\n💬 ${comment}`;

    if (BOT_TOKEN && !BOT_TOKEN.startsWith('__')) {
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: adminMsg })
      }).catch(() => {});
    }
    if (user.telegramId && BOT_TOKEN && !BOT_TOKEN.startsWith('__')) {
      let userMsg = `✅ Заказ #${orderId} принят!\n\n📋 Товары:\n`;
      cart.forEach((it, i) => { userMsg += `${i + 1}. ${it.name} × ${it.qty || 1} — ${it.price * (it.qty || 1)}₽\n`; });
      if (coinSpend > 0) userMsg += `\n🪙 SWWCOIN: −${coinSpend}₽`;
      if (discount > 0) userMsg += `\n💎 Купон: −${discount}₽`;
      userMsg += `\n💰 К оплате: ${finalTotal}₽`;
      userMsg += `\n🪙 Кешбек: +${cashbackEarned}\n\n⏳ Ожидает подтверждения`;
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.telegramId, text: userMsg })
      }).catch(() => {});
    }

    cart = [];
    saveCart();
    useBalanceInOrder = false;
    toast('✅ Заказ оформлен!', '🎉');
    setTimeout(() => navigate('profile'), 600);
  } catch (e) {
    console.error('ORDER ERROR:', e);
    toast('❌ Ошибка: ' + (e.message || 'попробуйте снова'), '❌');
  } finally {
    submittingOrder = false;
    const b2 = document.getElementById('submitOrderBtn');
    if (b2) { b2.disabled = false; b2.textContent = '✅ Оформить заказ'; }
  }
}

/* =========================================================
   ОТМЕНА ЗАКАЗА
   ========================================================= */
async function userCancelOrder(orderId) {
  const snap = await db.ref('orders/' + orderId).once('value');
  const order = snap.val();
  if (!order) { toast('❌ Заказ не найден', '❌'); return; }
  if (order.userId !== user.id) { toast('❌ Это не ваш заказ', '❌'); return; }
  if (order.status !== 'pending') { toast('❌ Нельзя отменить', '❌'); return; }
  if (!confirm('Отменить заказ #' + orderId + '?')) return;
  try {
    for (const it of (order.items || [])) {
      const q = it.qty || 1;
      if (it.type === 'flavor') {
        const ref = db.ref(`assortment/${it.category}/${it.lineIndex}/flavors/${it.flavorIndex}/quantity`);
        await ref.transaction(cur => (cur || 0) + q);
      } else {
        const ref = db.ref(`assortment/${it.category}/${it.index}/quantity`);
        await ref.transaction(cur => (cur || 0) + q);
      }
    }
    if (order.coinSpent > 0) {
      const balRef = db.ref('users/' + user.id + '/balance');
      await balRef.transaction(cur => (cur || 0) + order.coinSpent);
      await db.ref('users/' + user.id + '/balanceHistory').push({
        type: 'refund', amount: order.coinSpent, orderId, date: Date.now()
      });
    }
    await db.ref('orders/' + orderId).update({ status: 'cancelled', cancelledAt: Date.now(), cancelledBy: 'user' });
    toast('❌ Заказ отменён', '❌');
    renderMyOrders();
    if (currentPage === 'profile') renderProfile();
  } catch (e) { console.error(e); toast('❌ Ошибка', '❌'); }
}

/* =========================================================
   КЕЙСЫ
   ========================================================= */
const CASE_COUPON_ITEMS = [
  { label: '0%',  discount: 0,  rarity: 'common',    weight: 88 },
  { label: '5%',  discount: 5,  rarity: 'uncommon',  weight: 9 },
  { label: '10%', discount: 10, rarity: 'rare',      weight: 2.4 },
  { label: '15%', discount: 15, rarity: 'epic',      weight: 0.5 },
  { label: '30%', discount: 30, rarity: 'legendary', weight: 0.1 }
];
const CASE_COIN_ITEMS = [
  { label: '0',   amount: 0,   rarity: 'common',    weight: 88 },
  { label: '10',  amount: 10,  rarity: 'uncommon',  weight: 9 },
  { label: '30',  amount: 30,  rarity: 'rare',      weight: 2.4 },
  { label: '50',  amount: 50,  rarity: 'epic',      weight: 0.5 },
  { label: '100', amount: 100, rarity: 'legendary', weight: 0.1 }
];

function pickWeighted(items) {
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function formatCooldown(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  if (h > 0) return `${h}ч ${m}м ${s}с`;
  return `${m}м ${s}с`;
}

function renderCases() {
  document.getElementById('app').innerHTML = `
    <section class="hero" style="padding:16px 0;">
      <h1 style="font-size:24px;">🎁 <span class="grad">Кейсы</span></h1>
      <p>Открывай и получай бонусы</p>
    </section>
    <div class="cases-container">
      ${renderCaseCard('coupon')}
      ${renderCaseCard('coin')}
    </div>
  `;
  updateCaseTimers();
}

function renderCaseCard(type) {
  const isCoupon = type === 'coupon';
  const lastOpen = caseLastOpen[type];
  const cooldown = isCoupon ? CONFIG.CASES.COUPON_COOLDOWN_MS : CONFIG.CASES.COIN_COOLDOWN_MS;
  const canOpen = user.isAdmin || (Date.now() - lastOpen >= cooldown);
  const stripItems = isCoupon ? buildStrip(CASE_COUPON_ITEMS, '%') : buildStrip(CASE_COIN_ITEMS, '');
  return `
    <div class="case-card ${isCoupon ? '' : 'premium'}">
      <div class="case-head">
        <div class="case-icon">${isCoupon ? '🎫' : '🪙'}</div>
        <div class="case-info">
          <div class="case-name">${isCoupon ? 'Кейс со скидками' : 'Кейс с монетами'}</div>
          <div class="case-desc">${isCoupon ? 'Купоны на скидку' : 'Монеты SWWCOIN'}</div>
        </div>
      </div>
      <div class="case-strip-wrap">
        <div class="case-strip-pointer"></div>
        <div class="case-strip" id="strip-${type}">${stripItems}</div>
      </div>
      <button class="case-open-btn" id="btn-${type}" ${canOpen ? '' : 'disabled'} onclick="openCase('${type}')">
        ${canOpen ? (isCoupon ? '🎁 Открыть кейс' : '🪙 Открыть кейс') : '⏳ Ждите'}
      </button>
      <div class="case-timer" id="timer-${type}"></div>
      <div class="case-result" id="result-${type}"></div>
    </div>
  `;
}

function buildStrip(items, suffix) {
  let html = '';
  for (let i = 0; i < 60; i++) {
    const idx = pickWeighted(items);
    const it = items[idx];
    const label = suffix ? `${it.label} ${suffix}` : it.label;
    const icon = suffix === '%' ? (it.discount === 0 ? '❌' : it.discount >= 30 ? '💎' : it.discount >= 15 ? '⭐' : '🎫') : '🪙';
    html += `<div class="case-item rarity-${it.rarity}">
      <div class="case-item-icon">${icon}</div>
      <div class="case-item-label">${label}</div>
    </div>`;
  }
  return html;
}

function updateCaseTimers() {
  ['coupon', 'coin'].forEach(type => {
    const timerEl = document.getElementById(`timer-${type}`);
    const btnEl = document.getElementById(`btn-${type}`);
    if (!timerEl || !btnEl) return;
    if (user.isAdmin) {
      timerEl.innerHTML = '<span style="color:#06ffa5;">✅ Безлимит</span>';
      btnEl.disabled = false;
      btnEl.textContent = type === 'coupon' ? '🎁 Открыть кейс' : '🪙 Открыть кейс';
      return;
    }
    const cooldown = type === 'coupon' ? CONFIG.CASES.COUPON_COOLDOWN_MS : CONFIG.CASES.COIN_COOLDOWN_MS;
    const left = cooldown - (Date.now() - caseLastOpen[type]);
    if (left <= 0) {
      timerEl.innerHTML = '<span style="color:#06ffa5;">✅ Можно открыть!</span>';
      btnEl.disabled = false;
      btnEl.textContent = type === 'coupon' ? '🎁 Открыть кейс' : '🪙 Открыть кейс';
    } else {
      timerEl.innerHTML = `⏳ Через: <span style="color:#ffb020;font-weight:700;">${formatCooldown(left)}</span>`;
      btnEl.disabled = true;
      btnEl.textContent = '⏳ Ждите';
    }
  });
}

setInterval(() => { if (currentPage === 'cases') updateCaseTimers(); }, 1000);

async function openCase(type) {
  if (caseOpening[type]) return;
  const isCoupon = type === 'coupon';
  const cooldown = isCoupon ? CONFIG.CASES.COUPON_COOLDOWN_MS : CONFIG.CASES.COIN_COOLDOWN_MS;
  if (!user.isAdmin && Date.now() - caseLastOpen[type] < cooldown) { updateCaseTimers(); return; }
  caseOpening[type] = true;
  const btn = document.getElementById(`btn-${type}`);
  if (btn) { btn.disabled = true; btn.textContent = '🎁 Открываем...'; }
  const items = isCoupon ? CASE_COUPON_ITEMS : CASE_COIN_ITEMS;
  const winnerIndex = pickWeighted(items);
  const winner = items[winnerIndex];
  const strip = document.getElementById(`strip-${type}`);
  if (!strip) { caseOpening[type] = false; return; }
  const allItems = strip.querySelectorAll('.case-item');
  const itemWidth = 110;
  const wrapWidth = strip.parentElement.clientWidth;
  const centerOffset = wrapWidth / 2 - itemWidth / 2;
  let targetPos = -1;
  for (let i = allItems.length - 1; i >= 20; i--) {
    const el = allItems[i];
    const label = el.querySelector('.case-item-label').textContent.trim();
    const expectedLabel = isCoupon ? `${winner.label} %` : winner.label;
    if (label === expectedLabel) { targetPos = i; break; }
  }
  if (targetPos === -1) targetPos = 30;
  const targetX = -(targetPos * itemWidth - centerOffset);
  strip.style.transition = 'none';
  strip.style.transform = 'translateX(0)';
  void strip.offsetWidth;
  strip.style.transition = 'transform 5s cubic-bezier(0.15, 0.85, 0.25, 1)';
  strip.style.transform = `translateX(${targetX}px)`;
  if (!user.isAdmin) {
    caseLastOpen[type] = Date.now();
    localStorage.setItem(`sww_case_${type}_last`, String(caseLastOpen[type]));
  }
  setTimeout(async () => {
    caseOpening[type] = false;
    const resultEl = document.getElementById(`result-${type}`);
    const btnEl = document.getElementById(`btn-${type}`);
    if (btnEl) { btnEl.disabled = false; updateCaseTimers(); }
    if (isCoupon) {
      if (winner.discount > 0) {
        const code = 'CASE-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        await db.ref('promos/' + code).set({
          discount: winner.discount, used: false, created: Date.now(),
          type: 'case', userId: user.id, userName: user.firstName, uses: 0, maxUses: 1
        });
        if (resultEl) resultEl.innerHTML = `
          <div style="color:var(--warning);font-size:14px;">🎉 Ваш купон</div>
          <div style="font-size:26px;font-weight:900;color:var(--warning);margin:8px 0;">${winner.discount}% скидка</div>
          <div style="font-size:12px;color:var(--text-dim);">Код: <b style="color:var(--accent);font-family:monospace;">${code}</b></div>
        `;
      } else {
        if (resultEl) resultEl.innerHTML = `<div style="color:#ff6b6b;font-size:15px;">😔 Пусто</div>`;
      }
    } else {
      if (winner.amount > 0) {
        const balRef = db.ref('users/' + user.id + '/balance');
        await balRef.transaction(cur => (cur || 0) + winner.amount);
        await db.ref('users/' + user.id + '/balanceHistory').push({
          type: 'case', amount: winner.amount, date: Date.now()
        });
        if (resultEl) resultEl.innerHTML = `
          <div style="color:var(--gold);font-size:14px;">🎉 Вы выиграли</div>
          <div style="font-size:26px;font-weight:900;color:var(--gold);margin:8px 0;">+${winner.amount} SWWCOIN</div>
        `;
      } else {
        if (resultEl) resultEl.innerHTML = `<div style="color:#ff6b6b;font-size:15px;">😔 Пусто</div>`;
      }
    }
  }, 5200);
}

/* =========================================================
   ПРОФИЛЬ
   ========================================================= */
function renderProfile() {
  const stats = getUserStats();
  const activeOrders = userOrders.filter(o => o.status === 'pending').length;
  const avatar = user.photoUrl
    ? `<img src="${user.photoUrl}" onerror="this.style.display='none';this.parentElement.textContent='${(user.firstName || '?')[0].toUpperCase()}'"/>`
    : (user.firstName || '?')[0].toUpperCase();

  document.getElementById('app').innerHTML = `
    <div class="profile-header">
      <div class="profile-user">
        <div class="profile-avatar">${avatar}</div>
        <div class="profile-info">
          <h2>${user.firstName}${user.username ? ' · @' + user.username : ''}</h2>
          <div class="profile-id" onclick="copyText('${user.shortId}')">🆔 ${user.shortId}</div>
          <div class="profile-role ${user.isAdmin ? 'admin' : ''}">
            ${user.isAdmin ? '👑 АДМИНИСТРАТОР' : '🛍 ПОКУПАТЕЛЬ'}
          </div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-val">${stats.totalOrders}</div><div class="stat-label">Заказов</div></div>
        <div class="stat-card"><div class="stat-val">${stats.totalSum.toLocaleString('ru-RU')} ₽</div><div class="stat-label">На сумму</div></div>
        <div class="stat-card"><div class="stat-val">${stats.maxOrder.toLocaleString('ru-RU')} ₽</div><div class="stat-label">Макс.</div></div>
      </div>
    </div>

    <div class="balance-card">
      <div class="left">
        <div class="coin-big">₴</div>
        <div>
          <div class="val">${(user.balance || 0).toLocaleString('ru-RU')}</div>
          <div class="lbl">SWWCOIN · 1 = 1 ₽</div>
        </div>
      </div>
      <button class="btn btn-gold btn-sm" onclick="navigate('cases')">Кейсы</button>
    </div>

    <section class="section">
      <div class="section-title">📞 Контакты для заказов</div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:8px;cursor:pointer;" onclick="openContactEditor()">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:12px;background:var(--bg-2);display:flex;align-items:center;justify-content:center;color:var(--accent);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;">Телефон</div>
            <div style="font-size:12px;color:var(--text-dim);">${user.phone || 'Не указан'}</div>
          </div>
        </div>
        <span style="font-size:12px;color:var(--accent);font-weight:600;">${user.phone ? 'Изм.' : '+'}</span>
      </div>
    </section>

    ${appliedDiscount ? `
      <div class="promo-welcomed">
        <span class="icon">${appliedDiscount.locked ? '🎉' : '💎'}</span>
        <div class="info">
          <div class="title">Скидка ${appliedDiscount.discount}%${appliedDiscount.locked ? ' (новичок)' : ''}</div>
          <div class="text">Применится в заказе</div>
        </div>
      </div>
    ` : ''}

    <section class="section">
      <div class="section-title">🤝 Реферальная программа</div>
      <div class="referral-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="font-size:26px;">🎁</span>
          <div>
            <div style="font-size:15px;font-weight:700;">Приглашай друзей</div>
            <div style="font-size:12px;color:var(--text-dim);">
              +${CONFIG.REFERRAL.REFERRER_REWARD}% за каждые ${CONFIG.REFERRAL.MIN_REFERRAL_SUM}₽ (мин. ${CONFIG.REFERRAL.MIN_REFERRAL_ORDERS} заказа)
            </div>
          </div>
        </div>
        <div class="referral-link">${getReferralLink() || 'Недоступно'}</div>
        <button class="btn btn-primary btn-block" onclick="copyReferralLink()">📋 Скопировать</button>
        <button class="btn btn-ghost btn-block" style="margin-top:8px;" onclick="shareReferral()">📤 Поделиться</button>
        <div id="referralStats" style="margin-top:10px;"></div>
      </div>
    </section>

    <div class="menu-list">
      <button class="menu-item" onclick="openOverlay('ordersOverlay');renderMyOrders()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></div>
        <div class="menu-text"><div class="title">Мои заказы</div><div class="sub">${stats.totalOrders}${activeOrders > 0 ? ` · ${activeOrders} в обработке` : ''}</div></div>
        <span class="menu-arrow">›</span>
      </button>

      <button class="menu-item" onclick="openOverlay('promosOverlay');renderMyPromos()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="M2 12h20M12 2v20"/></svg></div>
        <div class="menu-text"><div class="title">Мои скидки</div><div class="sub">${appliedDiscount ? `${appliedDiscount.discount}%` : 'Нет'}</div></div>
        <span class="menu-arrow">›</span>
      </button>

      <button class="menu-item" onclick="openCart()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
        <div class="menu-text"><div class="title">Корзина</div><div class="sub">${cart.reduce((s, c) => s + (c.qty || 1), 0)}</div></div>
        ${cart.length ? `<span class="menu-badge">${cart.reduce((s, c) => s + (c.qty || 1), 0)}</span>` : ''}
        <span class="menu-arrow">›</span>
      </button>

      <button class="menu-item" onclick="openSupport()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <div class="menu-text"><div class="title">Поддержка</div><div class="sub">${CONFIG.SUPPORT_USERNAME}</div></div>
        <span class="menu-arrow">›</span>
      </button>

      <button class="menu-item" onclick="toggleTheme()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></div>
        <div class="menu-text"><div class="title">Тема</div><div class="sub">Светлая / Тёмная</div></div>
        <span class="menu-arrow">›</span>
      </button>

      ${user.isAdmin ? `
        <button class="menu-item admin-only" onclick="openOverlay('adminOverlay');renderAdmin()">
          <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M2 12l3-3 3 3-3 3zM19 12l3-3-3-3-3 3zM12 2l3 3-3 3-3-3zM12 22l3-3-3-3-3 3z"/></svg></div>
          <div class="menu-text"><div class="title">Админ-панель</div><div class="sub">Управление</div></div>
          <span class="menu-arrow">›</span>
        </button>
      ` : (window.Telegram?.WebApp?.initDataUnsafe?.user?.id === ADMIN_TELEGRAM_ID ? `
        <button class="menu-item" onclick="tryLoginAsAdmin()">
          <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <div class="menu-text"><div class="title">Войти как админ</div><div class="sub">Только для владельца</div></div>
          <span class="menu-arrow">›</span>
        </button>
      ` : '')}
    </div>
    <p style="text-align:center;font-size:11px;color:var(--text-dim);margin-top:24px;">SWWSHOP © ${new Date().getFullYear()}</p>
  `;

  getUserReferralStats().then(st => {
    const el = document.getElementById('referralStats');
    if (!el) return;
    el.innerHTML = `
      <div class="ref-stats-grid">
        <div class="ref-stat"><div class="val" style="color:var(--accent);">${st.totalReferrals}</div><div class="lbl">Приглашено</div></div>
        <div class="ref-stat"><div class="val" style="color:var(--warning);">${st.activeReferrals}</div><div class="lbl">Активных</div></div>
        <div class="ref-stat"><div class="val" style="color:var(--success);">${st.totalSum.toLocaleString('ru-RU')} ₽</div><div class="lbl">Оборот</div></div>
      </div>
    `;
  }).catch(() => {});
}

function tryLoginAsAdmin() {
  const tgU = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!(tgU && tgU.id === ADMIN_TELEGRAM_ID)) { toast('❌ Только для владельца', '❌'); return; }
  if (!confirm('Войти в админ-режим?')) return;
  localStorage.removeItem('sww_admin_logged_out');
  localStorage.setItem('sww_admin', 'true');
  location.reload();
}

/* =========================================================
   МОИ ЗАКАЗЫ
   ========================================================= */
function renderMyOrders() {
  const el = document.getElementById('ordersContent');
  if (!userOrders.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📦</div><h3>Заказов пока нет</h3></div>';
    return;
  }
  const sorted = [...userOrders].sort((a, b) => (b.date || 0) - (a.date || 0));
  el.innerHTML = sorted.map(o => {
    const statusMap = {
      pending: { cls: 'status-pending', txt: '⏳ Ожидает' },
      completed: { cls: 'status-completed', txt: '✅ Выполнен' },
      cancelled: { cls: 'status-cancelled', txt: '❌ Отменён' }
    };
    const st = statusMap[o.status] || statusMap.pending;
    return `
      <div class="order-card" onclick="openMyOrderDetail('${o.id}')">
        <div class="order-head">
          <div>
            <div class="order-id">#${o.id}</div>
            <div class="order-date">${new Date(o.date).toLocaleString('ru-RU')}</div>
          </div>
          <span class="order-status ${st.cls}">${st.txt}</span>
        </div>
        <div class="order-items">
          ${(o.items || []).slice(0, 3).map(it => `• ${it.name} × ${it.qty || 1}`).join('<br>')}
          ${(o.items || []).length > 3 ? `<br>... ещё ${o.items.length - 3}` : ''}
        </div>
        <div class="order-total">${o.totalPrice || o.total || 0} ₽</div>
        ${o.status === 'pending' ? `
          <button class="btn btn-danger btn-sm" style="margin-top:10px;width:100%;" onclick="event.stopPropagation();userCancelOrder('${o.id}')">❌ Отменить заказ</button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function openMyOrderDetail(orderId) {
  const order = userOrders.find(o => o.id === orderId);
  if (!order) return;
  showOrderDetail(order, false);
}

function showOrderDetail(order, isAdminView) {
  const statusMap = {
    pending: { cls: 'status-pending', txt: '⏳ Ожидает' },
    completed: { cls: 'status-completed', txt: '✅ Выполнен' },
    cancelled: { cls: 'status-cancelled', txt: '❌ Отменён' }
  };
  const st = statusMap[order.status] || statusMap.pending;
  const totalPrice = order.totalPrice || order.total || 0;

  document.getElementById('orderDetailTitle').textContent = `📦 Заказ #${order.id}`;
  document.getElementById('orderDetailContent').innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <span class="order-status ${st.cls}" style="font-size:13px;padding:6px 16px;">${st.txt}</span>
    </div>
    <div class="order-detail-row"><span class="lbl">Дата:</span><span class="val">${new Date(order.date).toLocaleString('ru-RU')}</span></div>
    <div class="order-detail-row"><span class="lbl">Клиент:</span><span class="val">${order.userName || '—'}</span></div>
    <div class="order-detail-row"><span class="lbl">ID:</span><span class="val" style="font-family:monospace;">${order.userShortId || '—'}</span></div>
    <div class="order-detail-row"><span class="lbl">Телефон:</span><span class="val">${order.userPhone || '—'}</span></div>
    <div class="order-detail-row"><span class="lbl">Username:</span><span class="val">${order.userUsername || '—'}</span></div>
    <div class="order-detail-row"><span class="lbl">Оплата:</span><span class="val">${order.payment || '—'}</span></div>
    ${order.comment ? `<div class="order-detail-row"><span class="lbl">Комментарий:</span><span class="val">${order.comment}</span></div>` : ''}
    <div style="margin-top:16px;">
      <div class="section-title" style="font-size:14px;">📋 Товары</div>
      ${(order.items || []).map(it => `<div class="order-detail-row"><span class="lbl">${it.name}</span><span class="val">× ${it.qty || 1} = ${it.price * (it.qty || 1)} ₽</span></div>`).join('')}
    </div>
    <div style="margin-top:16px;background:var(--bg-2);border-radius:14px;padding:14px;border:1px solid var(--border);">
      <div class="order-detail-row"><span class="lbl">Подытог:</span><span class="val">${order.subtotal} ₽</span></div>
      ${order.coinSpent > 0 ? `<div class="order-detail-row"><span class="lbl">🪙 SWWCOIN:</span><span class="val" style="color:var(--gold);">−${order.coinSpent}</span></div>` : ''}
      ${order.discount > 0 ? `<div class="order-detail-row"><span class="lbl">Купон:</span><span class="val" style="color:var(--warning);">−${order.discount} ₽</span></div>` : ''}
      <div class="order-detail-row" style="border-top:2px solid var(--border);padding-top:12px;margin-top:8px;">
        <span class="lbl" style="font-weight:800;">Итого:</span>
        <span class="val" style="font-size:17px;color:var(--accent);">${totalPrice} ₽</span>
      </div>
    </div>
    ${isAdminView && order.status === 'pending' ? `
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-success btn-block" onclick="adminCompleteOrder('${order.id}')">✅ Выполнить</button>
        <button class="btn btn-danger btn-block" onclick="adminCancelOrder('${order.id}')">❌ Отменить</button>
      </div>
    ` : ''}
  `;
  openOverlay('orderDetailOverlay');
}

function renderMyPromos() {
  const el = document.getElementById('promosContent');
  const uid = getUserId();
  const mine = Object.entries(promos).filter(([_, p]) => p.userId === uid);
  if (!mine.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🎫</div><h3>Скидок пока нет</h3></div>';
    return;
  }
  el.innerHTML = mine.map(([code, p]) => `
    <div class="order-card" style="cursor:default;">
      <div class="order-head">
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--warning);">${p.discount}% скидка</div>
          <div style="font-size:11px;font-family:monospace;color:var(--accent);margin-top:4px;">${code}</div>
        </div>
        <span class="order-status ${p.used ? 'status-cancelled' : 'status-completed'}">${p.used ? 'Использована' : 'Активна'}</span>
      </div>
    </div>
  `).join('');
}

function openContactEditor() {
  document.getElementById('contactEditorContent').innerHTML = `
    <div class="field"><label>Номер телефона</label><input type="tel" id="editPhone" value="${user.phone || ''}" /></div>
    <div class="field"><label>Username в Telegram</label><input type="text" id="editContactUsername" value="${user.contactUsername || ''}" /></div>
    <button class="btn btn-primary btn-block" onclick="saveContacts()">💾 Сохранить</button>
  `;
  openOverlay('contactEditorOverlay');
}

async function saveContacts() {
  const phone = document.getElementById('editPhone').value.trim();
  const contactUsername = document.getElementById('editContactUsername').value.trim();
  user.phone = phone;
  user.contactUsername = contactUsername;
  await db.ref('users/' + user.id).update({ phone, contactUsername });
  toast('✅ Сохранено', '✅');
  closeOverlay('contactEditorOverlay');
  renderProfile();
}

function copyReferralLink() {
  const l = getReferralLink();
  if (!l) return;
  navigator.clipboard.writeText(l).then(() => toast('📋 Скопировано!', '📋'));
}

function shareReferral() {
  const l = getReferralLink();
  if (!l) return;
  const text = `🎁 Заходи в SWWSHOP! Скидка ${CONFIG.REFERRAL.NEW_USER_DISCOUNT}% на первый заказ:\n${l}`;
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(text)}`);
  else window.open(`https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(text)}`, '_blank');
}

/* =========================================================
   PDF ВЫПИСКИ — ТОЛЬКО СКАЧИВАНИЕ
   ========================================================= */
function filterOrdersByPeriod(period) {
  const now = new Date();
  if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return orders.filter(o => {
      const isCompleted = o.status === 'completed';
      const date = o.completedAt || o.date || 0;
      return isCompleted && date >= monthStart;
    });
  }
  return orders.filter(o => o.status === 'completed');
}

async function downloadPDFStatement(period) {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast('❌ PDF-библиотека не загружена', '❌');
      return;
    }
    
    toast('⏳ Формирую PDF...', '📄');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const filtered = filterOrdersByPeriod(period);
    const now = new Date();
    
    const title = period === 'month'
      ? `Отчёт за ${now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`
      : 'Отчёт за всё время';
    
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text('SWWSHOP — ' + title, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('Сформировано: ' + new Date().toLocaleString('ru-RU'), 14, 22);
    
    const totalRevenue = filtered.reduce((s, o) => s + (o.totalPrice || o.total || 0), 0);
    const totalItems = filtered.reduce((s, o) => s + (o.items || []).reduce((a, it) => a + (it.qty || 1), 0), 0);
    const totalDiscount = filtered.reduce((s, o) => s + (o.discount || 0), 0);
    const totalCoins = filtered.reduce((s, o) => s + (o.coinSpent || 0), 0);
    const totalCashback = filtered.reduce((s, o) => s + (o.cashbackEarned || 0), 0);
    
    const rows = filtered.map((o, i) => {
      const itemsText = (o.items || []).map(it => `${it.name} × ${it.qty || 1}`).join('; ');
      return [
        (i + 1).toString(),
        '#' + (o.id || ''),
        new Date(o.completedAt || o.date).toLocaleString('ru-RU', { 
          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
        }),
        o.userName || '—',
        o.userShortId || '—',
        (o.userPhone || o.userContact || '—').substring(0, 30),
        itemsText.substring(0, 80) + (itemsText.length > 80 ? '...' : ''),
        (o.subtotal || 0) + ' ₽',
        (o.discount || 0) > 0 ? '-' + o.discount + ' ₽' : '—',
        (o.coinSpent || 0) > 0 ? '-' + o.coinSpent + ' ₽' : '—',
        (o.totalPrice || o.total || 0) + ' ₽',
        (o.cashbackEarned || 0) > 0 ? '+' + o.cashbackEarned : '—'
      ];
    });
    
    doc.autoTable({
      head: [[
        '№', 'Заказ', 'Дата', 'Клиент', 'Short ID', 'Контакт',
        'Товары', 'Подытог', 'Скидка', '🪙 Монеты', 'Итого', 'Кешбэк'
      ]],
      body: rows.length ? rows : [['—', '—', '—', '—', '—', '—', 'Нет заказов за период', '—', '—', '—', '—', '—']],
      startY: 28,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: {
        fillColor: [0, 212, 255], textColor: [255, 255, 255],
        fontStyle: 'bold', fontSize: 7
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 },
        3: { cellWidth: 25 },
        4: { cellWidth: 22 },
        5: { cellWidth: 28 },
        6: { cellWidth: 45 },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 16, halign: 'right' },
        9: { cellWidth: 18, halign: 'right' },
        10: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        11: { cellWidth: 16, halign: 'right' }
      }
    });
    
    const finalY = (doc.lastAutoTable?.finalY || 28) + 8;
    
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('ИТОГО:', 14, finalY);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Заказов: ${filtered.length}`, 14, finalY + 6);
    doc.text(`Товаров продано: ${totalItems} шт`, 14, finalY + 11);
    doc.text(`Общая сумма скидок: ${totalDiscount} ₽`, 14, finalY + 16);
    doc.text(`Списано монетами: ${totalCoins} 🪙`, 14, finalY + 21);
    doc.text(`Начислено кешбэка: ${totalCashback} 🪙`, 14, finalY + 26);
    
    doc.setFontSize(13);
    doc.setTextColor(6, 165, 90);
    doc.text(`ВЫРУЧКА: ${totalRevenue.toLocaleString('ru-RU')} ₽`, 14, finalY + 34);
    
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('SWWSHOP © ' + new Date().getFullYear(), 14, pageHeight - 5);
    
    const blob = doc.output('blob');
    const filename = period === 'month'
      ? `SWWSHOP_отчёт_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.pdf`
      : `SWWSHOP_отчёт_всё_время_${now.getFullYear()}.pdf`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    toast('✅ PDF сохранён: ' + filename, '📄');
  } catch (e) {
    console.error('PDF error:', e);
    toast('❌ Ошибка: ' + e.message, '❌');
  }
}

/* =========================================================
   АДМИН-ПАНЕЛЬ
   ========================================================= */
function renderAdmin() {
  const el = document.getElementById('adminContent');
  const all = orders.length ? orders : [];
  const revenue = all.filter(o => o.status === 'completed').reduce((s, o) => s + (o.totalPrice || o.total || 0), 0);
  const pending = all.filter(o => o.status === 'pending').length;
  const usersCount = BASE_USERS_COUNT + Object.keys(users).length;

  el.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><div class="val">${all.length}</div><div class="lbl">Заказов</div></div>
      <div class="admin-stat"><div class="val">${pending}</div><div class="lbl">Ожидают</div></div>
      <div class="admin-stat"><div class="val">${revenue.toLocaleString('ru-RU')} ₽</div><div class="lbl">Выручка</div></div>
      <div class="admin-stat"><div class="val">${usersCount}</div><div class="lbl">Юзеров</div></div>
    </div>

    <div class="section-title" style="margin-top:20px;">📊 Выписки в PDF</div>
    <div class="menu-list" style="margin-bottom:12px;">
      <button class="menu-item admin-only" onclick="downloadPDFStatement('month')">
        <div class="menu-icon" style="color:var(--accent);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
            <line x1="9" y1="19" x2="15" y2="19"/>
          </svg>
        </div>
        <div class="menu-text">
          <div class="title">📥 Скачать за месяц</div>
          <div class="sub">PDF-выписка за текущий месяц</div>
        </div>
        <span class="menu-arrow">›</span>
      </button>

      <button class="menu-item admin-only" onclick="downloadPDFStatement('all')">
        <div class="menu-icon" style="color:var(--success);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div class="menu-text">
          <div class="title">📥 Скачать за всё время</div>
          <div class="sub">PDF-выписка за весь период</div>
        </div>
        <span class="menu-arrow">›</span>
      </button>
    </div>

    <div class="menu-list">
      <button class="menu-item admin-only" onclick="openOverlay('allOrdersOverlay');renderAllOrders()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></div>
        <div class="menu-text"><div class="title">Все заказы</div><div class="sub">${all.length} · ${pending} ожидают</div></div>
        <span class="menu-arrow">›</span>
      </button>

      <button class="menu-item admin-only" onclick="openOverlay('usersOverlay');renderUsers()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div class="menu-text"><div class="title">Пользователи</div><div class="sub">${usersCount}</div></div>
        <span class="menu-arrow">›</span>
      </button>

      <button class="menu-item admin-only" onclick="openOverlay('consoleOverlay');renderConsole()">
        <div class="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <div class="menu-text"><div class="title">Консоль</div><div class="sub">Рассылка</div></div>
        <span class="menu-arrow">›</span>
      </button>
    </div>

    <div class="section-title" style="margin-top:20px;">🪙 Кешбек по умолчанию</div>
    <div class="field">
      <label>Кешбек для товаров, где не задан вручную (%)</label>
      <input type="number" id="globalCashback" value="${CONFIG.DEFAULT_CASHBACK}" min="0" max="100" />
    </div>
    <button class="admin-action-btn btn-gold" onclick="adminSaveGlobalCashback()">💾 Сохранить</button>

    <div class="section-title" style="margin-top:20px;">🪙 Лимит оплаты монетами</div>
    <div class="field">
      <label>Максимум % от заказа, который можно оплатить монетами</label>
      <input type="number" id="maxCoinPercent" value="${CONFIG.MAX_COIN_PERCENT}" min="0" max="100" />
    </div>
    <button class="admin-action-btn btn-gold" onclick="adminSaveMaxCoinPercent()">💾 Сохранить</button>

    <div class="section-title" style="margin-top:20px;">🆔 Изменить Short ID</div>
    <div class="field">
      <label>Пользователь</label>
      <select id="shortIdUserSelect">
        <option value="">-- Выберите --</option>
        ${Object.values(users).map(u => `<option value="${u.id}">${u.firstName || 'Без имени'} (${u.shortId || u.id})</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label>Новый Short ID</label>
      <input type="text" id="newShortIdValue" placeholder="SWW-XXXX-XXXX" />
    </div>
    <button class="admin-action-btn btn-purple" onclick="adminUpdateShortId()">🆔 Обновить</button>

    <div class="section-title" style="margin-top:20px;">🎁 Выдать скидку по ID</div>
    <div class="field">
      <label>Short ID</label>
      <input type="text" id="promoShortId" placeholder="SWW-XXXX-XXXX" />
    </div>
    <div class="field">
      <label>Скидка (%)</label>
      <input type="number" id="promoShortDiscount" value="10" />
    </div>
    <button class="admin-action-btn btn-green" onclick="adminGivePromoByShortId()">🎁 Выдать</button>

    <div class="section-title" style="margin-top:20px;">🪙 Выдать монеты</div>
    <div class="field">
      <label>Short ID</label>
      <input type="text" id="coinShortId" placeholder="SWW-XXXX-XXXX" />
    </div>
    <div class="field">
      <label>Сумма (+ / −)</label>
      <input type="number" id="coinAmount" placeholder="100" />
    </div>
    <button class="admin-action-btn btn-gold" onclick="adminGiveCoinsByShortId()">🪙 Выдать</button>

    <div class="section-title" style="margin-top:20px;">💰 Баланс (User ID)</div>
    <div class="field">
      <label>User ID</label>
      <input type="text" id="balanceUserId" placeholder="tg_123456789" />
    </div>
    <div class="field">
      <label>Сумма (+ / −)</label>
      <input type="number" id="balanceAmount" placeholder="100" />
    </div>
    <button class="admin-action-btn btn-gold" onclick="adminAdjustBalance()">💰 Изменить</button>

    <div class="section-title" style="margin-top:20px;">📋 Все скидки</div>
    <div id="allPromosList"></div>
    <button class="admin-action-btn btn-purple" onclick="renderAllPromosAdmin()">🔄 Обновить</button>

    <div class="section-title" style="margin-top:20px;">🎨 Тема</div>
    <button class="admin-action-btn btn-cyan" onclick="toggleWinter()">❄️ Зимняя тема</button>

    <div class="section-title" style="margin-top:20px;color:var(--danger);">Опасная зона</div>
    <button class="admin-action-btn btn-red" onclick="adminLogout()">🚪 Выйти из админки</button>
  `;
  renderAllPromosAdmin();
}

async function adminSaveGlobalCashback() {
  const val = parseInt(document.getElementById('globalCashback').value);
  if (isNaN(val) || val < 0 || val > 100) { toast('❌ 0-100', '❌'); return; }
  await db.ref('meta/settings/cashback').set(val);
  CONFIG.DEFAULT_CASHBACK = val;
  toast('✅ Кешбек: ' + val + '%', '🪙');
  renderAdmin();
}

async function adminSaveMaxCoinPercent() {
  const val = parseInt(document.getElementById('maxCoinPercent').value);
  if (isNaN(val) || val < 0 || val > 100) { toast('❌ 0-100', '❌'); return; }
  await db.ref('meta/settings/maxCoinPercent').set(val);
  CONFIG.MAX_COIN_PERCENT = val;
  toast('✅ Лимит монет: ' + val + '%', '🪙');
  renderAdmin();
}

async function adminUpdateShortId() {
  const uid = document.getElementById('shortIdUserSelect').value;
  const newId = document.getElementById('newShortIdValue').value.trim().toUpperCase();
  if (!uid || !newId) { toast('❌ Заполни поля', '❌'); return; }
  if (!/^[A-Z0-9\-]+$/.test(newId)) { toast('❌ Только A-Z, 0-9 и дефис', '❌'); return; }
  await db.ref('users/' + uid + '/shortId').set(newId);
  toast('🆔 ID обновлён: ' + newId, '🆔');
  document.getElementById('newShortIdValue').value = '';
}

async function adminGivePromoByShortId() {
  const shortId = document.getElementById('promoShortId').value.trim().toUpperCase();
  const discount = parseInt(document.getElementById('promoShortDiscount').value) || 10;
  if (!shortId) { toast('❌ Введите ID', '❌'); return; }
  const found = Object.values(users).find(u => u.shortId === shortId);
  if (!found) { toast('❌ Не найден', '❌'); return; }
  const code = 'GIFT-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  await db.ref('promos/' + code).set({
    discount, used: false, created: Date.now(),
    type: 'gift', userId: found.id, userName: found.firstName, uses: 0, maxUses: 1
  });
  toast(`🎁 ${discount}% → ${found.firstName}`, '🎁');
  document.getElementById('promoShortId').value = '';
}

async function adminGiveCoinsByShortId() {
  const shortId = document.getElementById('coinShortId').value.trim().toUpperCase();
  const amount = parseInt(document.getElementById('coinAmount').value);
  if (!shortId || isNaN(amount)) { toast('❌ Заполни поля', '❌'); return; }
  const found = Object.values(users).find(u => u.shortId === shortId);
  if (!found) { toast('❌ Не найден', '❌'); return; }
  const ref = db.ref('users/' + found.id + '/balance');
  await ref.transaction(cur => Math.max(0, (cur || 0) + amount));
  await db.ref('users/' + found.id + '/balanceHistory').push({
    type: 'admin_adjust', amount, date: Date.now(), by: user.id
  });
  toast(`🪙 ${amount > 0 ? '+' : ''}${amount}`, '🪙');
  document.getElementById('coinShortId').value = '';
  document.getElementById('coinAmount').value = '';
}

async function adminAdjustBalance() {
  const uid = document.getElementById('balanceUserId').value.trim();
  const amount = parseInt(document.getElementById('balanceAmount').value);
  if (!uid || isNaN(amount)) { toast('❌ Заполни поля', '❌'); return; }
  const ref = db.ref('users/' + uid + '/balance');
  await ref.transaction(cur => Math.max(0, (cur || 0) + amount));
  await db.ref('users/' + uid + '/balanceHistory').push({
    type: 'admin_adjust', amount, date: Date.now(), by: user.id
  });
  toast(`💰 ${amount > 0 ? '+' : ''}${amount}`, '💰');
  document.getElementById('balanceUserId').value = '';
  document.getElementById('balanceAmount').value = '';
}

function renderAllOrders() {
  const el = document.getElementById('allOrdersContent');
  if (!orders.length) { el.innerHTML = '<div class="empty-state"><div class="icon">📦</div><h3>Заказов нет</h3></div>'; return; }
  const sorted = [...orders].sort((a, b) => (b.date || 0) - (a.date || 0));
  el.innerHTML = sorted.map(o => {
    const s = { pending: {c:'status-pending',t:'⏳'}, completed: {c:'status-completed',t:'✅'}, cancelled: {c:'status-cancelled',t:'❌'} }[o.status] || {c:'status-pending',t:'⏳'};
    const totalPrice = o.totalPrice || o.total || 0;
    return `
      <div class="order-card" data-order-id="${o.id}">
        <div class="order-head">
          <div>
            <div class="order-id">#${o.id}</div>
            <div class="order-date">${new Date(o.date).toLocaleString('ru-RU')}</div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">👤 ${o.userName} · ${o.userShortId || ''}</div>
          </div>
          <span class="order-status ${s.c}">${s.t}</span>
        </div>
        <div class="order-total">${totalPrice} ₽</div>
      </div>
    `;
  }).join('');
  el.querySelectorAll('.order-card').forEach(card => {
    card.onclick = () => {
      const oid = card.dataset.orderId;
      const order = orders.find(x => x.id === oid);
      if (order) showOrderDetail(order, true);
    };
  });
}

async function adminCompleteOrder(orderId) {
  if (!user.isAdmin) return;
  if (!confirm('Подтвердить заказ #' + orderId + '?')) return;
  const snap = await db.ref('orders/' + orderId).once('value');
  const order = snap.val();
  if (!order) { toast('❌ Не найден', '❌'); return; }
  await db.ref('orders/' + orderId).update({ status: 'completed', completedAt: Date.now() });
  const cb = order.cashbackEarned || Math.round((order.totalPrice || 0) * CONFIG.DEFAULT_CASHBACK / 100);
  if (cb > 0 && order.userId) {
    const ref = db.ref('users/' + order.userId + '/balance');
    await ref.transaction(cur => (cur || 0) + cb);
    await db.ref('users/' + order.userId + '/balanceHistory').push({
      type: 'cashback', amount: cb, orderId, date: Date.now()
    });
  }
  if (order.userId) {
    const us = await db.ref('users/' + order.userId + '/referredBy').once('value');
    if (us.val()) await checkReferralRewards(us.val());
  }
  toast(`✅ Выполнен · +${cb} SWWCOIN`, '✅');
  closeOverlay('orderDetailOverlay');
  renderAllOrders();
  if (order.telegramId && BOT_TOKEN && !BOT_TOKEN.startsWith('__')) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: order.telegramId, text: `✅ Заказ #${orderId} выполнен!\n🪙 +${cb} SWWCOIN` })
    }).catch(() => {});
  }
}

async function adminCancelOrder(orderId) {
  if (!user.isAdmin) return;
  if (!confirm('Отменить заказ #' + orderId + '?')) return;
  const snap = await db.ref('orders/' + orderId).once('value');
  const order = snap.val();
  if (!order) return;
  for (const it of (order.items || [])) {
    const q = it.qty || 1;
    if (it.type === 'flavor') {
      const ref = db.ref(`assortment/${it.category}/${it.lineIndex}/flavors/${it.flavorIndex}/quantity`);
      await ref.transaction(cur => (cur || 0) + q);
    } else {
      const ref = db.ref(`assortment/${it.category}/${it.index}/quantity`);
      await ref.transaction(cur => (cur || 0) + q);
    }
  }
  if (order.coinSpent > 0 && order.userId) {
    const ref = db.ref('users/' + order.userId + '/balance');
    await ref.transaction(cur => (cur || 0) + order.coinSpent);
    await db.ref('users/' + order.userId + '/balanceHistory').push({
      type: 'refund', amount: order.coinSpent, orderId, date: Date.now()
    });
  }
  await db.ref('orders/' + orderId).update({ status: 'cancelled', cancelledAt: Date.now() });
  toast('❌ Отменён', '❌');
  closeOverlay('orderDetailOverlay');
  renderAllOrders();
}

function renderUsers() {
  const el = document.getElementById('usersContent');
  const list = Object.values(users);
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="icon">👥</div><h3>Нет пользователей</h3></div>'; return; }
  el.innerHTML = list.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)).map(u => `
    <div class="order-card" style="cursor:pointer;" onclick="openUserEditor('${u.id}')">
      <div style="font-weight:700;font-size:14px;">${u.firstName || 'Юзер'} ${u.isAdmin ? '👑' : ''}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${u.username ? '@' + u.username : ''} · ${u.shortId || u.id}</div>
      <div style="font-size:11px;color:var(--gold);margin-top:4px;">🪙 ${u.balance || 0} SWWCOIN</div>
    </div>
  `).join('');
}

function openUserEditor(uid) {
  const u = users[uid];
  if (!u) return;
  document.getElementById('editUserContent').innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:16px;font-weight:700;">${u.firstName || 'Юзер'} ${u.username ? '@' + u.username : ''}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:4px;font-family:monospace;">${uid}</div>
    </div>
    <div class="field"><label>Short ID</label><input type="text" id="euShortId" value="${u.shortId || ''}" /></div>
    <div class="field"><label>Баланс SWWCOIN</label><input type="number" id="euBalance" value="${u.balance || 0}" /></div>
    <button class="btn btn-primary btn-block" onclick="saveUserEditor('${uid}')">💾 Сохранить</button>
    <button class="btn btn-gold btn-block" style="margin-top:8px;" onclick="quickGivePromo('${uid}')">🎁 Выдать скидку 10%</button>
    <button class="btn btn-warning btn-block" style="margin-top:8px;" onclick="quickGiveCoins('${uid}', 100)">🪙 Выдать 100 монет</button>
  `;
  openOverlay('editUserOverlay');
}

async function saveUserEditor(uid) {
  const newShortId = document.getElementById('euShortId').value.trim().toUpperCase();
  const newBalance = parseInt(document.getElementById('euBalance').value) || 0;
  if (!newShortId || !/^[A-Z0-9\-]+$/.test(newShortId)) { toast('❌ Неверный ID', '❌'); return; }
  await db.ref('users/' + uid).update({ shortId: newShortId, balance: newBalance });
  toast('✅ Сохранено', '✅');
  closeOverlay('editUserOverlay');
  renderUsers();
}

async function quickGivePromo(uid) {
  const code = 'GIFT-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  await db.ref('promos/' + code).set({
    discount: 10, used: false, created: Date.now(),
    type: 'gift', userId: uid, uses: 0, maxUses: 1
  });
  toast('🎁 Скидка 10% выдана', '🎁');
  closeOverlay('editUserOverlay');
}

async function quickGiveCoins(uid, amount) {
  const ref = db.ref('users/' + uid + '/balance');
  await ref.transaction(cur => (cur || 0) + amount);
  await db.ref('users/' + uid + '/balanceHistory').push({
    type: 'admin_adjust', amount, date: Date.now(), by: user.id
  });
  toast(`🪙 +${amount}`, '🪙');
  closeOverlay('editUserOverlay');
}

function renderConsole() {
  document.getElementById('consoleContent').innerHTML = `
    <div class="field">
      <label>Кому</label>
      <select id="consoleUser" class="field">
        <option value="">-- Выберите --</option>
        ${Object.values(users).map(u => `<option value="${u.id}">${u.firstName} (${u.shortId || u.id})</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Сообщение</label><textarea id="consoleMsg" placeholder="Текст..."></textarea></div>
    <button class="admin-action-btn btn-purple" onclick="adminSendToUser()">📨 Отправить</button>
    <div class="section-title" style="margin-top:20px;">📢 Рассылка</div>
    <div class="field"><textarea id="broadcastMsg" placeholder="Текст для всех..."></textarea></div>
    <button class="admin-action-btn btn-orange" onclick="adminBroadcast()">📢 Отправить всем</button>
  `;
}

function adminSendToUser() {
  const uid = document.getElementById('consoleUser').value;
  const msg = document.getElementById('consoleMsg').value.trim();
  if (!uid || !msg) { toast('❌ Заполни', '❌'); return; }
  const u = users[uid];
  if (!u?.telegramId) { toast('❌ Нет Telegram', '❌'); return; }
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: u.telegramId, text: '📨 От админа:\n\n' + msg })
  }).catch(() => {});
  toast('✅ Отправлено', '📨');
  document.getElementById('consoleMsg').value = '';
}

function adminBroadcast() {
  const msg = document.getElementById('broadcastMsg').value.trim();
  if (!msg) return;
  if (!confirm('Отправить всем?')) return;
  let sent = 0;
  const promises = Object.values(users).filter(u => u.telegramId).map(u =>
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: u.telegramId, text: '📢 SWWSHOP:\n\n' + msg })
    }).then(() => sent++).catch(() => {})
  );
  Promise.all(promises).then(() => toast(`✅ ${sent} получателей`, '📢'));
  document.getElementById('broadcastMsg').value = '';
}

function renderAllPromosAdmin() {
  const el = document.getElementById('allPromosList');
  if (!el) return;
  const list = Object.entries(promos);
  if (!list.length) { el.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="icon">🎫</div><h3>Нет скидок</h3></div>'; return; }
  el.innerHTML = list.sort((a, b) => (b[1].created || 0) - (a[1].created || 0)).map(([code, p]) => {
    const owner = p.userId ? (users[p.userId]?.firstName || p.userId) : 'Для всех';
    return `
      <div class="order-card" style="padding:10px;cursor:default;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:var(--warning);font-size:13px;">${p.discount}% · ${code}</div>
            <div style="font-size:10px;color:var(--text-dim);">${owner} · ${p.used ? '❌' : '✅'}</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="adminDeletePromo('${code}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

async function adminDeletePromo(code) {
  if (!confirm(`Удалить ${code}?`)) return;
  await db.ref('promos/' + code).remove();
  toast('🗑️ Удалено', '🗑️');
  renderAllPromosAdmin();
}

function adminLogout() {
  if (!confirm('Выйти из админки?')) return;
  localStorage.setItem('sww_admin_logged_out', 'true');
  localStorage.removeItem('sww_admin');
  closeOverlay('adminOverlay');
  toast('👋 Выход', '👋');
  setTimeout(() => location.reload(), 500);
}

/* =========================================================
   СТАРТ
   ========================================================= */
window.addEventListener('load', async () => {
  const savedTheme = localStorage.getItem('sww_theme') || 'dark';
  if (savedTheme === 'light') document.body.classList.add('light');
  if (localStorage.getItem('sww_winter') === 'true') {
    document.body.classList.add('winter');
    createSnow();
  }
  try {
    const cbSnap = await db.ref('meta/settings/cashback').once('value');
    const cbVal = cbSnap.val();
    if (typeof cbVal === 'number') CONFIG.DEFAULT_CASHBACK = cbVal;
  } catch (_) {}
  try {
    const mcSnap = await db.ref('meta/settings/maxCoinPercent').once('value');
    const mcVal = mcSnap.val();
    if (typeof mcVal === 'number') CONFIG.MAX_COIN_PERCENT = mcVal;
  } catch (_) {}
  loadAssortment();
  loadPromos();
  loadUsers();
  await initUser();
  setTimeout(() => { if (window.__stopPreloader) window.__stopPreloader(); }, 5000);
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }
});
