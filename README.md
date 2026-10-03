# SkillBarter (front end)

A skill exchange site for students. Built with plain HTML, CSS and JavaScript. No server, no database, no install.

## How to run

Open `index.html` by double-clicking it. That's all.

## Demo login

Meera's account is ready to use: `meera@demo.com` with password `demo1234`.
Rohan, Priya and Kabir work the same way (`rohan@demo.com`, `priya@demo.com`, `kabir@demo.com`).

To see the full flow, register your own account, send Meera a request, log out, log in as Meera and accept it.

## Pages (one HTML file per screen)

| Page | What it does |
| --- | --- |
| `index.html` | Landing page |
| `register.html` | Create an account |
| `login.html` | Log in |
| `dashboard.html` | Add and remove your skills, see mutual matches, edit your bio |
| `search.html` | Search students by skill or name, send a swap request |
| `requests.html` | Accept, decline or cancel requests. Accepted swaps show each other's email |

## Folders

```
index.html, login.html, register.html,
dashboard.html, search.html, requests.html
css/style.css        all styling (colors are at the top of the file)
js/common.js         shared code: storage, helpers, top bar, demo data
js/login.js          login.html
js/register.js       register.html
js/dashboard.js      dashboard.html
js/search.js         search.html
js/requests.js       requests.html
```

## Good to know

- Data is saved in your browser (localStorage). It does not move to another browser or device, and clearing site data removes it.
- Click "Reset demo data" in any footer to wipe everything and restore the four demo students.
- Passwords are hashed, but this is a front-end demo and not safe for real accounts. A real site needs a server and a database.
- Colors: teal means "I can teach this", gold means "I want to learn this".
