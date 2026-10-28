/* search.html */
SB.ready.then(() => {
  const first = SB.requireLogin();
  if (!first) return;
  SB.initNav(first);

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const q = (params.get('q') || '').trim();
  const userFilter = params.get('user') || '';

  $('q').value = q;
  $('clear').hidden = !(q || userFilter);

  function render() {
    const me = SB.currentUser();
    const pendingWith = new Set(
      SB.db.requests().filter((r) => r.status === 'pending' && r.senderId === me.id).map((r) => r.receiverId)
    );

    // 1. who to show
    let students = SB.db.users().filter((u) => u.id !== me.id);
    if (userFilter) students = students.filter((u) => u.id === userFilter);
    if (q) {
      const needle = q.toLowerCase();
      students = students.filter((u) => u.name.toLowerCase().includes(needle) || u.offer.some((s) => s.name.toLowerCase().includes(needle)));
    } else {
      students = students.filter((u) => u.offer.length); // only people who teach something
    }

    // 2. mutual matches first, then people who teach something I want
    students = students
      .map((u) => {
        const m = SB.matchInfo(me, u);
        return { u, m, score: m.mutual ? 2 : m.theyTeachMe.length ? 1 : 0 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 60);

    // 3. draw the cards
    $('results').innerHTML = students
      .map(({ u, m }) => {
        const hitTheyTeach = m.theyTeachMe.map((s) => SB.key(s.name));
        const hitITeach = m.iTeachThem.map((s) => SB.key(s.name));
        const first = SB.esc(SB.firstName(u.name));

        const badge = m.mutual
          ? '<span class="badge">Mutual match</span>'
          : m.theyTeachMe.length
          ? '<span class="badge badge-soft">Skill You Want</span>'
          : '';

        let action;
        if (pendingWith.has(u.id)) {
          action = '<p class="muted">Request waiting. <a href="requests.html">See your requests</a>.</p>';
        } else if (!me.offer.length) {
          action = '<p class="muted"><a href="dashboard.html">Add a skill you teach</a> to send a request.</p>';
        } else if (!u.offer.length) {
          action = `<p class="muted">${first} has not listed a skill to teach yet.</p>`;
        } else {
          const options = (list, hits) =>
            list.map((s) => `<option value="${SB.esc(s.name)}"${hits.includes(SB.key(s.name)) ? ' selected' : ''}>${SB.esc(s.name)}</option>`).join('');
          action = `
          <details class="request-box"${userFilter ? ' open' : ''}>
            <summary class="btn btn-small">Request a swap</summary>
            <form class="form request-form" data-receiver="${SB.esc(u.id)}">
              <p class="flash flash-err" role="alert" data-error hidden></p>
              <label>Skill I Have For ${first}
                <select name="offer" required>${options(me.offer, hitITeach)}</select>
              </label>
              <label>Skill I Want to Learn from ${first}
                <select name="want" required>${options(u.offer, hitTheyTeach)}</select>
              </label>
              <label>Message (optional)
                <textarea name="message" rows="2" maxlength="300" placeholder="Say when you are free, or what you want to cover."></textarea>
              </label>
              <button type="submit" class="btn">Send request</button>
            </form>
          </details>`;
        }

        return `
        <article class="student${m.mutual ? ' student-mutual' : ''}">
          <header><h2>${SB.esc(u.name)}</h2>${badge}</header>
          ${u.bio ? `<p class="bio">${SB.esc(u.bio)}</p>` : ''}
          <div class="skill-rows">
            <div><h3>Skill Have</h3>${SB.chips(u.offer, 'offer', hitTheyTeach)}</div>
            <div><h3>Skill Want</h3>${SB.chips(u.want, 'want', hitITeach)}</div>
          </div>
          ${action}
        </article>`;
      })
      .join('');

    const empty = $('empty');
    empty.hidden = students.length > 0;
    empty.textContent = q
      ? `No students match "${q}". Try a shorter word or another skill.`
      : 'No students are teaching anything yet. Invite a friend to join.';

    $('no-skill-note').hidden = me.offer.length > 0;
    SB.initNav(me);
    SB.showFlashes();
  }

  // Sending a request (the forms are re-drawn, so listen on the results box)
  $('results').addEventListener('submit', (e) => {
    const form = e.target.closest('.request-form');
    if (!form) return;
    e.preventDefault();

    const me = SB.currentUser();
    const data = new FormData(form);
    const offer = String(data.get('offer'));
    const want = String(data.get('want'));
    const message = String(data.get('message')).trim();
    const receiver = SB.db.users().find((u) => u.id === form.dataset.receiver);

    if (!receiver || receiver.id === me.id) SB.flash('err', 'That student could not be found.');
    else if (message.length > 300) SB.flash('err', 'Keep your message under 300 characters.');
    else if (!me.offer.some((s) => s.name === offer)) SB.flash('err', 'Pick one of the skills you teach.');
    else if (!receiver.offer.some((s) => s.name === want)) SB.flash('err', `${receiver.name} does not teach that skill.`);
    else {
      const requests = SB.db.requests();
      if (requests.some((r) => r.status === 'pending' && r.senderId === me.id && r.receiverId === receiver.id)) {
        SB.flash('info', `You already have a request waiting with ${receiver.name}.`);
      } else {
        requests.push({
          id: SB.uid(), senderId: me.id, receiverId: receiver.id, offer, want, message,
          status: 'pending', createdAt: new Date().toISOString(), respondedAt: null,
        });
        SB.db.saveRequests(requests);
        SB.flash('ok', `Request sent to ${receiver.name}. You will see their answer under Requests.`);
      }
    }
    render();
    window.scrollTo(0, 0);
  });

  render();
});
