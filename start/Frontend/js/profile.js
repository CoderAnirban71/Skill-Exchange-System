SB.ready.then(() => {
  const me = SB.currentUser();
  if (!me) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('form-profile');
  if (!form) return;

  const panel = form.closest('.panel');
  if (panel) {
    const details = document.createElement('div');
    details.style.cssText = `
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,248,250,0.95));
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 18px;
      padding: 20px 20px 12px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      margin-top: 8px;
    `;

    details.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px;">
        <h3 style="margin:0; font-size:1.25rem;">Profile details</h3>
        <span style="background:#edf8f7; color:#0d7c74; padding:6px 10px; border-radius:999px; font-size:0.78rem; font-weight:700; letter-spacing:0.02em;">Active</span>
      </div>
      <div style="display:grid; gap:14px;">
        <div style="padding:12px 14px; border-radius:12px; background:rgba(15,23,42,0.02); border:1px solid rgba(15,23,42,0.05);">
          <div style="font-size:0.75rem; letter-spacing:0.06em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">Full name</div>
          <div style="font-weight:700; font-size:1.05rem; color:#15212f;">${SB.esc(me.name || '')}</div>
        </div>
        <div style="padding:12px 14px; border-radius:12px; background:rgba(15,23,42,0.02); border:1px solid rgba(15,23,42,0.05);">
          <div style="font-size:0.75rem; letter-spacing:0.06em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">Email</div>
          <div style="font-weight:600; color:#15212f;">${SB.esc(me.email || '')}</div>
        </div>
        <div style="padding:12px 14px; border-radius:12px; background:rgba(15,23,42,0.02); border:1px solid rgba(15,23,42,0.05);">
          <div style="font-size:0.75rem; letter-spacing:0.06em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">Short bio</div>
          <div style="color:#324152; line-height:1.5;">${SB.esc(me.bio || 'No bio added yet.')}</div>
        </div>
      </div>
    `;
    form.replaceWith(details);
  }

  document.getElementById('profile-sub').textContent = 'Signed in as ' + (me.email || '');

  const offerWrap = document.getElementById('profile-offer');
  const wantWrap = document.getElementById('profile-want');

  offerWrap.innerHTML = SB.chips(me.offer || [], 'teach');
  wantWrap.innerHTML = SB.chips(me.want || [], 'learn');
});
