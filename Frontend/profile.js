// profile.html
// NOTE: written without seeing js/common.js. The three helpers in the ADAPTER
// block below are the only places that touch SB (common.js). If your SB uses
// different names, change just those lines.

(function () {
  // ---------- ADAPTER (match these to common.js) ----------
  function getMe() {
    // Must return the logged-in user object, or null if nobody is logged in.
    return (SB.currentUser && SB.currentUser()) || (SB.me && SB.me()) || (SB.getUser && SB.getUser()) || null;
  }
  function saveMe(me) {
    // Must persist the changed user object.
    if (SB.saveUser) return SB.saveUser(me);
    if (SB.updateUser) return SB.updateUser(me);
    throw new Error('No save function found in common.js');
  }
  function flash(msg, kind) {
    if (SB.flash) return SB.flash(msg, kind);
    var box = document.getElementById('flash');
    box.innerHTML = '<p class="flash flash-' + (kind === 'error' ? 'err' : 'ok') + '"></p>';
    box.firstChild.textContent = msg;
  }
  // ---------------------------------------------------------

  function chips(el, list, cls) {
    el.innerHTML = '';
    if (!list || !list.length) {
      el.innerHTML = '<p class="muted">Nothing added yet.</p>';
      return;
    }
    list.forEach(function (s) {
      var name = typeof s === 'string' ? s : (s.skill || s.name || '');
      var level = typeof s === 'object' && s.level ? s.level : '';
      var span = document.createElement('span');
      span.className = 'chip ' + cls;
      span.textContent = name + (level ? ' (' + level + ')' : '');
      el.appendChild(span);
    });
  }

  SB.ready.then(function () {
    var me = getMe();
    if (!me) { window.location.href = 'login.html'; return; }

    var form = document.getElementById('form-profile');
    var err = form.querySelector('[data-error]');
    form.name.value = me.name || '';
    form.email.value = me.email || '';
    form.bio.value = me.bio || '';
    document.getElementById('profile-sub').textContent = 'Signed in as ' + (me.email || '');

    chips(document.getElementById('profile-offer'), me.offer || me.offers || me.teach, 'chip-teach');
    chips(document.getElementById('profile-want'), me.want || me.wants || me.learn, 'chip-learn');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      var name = form.name.value.trim();
      if (!name) { err.textContent = 'Please enter your name.'; err.hidden = false; return; }
      me.name = name;
      me.bio = form.bio.value.trim();
      try {
        saveMe(me);
        flash('Profile saved.', 'ok');
      } catch (ex) {
        err.textContent = 'Could not save: ' + ex.message;
        err.hidden = false;
      }
    });
  });
})();
