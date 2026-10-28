"""SkillBarter one-click starter.

Double-click start.bat (Windows) or run ./start.sh (Mac/Linux), or:  python start.py

First run : installs packages, asks for your MySQL details, tests the connection,
            creates the database + demo students, starts the site.
Next runs : just starts the site.

Your password is typed here on your own laptop and saved only in backend/.env.
"""
import getpass
import os
import secrets
import subprocess
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
ENV_FILE = os.path.join(BACKEND, ".env")


def install_packages():
    try:
        import flask, pymysql, dotenv, cryptography  # noqa: F401
        return
    except ImportError:
        pass
    print("Installing required packages (one time)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "-r",
                           os.path.join(BACKEND, "requirements.txt")])


def ask(label, default=""):
    val = input(f"{label}" + (f" [{default}]" if default else "") + ": ").strip()
    return val or default


def try_connect(host, port, user, password):
    import pymysql
    conn = pymysql.connect(host=host, port=port, user=user, password=password, connect_timeout=5)
    conn.close()


def setup_env():
    print("\n--- MySQL setup (one time) ---")
    print("Make sure MySQL is running on this laptop.\n")
    while True:
        host = ask("MySQL host", "localhost")
        port = ask("MySQL port", "3306")
        user = ask("MySQL user", "root")
        password = getpass.getpass("MySQL password (typing is hidden): ")
        try:
            try_connect(host, int(port), user, password)
            break
        except Exception as e:  # noqa: BLE001
            print(f"\nCould not connect: {e}")
            print("Check: is MySQL running? Is the password right? Then try again.\n")
    db_name = ask("Database name to create", "skillbarter")
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.write(f"DB_HOST={host}\nDB_PORT={port}\nDB_USER={user}\nDB_PASSWORD={password}\n"
                f"DB_NAME={db_name}\nSECRET_KEY={secrets.token_hex(32)}\n")
    print("\nConnected. Saved to backend/.env")


def main():
    install_packages()
    if not os.path.exists(ENV_FILE):
        setup_env()

    sys.path.insert(0, BACKEND)
    os.chdir(BACKEND)

    import init_db
    try:
        init_db.main()  # safe to run every time: only creates what is missing
    except Exception as e:  # noqa: BLE001
        print(f"\nDatabase problem: {e}")
        print("If the password changed, delete backend/.env and run this again.")
        input("Press Enter to close...")
        return

    from app import app
    url = "http://localhost:5000"
    print(f"\nSkillBarter is running at {url}   (press Ctrl+C to stop)")
    print("Demo login: meera@demo.com / demo1234\n")
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    main()
