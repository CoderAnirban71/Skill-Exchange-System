/* dashboard.html */
SB.ready.then(() => {
  const first = SB.requireLogin();
  if (!first) return;
  SB.initNav(first);

  const $ = (id) => document.getElementById(id);
  $('form-bio').elements.bio.value = first.bio;

  function render() {
    const me = SB.currentUser();
    const requests = SB.db.requests();
    const incoming = requests.filter((r) => r.receiverId === me.id && r.status === 'pending').length;
    const active = requests.filter((r) => (r.senderId === me.id || r.receiverId === me.id) && r.status === 'accepted').length;

    $('greeting').textContent = 'Hi, ' + SB.firstName(me.name);
    $('stats').innerHTML =
      `You have <strong>${me.offer.length}</strong> skills, and you want <strong>${me.want.length}</strong> skills. ` +
      `<a href="requests.html">${incoming} request${incoming === 1 ? '' : 's'} waiting</a>, ` +
      `${active} active swap${active === 1 ? '' : 's'}.`;

    // my two skill lists
    for (const type of ['offer', 'want']) {
      $('list-' + type).innerHTML = me[type].length ? SB.editableChips(me[type], type) : '';
      $('empty-' + type).hidden = me[type].length > 0;
    }

    // mutual matches: they teach what I want AND want what I teach
    const matches = SB.db
      .users()
      .filter((u) => u.id !== me.id)
      .map((u) => ({ user: u, m: SB.matchInfo(me, u) }))
      .filter((x) => x.m.mutual)
      .slice(0, 4);

    let html;
    if (!me.offer.length || !me.want.length) {
      html = '<p class="muted">Add at least one skill to each list and we will look for students who want what you teach and teach what you want.</p>';
    } else if (!matches.length) {
      html = '<p class="muted">No mutual matches yet. <a href="search.html">Browse all students</a> to find someone who teaches what you want.</p>';
    } else {
      html =
        '<div class="match-grid">' +
        matches
          .map(
            ({ user, m }) => `
        <article class="match">
          <h3>${SB.esc(user.name)}</h3>
          ${SB.swapCard(
            { title: 'You learn', skills: m.theyTeachMe.map((s) => s.name) },
            { title: 'You teach', skills: m.iTeachThem.map((s) => s.name) }
          )}
          <a class="btn btn-small" href="search.html?user=${encodeURIComponent(user.id)}">Request a swap with ${SB.esc(SB.firstName(user.name))}</a>
        </article>`
          )
          .join('') +
        '</div>';
    }
    $('matches').innerHTML = html;

    SB.initNav(me);
    SB.showFlashes();
  }

  function addSkill(type, form) {
    const me = SB.currentUser();
    const other = type === 'offer' ? 'want' : 'offer';
    const data = new FormData(form);
    const name = SB.normalizeSkill(String(data.get('skill')));
    const level = String(data.get('level') || '');

    if (name.length < 2 || name.length > 40) SB.flash('err', 'Skill names need 2 to 40 characters.');
    else if (me[type].some((s) => SB.key(s.name) === SB.key(name))) SB.flash('info', `${name} is already on this list.`);
    else if (me[other].some((s) => SB.key(s.name) === SB.key(name)))
      SB.flash('err', `${name} is already on your ${other === 'offer' ? '"can teach"' : '"want to learn"'} list. Remove it there first.`);
    else if (me[type].length >= SB.MAX_SKILLS) SB.flash('err', `You can list up to ${SB.MAX_SKILLS} skills here. Remove one to add another.`);
    else {
      me[type].push(type === 'offer' ? { name, level: SB.LEVELS[level] ? level : 'intermediate' } : { name });
      SB.saveUser(me);
      SB.flash('ok', `${name} added.`);
      form.reset();
    }
    render();
  }

  $('form-offer').addEventListener('submit', (e) => { e.preventDefault(); addSkill('offer', e.target); });
  $('form-want').addEventListener('submit', (e) => { e.preventDefault(); addSkill('want', e.target); });

  $('form-bio').addEventListener('submit', (e) => {
    e.preventDefault();
    const me = SB.currentUser();
    const bio = String(new FormData(e.target).get('bio')).trim();
    if (bio.length > 200) SB.flash('err', 'Keep your bio under 200 characters.');
    else {
      me.bio = bio;
      SB.saveUser(me);
      SB.flash('ok', 'Bio saved.');
    }
    render();
  });

  // remove buttons (the lists are re-drawn, so listen on the page)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const me = SB.currentUser();
    const type = btn.dataset.remove;
    me[type] = me[type].filter((s) => s.name !== btn.dataset.name);
    SB.saveUser(me);
    SB.flash('ok', 'Skill removed.');
    render();
  });

  render();
});
