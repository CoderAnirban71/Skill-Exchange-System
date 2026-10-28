"""
SkillBarter backend (Python Flask + MySQL)
==========================================

How it works in one line:
    Browser (HTML/JS)  --JSON over HTTP-->  Flask (this file)  --SQL-->  MySQL

Each "route" below is one URL the browser can call, for example:
    POST /api/login   -> checks email + password, remembers the user
    GET  /api/users   -> returns the list of other students

The file is split into 6 simple parts:
    1. Setup            4. Skills
    2. Database helpers 5. Students (search)
    3. Account          6. Swap requests
"""
import os
import re
from datetime import datetime

import pymysql
import pymysql.cursors
from flask import Flask, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

import config

# ---------------------------------------------------------------- 1. SETUP
# Flask also serves our HTML/CSS/JS files from the "frontend" folder.
FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app = Flask(__name__, static_folder=FRONTEND, static_url_path="")
app.secret_key = config.SECRET_KEY      # used to sign the login cookie

MAX_SKILLS = 15
LEVELS = ("beginner", "intermediate", "advanced")


# ------------------------------------------------------ 2. DATABASE HELPERS
def connect():
    """Open a connection to MySQL using the details from the .env file."""
    return pymysql.connect(
        host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER,
        password=config.DB_PASSWORD, database=config.DB_NAME, charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor, autocommit=True,
    )


def select(sql, args=()):
    """Run a SELECT and return a list of rows (each row is a dict)."""
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchall()
    finally:
        conn.close()


def select_one(sql, args=()):
    """Run a SELECT and return only the first row (or None)."""
    rows = select(sql, args)
    return rows[0] if rows else None


def change(sql, args=()):
    """Run INSERT / UPDATE / DELETE. Returns (new row id, rows changed)."""
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            return cur.lastrowid, cur.rowcount
    finally:
        conn.close()


def error(message, status=400, kind="err"):
    """Send an error message back to the browser as JSON."""
    return jsonify({"error": message, "kind": kind}), status


def logged_in_user():
    """Who is logged in? The login cookie stores only the user's id."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    return select_one("SELECT * FROM users WHERE id = %s", (user_id,))


def skills_of(user_id):
    """Return {'offer': [...], 'want': [...]} for one student."""
    result = {"offer": [], "want": []}
    rows = select("SELECT kind, name, level FROM user_skills WHERE user_id = %s ORDER BY id", (user_id,))
    for r in rows:
        if r["kind"] == "offer":
            result["offer"].append({"name": r["name"], "level": r["level"] or "intermediate"})
        else:
            result["want"].append({"name": r["name"]})
    return result


def clean_skill_name(text):
    """'  python  ' -> 'Python'  (trim spaces, capitalise if all lowercase)."""
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    if text and text == text.lower():
        text = text[0].upper() + text[1:]
    return text


def get_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


# ------------------------------------------------------------- 3. ACCOUNT
@app.post("/api/register")
def register():
    data = get_json()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    # Validate the input first
    if not 2 <= len(name) <= 60:
        return error("Enter your name (2 to 60 characters).")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return error("Enter a valid email address.")
    if len(password) < 8:
        return error("Use at least 8 characters for your password.")
    if select_one("SELECT id FROM users WHERE email = %s", (email,)):
        return error("An account with this email already exists. Try logging in.", 409)

    # Save the user. We store a HASH of the password, never the password itself.
    new_id, _ = change(
        "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
        (name, email, generate_password_hash(password)),
    )
    session["user_id"] = new_id          # log the new user in
    return jsonify({"ok": True}), 201


@app.post("/api/login")
def login():
    data = get_json()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = select_one("SELECT * FROM users WHERE email = %s", (email,))
    # Same message for wrong email and wrong password (so nobody can guess emails).
    if not user or not check_password_hash(user["password_hash"], password):
        return error("Email or password is incorrect.", 401)

    session["user_id"] = user["id"]
    return jsonify({"ok": True})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/me")
def me():
    """The logged-in student's profile, skills and number of waiting requests."""
    user = logged_in_user()
    if not user:
        return jsonify({"user": None})
    skills = skills_of(user["id"])
    waiting = select_one(
        "SELECT COUNT(*) AS n FROM swap_requests WHERE receiver_id = %s AND status = 'pending'",
        (user["id"],),
    )["n"]
    return jsonify({"user": {
        "id": user["id"], "name": user["name"], "email": user["email"], "bio": user["bio"],
        "offer": skills["offer"], "want": skills["want"], "pending": waiting,
    }})


@app.put("/api/me")
def update_me():
    user = logged_in_user()
    if not user:
        return error("Log in to continue.", 401, "info")
    data = get_json()
    if "bio" in data:
        bio = str(data["bio"]).strip()
        if len(bio) > 200:
            return error("Keep your bio under 200 characters.")
        change("UPDATE users SET bio = %s WHERE id = %s", (bio, user["id"]))
    if "name" in data:
        name = str(data["name"]).strip()
        if not 2 <= len(name) <= 60:
            return error("Enter your name (2 to 60 characters).")
        change("UPDATE users SET name = %s WHERE id = %s", (name, user["id"]))
    return jsonify({"ok": True})


# --------------------------------------------------------------- 4. SKILLS
# kind = "offer"  -> a skill I can teach
# kind = "want"   -> a skill I want to learn
@app.post("/api/skills")
def add_skill():
    user = logged_in_user()
    if not user:
        return error("Log in to continue.", 401, "info")

    data = get_json()
    kind = data.get("type")
    name = clean_skill_name(data.get("name"))
    level = data.get("level") if data.get("level") in LEVELS else "intermediate"

    if kind not in ("offer", "want"):
        return error("Unknown skill list.")
    if not 2 <= len(name) <= 40:
        return error("Skill names need 2 to 40 characters.")

    # Is this skill already on one of my lists?
    existing = select_one(
        "SELECT kind FROM user_skills WHERE user_id = %s AND name = %s", (user["id"], name)
    )
    if existing and existing["kind"] == kind:
        return error(f"{name} is already on this list.", 409, "info")
    if existing:
        other = '"can teach"' if existing["kind"] == "offer" else '"want to learn"'
        return error(f"{name} is already on your {other} list. Remove it there first.", 409)

    count = select_one(
        "SELECT COUNT(*) AS n FROM user_skills WHERE user_id = %s AND kind = %s", (user["id"], kind)
    )["n"]
    if count >= MAX_SKILLS:
        return error(f"You can list up to {MAX_SKILLS} skills here. Remove one to add another.")

    change(
        "INSERT INTO user_skills (user_id, kind, name, level) VALUES (%s, %s, %s, %s)",
        (user["id"], kind, name, level if kind == "offer" else None),
    )
    return jsonify({"ok": True, "name": name}), 201


@app.delete("/api/skills")
def remove_skill():
    user = logged_in_user()
    if not user:
        return error("Log in to continue.", 401, "info")
    change(
        "DELETE FROM user_skills WHERE user_id = %s AND kind = %s AND name = %s",
        (user["id"], request.args.get("type", ""), request.args.get("name", "")),
    )
    return jsonify({"ok": True})


# ------------------------------------------------------------ 5. STUDENTS
@app.get("/api/users")
def list_users():
    """All other students. Optional ?q=python searches name or a skill they teach.
    Emails are NOT sent here (privacy)."""
    user = logged_in_user()
    if not user:
        return error("Log in to continue.", 401, "info")

    q = request.args.get("q", "").strip()[:60]
    only_id = request.args.get("user", "").strip()

    sql = "SELECT id, name, bio FROM users WHERE id <> %s"
    args = [user["id"]]
    if only_id.isdigit():
        sql += " AND id = %s"
        args.append(int(only_id))
    if q:
        like = "%" + q + "%"
        sql += (" AND (name LIKE %s OR id IN "
                "(SELECT user_id FROM user_skills WHERE kind = 'offer' AND name LIKE %s))")
        args += [like, like]

    students = []
    for row in select(sql + " LIMIT 500", tuple(args)):
        skills = skills_of(row["id"])
        students.append({"id": row["id"], "name": row["name"], "bio": row["bio"],
                         "offer": skills["offer"], "want": skills["want"]})
    return jsonify({"users": students})


# ------------------------------------------------------- 6. SWAP REQUESTS
# A request says: "I (sender) will teach <offer_skill>, you (receiver) teach <want_skill>".
# status: pending -> accepted / rejected (by receiver) or cancelled (by sender)
@app.get("/api/requests")
def list_requests():
    user = logged_in_user()
    if not user:
        return error("Log in to continue.", 401, "info")

    rows = select(
        """SELECT r.*, s.name AS sender_name, s.email AS sender_email,
                  v.name AS receiver_name, v.email AS receiver_email
           FROM swap_requests r
           JOIN users s ON s.id = r.sender_id
           JOIN users v ON v.id = r.receiver_id
           WHERE r.sender_id = %s OR r.receiver_id = %s
           ORDER BY r.id DESC""",
        (user["id"], user["id"]),
    )
    result = []
    for r in rows:
        i_am_receiver = r["receiver_id"] == user["id"]
        other_name = r["sender_name"] if i_am_receiver else r["receiver_name"]
        other_email = r["sender_email"] if i_am_receiver else r["receiver_email"]
        result.append({
            "id": r["id"], "senderId": r["sender_id"], "receiverId": r["receiver_id"],
            "offer": r["offer_skill"], "want": r["want_skill"], "message": r["message"],
            "status": r["status"], "createdAt": r["created_at"].isoformat() + "Z",
            # The other person's email is revealed ONLY after the request is accepted.
            "other": {"name": other_name, "email": other_email if r["status"] == "accepted" else None},
        })
    return jsonify({"requests": result})


@app.post("/api/requests")
def send_request():
    user = logged_in_user()
    if not user:
        return error("Log in to continue.", 401, "info")

    data = get_json()
    message = str(data.get("message", "")).strip()
    try:
        receiver_id = int(data.get("receiverId"))
    except (TypeError, ValueError):
        return error("That student could not be found.")

    receiver = select_one("SELECT id, name FROM users WHERE id = %s", (receiver_id,))
    if not receiver or receiver_id == user["id"]:
        return error("That student could not be found.")
    if len(message) > 300:
        return error("Keep your message under 300 characters.")

    # The sender must really teach the skill they offer ...
    mine = select_one(
        "SELECT name FROM user_skills WHERE user_id = %s AND kind = 'offer' AND name = %s",
        (user["id"], str(data.get("offer", ""))),
    )
    if not mine:
        return error("Pick one of the skills you teach.")
    # ... and the receiver must really teach the skill they ask for.
    theirs = select_one(
        "SELECT name FROM user_skills WHERE user_id = %s AND kind = 'offer' AND name = %s",
        (receiver_id, str(data.get("want", ""))),
    )
    if not theirs:
        return error(f"{receiver['name']} does not teach that skill.")

    # Only one waiting request per pair of students.
    waiting = select_one(
        "SELECT id FROM swap_requests WHERE sender_id = %s AND receiver_id = %s AND status = 'pending'",
        (user["id"], receiver_id),
    )
    if waiting:
        return error(f"You already have a request waiting with {receiver['name']}.", 409, "info")

    change(
        "INSERT INTO swap_requests (sender_id, receiver_id, offer_skill, want_skill, message) "
        "VALUES (%s, %s, %s, %s, %s)",
        (user["id"], receiver_id, mine["name"], theirs["name"], message),
    )
    return jsonify({"ok": True, "receiverName": receiver["name"]}), 201


@app.post("/api/requests/<int:request_id>/<action>")
def answer_request(request_id, action):
    """action = accept / reject (receiver only)  or  cancel (sender only)."""
    user = logged_in_user()
    if not user:
        return error("Log in to continue.", 401, "info")

    # action -> (new status, who is allowed to do it, success message)
    rules = {
        "accept": ("accepted", "receiver_id", "Request accepted. You can now see their email below."),
        "reject": ("rejected", "receiver_id", "Request declined."),
        "cancel": ("cancelled", "sender_id", "Request cancelled."),
    }
    if action not in rules:
        return error("Unknown action.", 404)
    new_status, allowed_column, message = rules[action]

    # One UPDATE that only works if: right person AND request is still pending.
    _, changed = change(
        f"UPDATE swap_requests SET status = %s, responded_at = %s "
        f"WHERE id = %s AND status = 'pending' AND {allowed_column} = %s",
        (new_status, datetime.utcnow(), request_id, user["id"]),
    )
    if changed == 0:
        return error("That request has already been answered or no longer exists.", 409, "info")
    return jsonify({"ok": True, "message": message})


# ------------------------------------------------------------ START SERVER
@app.get("/")
def home():
    return app.send_static_file("index.html")


@app.errorhandler(pymysql.MySQLError)
def database_problem(e):
    app.logger.exception("Database error: %s", e)
    return error("Database problem. Check that MySQL is running and your .env is correct.", 500)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
