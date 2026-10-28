# SkillBarter: how to explain it to faculty

## 1. The idea (30 seconds)
Students list skills they **can teach** and skills they **want to learn**. The site finds students whose lists match (Anand teaches Python and wants HTML; Aditya is the opposite) and lets them send a swap request. When the request is accepted, both see each other's email. No money involved.

## 2. Architecture (3 layers)

```
Browser (HTML + CSS + JavaScript)      <- what the student sees
        |   JSON over HTTP  (fetch)
Flask server (Python, backend/app.py)  <- rules and logic
        |   SQL
MySQL database                         <- permanent storage
```

| Layer | Technology | Job |
| --- | --- | --- |
| Frontend | HTML, CSS, JavaScript | Pages, forms, showing data |
| Backend | Python + Flask | Login, validation, matching rules, talks to the database |
| Database | MySQL | Stores users, skills and requests |

Why a backend? Earlier the data sat in the browser (localStorage), so every browser had its own private data. Now all students share one MySQL database.

## 3. Database (3 tables)

**users**: id, name, email (unique), password_hash, bio, created_at

**user_skills**: id, user_id, kind (`offer` = can teach / `want` = want to learn), name, level
- A student has many skills (one-to-many with users).

**swap_requests**: id, sender_id, receiver_id, offer_skill, want_skill, message, status, created_at, responded_at
- status goes: `pending` -> `accepted` / `rejected` / `cancelled`
- sender_id and receiver_id both point to users (foreign keys).

```
users 1 ----< user_skills
users 1 ----< swap_requests (as sender)
users 1 ----< swap_requests (as receiver)
```

## 4. What each page does and which API it calls

| Page | API calls |
| --- | --- |
| register.html | `POST /api/register` |
| login.html | `POST /api/login` |
| dashboard.html | `GET /api/me`, `POST/DELETE /api/skills`, `GET /api/users` (matches) |
| search.html | `GET /api/users?q=...`, `POST /api/requests` |
| requests.html | `GET /api/requests`, `POST /api/requests/<id>/accept` (or reject / cancel) |
| profile.html | `GET /api/me` |

## 5. How matching works
Two students are a **mutual match** when:
- the other person teaches something **I want**, and
- I teach something **they want**.

The JavaScript compares the two skill lists (function `matchInfo` in `js/common.js`). Mutual matches are shown first.

## 6. Security points (good to mention)
- **Passwords are hashed** (Werkzeug), never stored as plain text.
- **SQL injection is prevented**: every query uses `%s` placeholders, never string joining.
- **Login uses a signed cookie** that only holds the user id.
- **Privacy**: the other student's email is sent only after a request is accepted. The server decides this, not the browser.
- **Rules are checked on the server**: only the receiver can accept or decline, only the sender can cancel, and only while the request is pending. Even if someone edits the JavaScript, the server still refuses.

## 7. Likely questions and short answers

**Why Flask?** Small, easy to read, and enough for a project like this.

**Why MySQL and not localStorage?** Shared, permanent data for all users, with real relations and constraints.

**What is a foreign key?** A column that points to the id of another table, so a request cannot exist for a user that does not exist.

**What happens if two people click Accept at the same time?** The UPDATE has `WHERE status = 'pending'`, so only the first one succeeds.

**What is JSON?** A simple text format for sending data between browser and server, like `{"name": "Meera"}`.

**What could be improved later?** Email verification, password reset, ratings after a swap, chat, deployment with HTTPS.

## 8. Live demo order
1. Open the site, register a new student.
2. Add skills (one you teach, one you want).
3. Open **Find students**, send a request to Meera.
4. Log out, log in as `meera@demo.com` / `demo1234`, accept it.
5. Show that the email appears only now. Then show the tables in MySQL Workbench to prove the data is real.
