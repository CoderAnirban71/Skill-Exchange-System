/* register.html */
SB.ready.then(() => {
  if (SB.redirectIfLoggedIn()) return;
  SB.showFlashes();

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    const confirm = String(data.get('confirm'));

    if (name.length < 2 || name.length > 60) return SB.showError(form, 'Enter your name (2 to 60 characters).');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return SB.showError(form, 'Enter a valid email address.');
    if (password.length < 8) return SB.showError(form, 'Use at least 8 characters for your password.');
    if (password !== confirm) return SB.showError(form, 'The two passwords do not match.');

    const users = SB.db.users();
    if (users.some((u) => u.email === email)) {
      return SB.showError(form, 'An account with this email already exists. Try logging in.');
    }

    const user = {
      id: SB.uid(),
      name,
      email,
      hash: await SB.hashPassword(password, email),
      bio: '',
      offer: [],
      want: [],
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    SB.db.saveUsers(users);
    SB.db.setSession(user.id);
    SB.flash('ok', `Welcome, ${name}. Start by adding a skill you can teach.`);
    location.href = 'dashboard.html';
  });
});
