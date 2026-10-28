/* login.html */
SB.ready.then(() => {
  if (SB.redirectIfLoggedIn()) return;
  SB.showFlashes();

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));

    const user = SB.db.users().find((u) => u.email === email);
    // Same message for "no such email" and "wrong password".
    if (!user || user.hash !== (await SB.hashPassword(password, email))) {
      SB.showError(form, 'Email or password is incorrect.');
      return;
    }
    SB.db.setSession(user.id);
    location.href = 'dashboard.html';
  });
});
