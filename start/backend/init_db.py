"""Run once:  python init_db.py
Creates the database and tables from schema.sql, then adds the 4 demo students
(only if the users table is empty)."""
import os
import pymysql
from werkzeug.security import generate_password_hash
import config

HERE = os.path.dirname(os.path.abspath(__file__))

DEMO = [
    ("Meera Iyer", "meera@demo.com", "2nd year design student. Free on weekends.",
     [("Photoshop", "intermediate"), ("Figma", "beginner")], ["Python", "Excel"]),
    ("Rohan Mehta", "rohan@demo.com", "BCA, 3rd year. Evenings are best for me.",
     [("Python", "advanced"), ("SQL", "intermediate")], ["Guitar", "Video editing"]),
    ("Priya Singh", "priya@demo.com", "Music and debate club. Happy to teach on campus.",
     [("Guitar", "intermediate"), ("Public speaking", "advanced")], ["Photoshop", "Python"]),
    ("Kabir Khan", "kabir@demo.com", "MBA first year. Weekday mornings are free.",
     [("Video editing", "advanced"), ("Excel", "intermediate")], ["Public speaking", "SQL"]),
]


def main():
    conn = pymysql.connect(host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER,
                           password=config.DB_PASSWORD, charset="utf8mb4", autocommit=True)
    with conn.cursor() as cur:
        with open(os.path.join(HERE, "schema.sql"), encoding="utf-8") as f:
            sql = f.read()
        # Table/db name in schema.sql is "skillbarter"; swap if .env uses another name.
        sql = sql.replace("skillbarter", config.DB_NAME)
        for stmt in (s.strip() for s in sql.split(";")):
            if stmt:
                cur.execute(stmt)
        cur.execute(f"USE `{config.DB_NAME}`")
        cur.execute("SELECT COUNT(*) FROM users")
        if cur.fetchone()[0] == 0:
            pw = generate_password_hash("demo1234")
            for name, email, bio, offer, want in DEMO:
                cur.execute("INSERT INTO users (name, email, password_hash, bio) VALUES (%s,%s,%s,%s)",
                            (name, email, pw, bio))
                uid = cur.lastrowid
                for n, lvl in offer:
                    cur.execute("INSERT INTO user_skills (user_id, kind, name, level) VALUES (%s,'offer',%s,%s)", (uid, n, lvl))
                for n in want:
                    cur.execute("INSERT INTO user_skills (user_id, kind, name) VALUES (%s,'want',%s)", (uid, n))
            print("Demo students added (password: demo1234).")
        else:
            print("Users already exist, demo data skipped.")
    conn.close()
    print(f"Database '{config.DB_NAME}' is ready.")


if __name__ == "__main__":
    main()
