# SkillBarter

Skill exchange site for students. Frontend: HTML/CSS/JS. Backend: Python (Flask). Database: MySQL.

## Easy way to run

1. Install **Python 3.10+** and **MySQL 8+**, and make sure MySQL is running.
2. Windows: double-click **start.bat**. Mac/Linux: run `./start.sh`.
3. First time only, it asks for your MySQL host, user and password (press Enter to keep `localhost`, `3306`, `root`). It tests the connection, creates the database and demo students, then opens http://localhost:5000 in your browser.

Next time, just run start.bat again. It goes straight to the site.

Demo login: `meera@demo.com` / `demo1234`

If your MySQL password changes, delete `backend/.env` and run start again.

## Folders

```
start.py / start.bat / start.sh   one-click starter
frontend/                         HTML, css/, js/
backend/app.py                    Flask API (also serves the frontend)
backend/init_db.py, schema.sql    database tables + demo data
backend/.env                      created for you (holds the MySQL password, never share it)
```

## Notes

- See EXPLAIN.md for a simple explanation you can use with faculty (architecture, tables, security, viva questions).
- Passwords are stored as salted hashes. A student's email is shown to the other side only after a request is accepted.
- For real deployment use a production server, HTTPS, and a dedicated MySQL user instead of `root`.
