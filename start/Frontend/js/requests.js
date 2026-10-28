/* requests.html */
SB.ready.then(() => {
  const first = SB.requireLogin();
  if (!first) return;

  const $ = (id) => document.getElementById(id);
  const LABELS = { pending: 'Waiting', accepted: 'Accepted', rejected: 'Declined', cancelled: 'Cancelled' };

  /** One request card, written from the point of view of the logged-in student. */
  function card(r, me, usersById) {
    // offer = skill the sender teaches, want = skill the receiver teaches
    const isReceiver = r.receiverId === me.id;
    const other = usersById[isReceiver ? r.senderId : r.receiverId] || { name: 'Former student', email: '' };
    const learn = isReceiver ? r.offer : r.want;
    const teach = isReceiver ? r.want : r.offer;

    let actions = '';
    if (r.status === 'pending') {
      actions = isReceiver
        ? `<div class="actions">
             <button class="btn btn-small" type="button" data-action="accept" data-id="${SB.esc(r.id)}">Accept</button>
             <button class="btn btn-small btn-danger" type="button" data-action="reject" data-id="${SB.esc(r.id)}">Decline</button>
           </div>`
        : `<div class="actions"><button class="btn btn-small btn-ghost" type="button" data-action="cancel" data-id="${SB.esc(r.id)}">Cancel request</button></div>`;
    }

    return `
    <article class="req req-${SB.esc(r.status)}">
      <header>
        <h3>${isReceiver ? SB.esc(other.name) + ' wants to swap with you' : 'Your request to ' + SB.esc(other.name)}</h3>
        <span class="status status-${SB.esc(r.status)}">${LABELS[r.status]}</span>
      </header>
      ${SB.swapCard({ title: 'You learn', skills: [learn] }, { title: 'You teach', skills: [teach] })}
      ${r.message ? `<blockquote>${SB.esc(r.message)}</blockquote>` : ''}
      <p class="muted small">Sent ${SB.esc(SB.fmtDate(r.createdAt))}</p>
      ${r.status === 'accepted' ? `<p class="contact">Contact ${SB.esc(SB.firstName(other.name))} at <a href="mailto:${SB.esc(other.email)}">${SB.esc(other.email)}</a> to fix a time.</p>` : ''}
      ${actions}
    </article>`;
  }

  function render() {
    const me = SB.currentUser();
    const usersById = Object.fromEntries(SB.db.users().map((u) => [u.id, u]));
    const mine = SB.db
      .requests()
      .filter((r) => r.senderId === me.id || r.receiverId === me.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const groups = {
      incoming: mine.filter((r) => r.status === 'pending' && r.receiverId === me.id),
      accepted: mine.filter((r) => r.status === 'accepted'),
      sent: mine.filter((r) => r.status === 'pending' && r.senderId === me.id),
      closed: mine.filter((r) => r.status === 'rejected' || r.status === 'cancelled'),
    };

    for (const [name, list] of Object.entries(groups)) {
      $('sec-' + name).hidden = list.length === 0;
      $('list-' + name).innerHTML = list.map((r) => card(r, me, usersById)).join('');
    }
    $('empty').hidden = mine.length > 0;

    SB.initNav(me);
    SB.showFlashes();
  }

  /** Only the receiver can accept/decline, only the sender can cancel, and only while pending. */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const rules = {
      accept: ['accepted', 'receiverId', 'Request accepted. You can now see their email below.'],
      reject: ['rejected', 'receiverId', 'Request declined.'],
      cancel: ['cancelled', 'senderId', 'Request cancelled.'],
    };
    const rule = rules[btn.dataset.action];
    if (!rule) return;

    const me = SB.currentUser();
    const [status, owner, okMessage] = rule;
    const requests = SB.db.requests();
    const r = requests.find((x) => x.id === btn.dataset.id);

    if (r && r.status === 'pending' && r[owner] === me.id) {
      r.status = status;
      r.respondedAt = new Date().toISOString();
      SB.db.saveRequests(requests);
      SB.flash('ok', okMessage);
    } else {
      SB.flash('info', 'That request has already been answered or no longer exists.');
    }
    render();
  });

  render();
});
