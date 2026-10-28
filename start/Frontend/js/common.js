/* common.js: loaded on every page.
   Holds the "database" (localStorage), helper functions and the pieces every page shares.
   Page-specific code lives in the other files inside the js folder. */
(() => {
  'use strict';

  const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  const MAX_SKILLS = 15;

  /* ------------------------------------------------------------ storage */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
  };

  const db = {
    users: () => store.get('sb_users', []),
    saveUsers: (u) => store.set('sb_users', u),
    requests: () => store.get('sb_requests', []),
    saveRequests: (r) => store.set('sb_requests', r),
    session: () => store.get('sb_session', null),
    setSession: (id) => (id ? store.set('sb_session', id) : localStorage.removeItem('sb_session')),
  };

  /* ------------------------------------------------------------ helpers */

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const key = (name) => name.toLowerCase();
  const firstName = (full) => String(full).split(' ')[0];
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  function normalizeSkill(name) {
    name = name.replace(/\s+/g, ' ').trim();
    if (name && name === name.toLowerCase()) name = name.charAt(0).toUpperCase() + name.slice(1);
    return name;
  }

  async function hashPassword(password, salt) {
    const text = salt + ':' + password;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; // fallback for very old browsers
    for (const ch of text) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
    return 'x' + h;
  }

  /* ------------------------------------------------- flash messages
     A flash survives a page change (sessionStorage), so "Welcome" can be
     shown on the dashboard after register.html redirects there. */

  const FLASH_KEY = 'sb_flash';

  function flash(type, msg) {
    let list = [];
    try { list = JSON.parse(sessionStorage.getItem(FLASH_KEY) || '[]'); } catch (_) {}
    list.push({ type, msg });
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(list));
  }

  function showFlashes() {
    const box = document.getElementById('flash');
    if (!box) return;
    let list = [];
    try { list = JSON.parse(sessionStorage.getItem(FLASH_KEY) || '[]'); } catch (_) {}
    sessionStorage.removeItem(FLASH_KEY);
    box.innerHTML = list.map((f) => `<div class="flash flash-${esc(f.type)}" role="status">${esc(f.msg)}</div>`).join('');
  }

  function showError(form, msg) {
    const box = form.querySelector('[data-error]');
    if (box) {
      box.textContent = msg;
      box.hidden = false;
    }
  }

  /* ------------------------------------------------------------- users */

  const currentUser = () => {
    const id = db.session();
    return id ? db.users().find((u) => u.id === id) || null : null;
  };

  const saveUser = (user) => db.saveUsers(db.users().map((u) => (u.id === user.id ? user : u)));

  /** For logged-in pages: send visitors to the login page. */
  function requireLogin() {
    const me = currentUser();
    if (!me) {
      flash('info', 'Log in to continue.');
      location.replace('login.html');
      return null;
    }
    return me;
  }

  /** For index/login/register: skip them if already logged in. */
  function redirectIfLoggedIn() {
    if (currentUser()) {
      location.replace('dashboard.html');
      return true;
    }
    return false;
  }

  /** Logout button + the "waiting requests" badge in the top bar. */
  function initNav(me) {
    const out = document.getElementById('logout');
    if (out) {
      out.addEventListener('click', () => {
        db.setSession(null);
        flash('ok', 'You are logged out.');
        location.href = 'login.html';
      });
    }
    const badge = document.getElementById('nav-count');
    if (badge && me) {
      const n = db.requests().filter((r) => r.receiverId === me.id && r.status === 'pending').length;
      badge.textContent = n;
      badge.setAttribute('aria-label', n + ' waiting');
      badge.hidden = n === 0;
    }
  }

  /* ------------------------------------------------------------ matching */

  function matchInfo(mine, theirs) {
    const myWant = mine.want.map((s) => key(s.name));
    const theirWant = theirs.want.map((s) => key(s.name));
    const theyTeachMe = theirs.offer.filter((s) => myWant.includes(key(s.name)));
    const iTeachThem = mine.offer.filter((s) => theirWant.includes(key(s.name)));
    return { theyTeachMe, iTeachThem, mutual: theyTeachMe.length > 0 && iTeachThem.length > 0 };
  }

  /* --------------------------------------------------------- html pieces */

  function chips(list, kind, highlight = []) {
    if (!list.length) return '<span class="muted">Nothing added yet</span>';
    return (
      '<ul class="chips">' +
      list
        .map((s) => {
          const hit = highlight.includes(key(s.name)) ? ' chip-hit' : '';
          const level = s.level && LEVELS[s.level] ? ` <small>${esc(LEVELS[s.level])}</small>` : '';
          return `<li class="chip chip-${kind}${hit}">${esc(s.name)}${level}</li>`;
        })
        .join('') +
      '</ul>'
    );
  }

  function editableChips(list, kind) {
    return (
      '<ul class="chips">' +
      list
        .map((s) => {
          const level = s.level && LEVELS[s.level] ? ` <small>${esc(LEVELS[s.level])}</small>` : '';
          return (
            `<li class="chip chip-${kind}">${esc(s.name)}${level}` +
            `<span class="chip-x"><button type="button" data-remove="${kind}" data-name="${esc(s.name)}" aria-label="Remove ${esc(s.name)}">&times;</button></span></li>`
          );
        })
        .join('') +
      '</ul>'
    );
  }

  /** The signature element: gold half = what you learn, teal half = what you teach. */
  function swapCard(learn, teach) {
    const side = (d, tone) =>
      `<div class="swap-side swap-${tone}"><span class="swap-title">${esc(d.title)}</span>` +
      d.skills.map((n) => `<span class="swap-skill">${esc(n)}</span>`).join('') +
      '</div>';
    return (
      '<div class="swap-card">' +
      side(learn, 'learn') +
      '<div class="swap-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg></div>' +
      side(teach, 'teach') +
      '</div>'
    );
  }

  /* ----------------------------------------------------------- demo data */

  async function seedDemo() {
    if (db.users().length) return;
    const people = [
      { name: 'Meera Iyer', email: 'meera@demo.com', bio: '2nd year design student. Free on weekends.', offer: [['Photoshop', 'intermediate'], ['Figma', 'beginner']], want: ['Python', 'Excel'] },
      { name: 'Rohan Mehta', email: 'rohan@demo.com', bio: 'BCA, 3rd year. Evenings are best for me.', offer: [['Python', 'advanced'], ['SQL', 'intermediate']], want: ['Guitar', 'Video editing'] },
      { name: 'Priya Singh', email: 'priya@demo.com', bio: 'Music and debate club. Happy to teach on campus.', offer: [['Guitar', 'intermediate'], ['Public speaking', 'advanced']], want: ['Photoshop', 'Python'] },
      { name: 'Kabir Khan', email: 'kabir@demo.com', bio: 'MBA first year. Weekday mornings are free.', offer: [['Video editing', 'advanced'], ['Excel', 'intermediate']], want: ['Public speaking', 'SQL'] },
    ];
    const users = [];
    for (const p of people) {
      users.push({
        id: uid(),
        name: p.name,
        email: p.email,
        hash: await hashPassword('demo1234', p.email),
        bio: p.bio,
        offer: p.offer.map(([name, level]) => ({ name, level })),
        want: p.want.map((name) => ({ name })),
        createdAt: new Date().toISOString(),
      });
    }
    db.saveUsers(users);
  }

  /* "Reset demo data" link in the footer of every page */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#reset-demo')) return;
    if (!confirm('This deletes every account and request saved in this browser and restores the demo students. Continue?')) return;
    ['sb_users', 'sb_requests', 'sb_session'].forEach((k) => localStorage.removeItem(k));
    seedDemo().then(() => {
      flash('ok', 'Demo data restored.');
      location.href = 'index.html';
    });
  });

  /* Every page script waits for SB.ready, so the demo students exist before it runs. */
  window.SB = {
    LEVELS, MAX_SKILLS, db, esc, uid, key, firstName, fmtDate, normalizeSkill, hashPassword,
    flash, showFlashes, showError, currentUser, saveUser, requireLogin, redirectIfLoggedIn, initNav,
    matchInfo, chips, editableChips, swapCard, ready: seedDemo(),
  };
})();
