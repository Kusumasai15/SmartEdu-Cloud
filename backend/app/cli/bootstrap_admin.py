"""One-time first administrator creation after database migrations."""

import argparse
import getpass

from sqlalchemy.orm import Session

from app.auth.router import ensure_role_permissions
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Role, User


def bootstrap_admin(db: Session, email: str, password: str, first_name: str, last_name: str) -> User:
    clean_email = email.strip().lower()
    if "@" not in clean_email or len(clean_email) > 255:
        raise ValueError("A valid administrator email is required.")
    if len(password) < 12:
        raise ValueError("The administrator password must be at least 12 characters.")
    if not first_name.strip():
        raise ValueError("The administrator's first name is required.")
    if db.query(User).join(Role).filter(Role.name == "ADMINISTRATOR").first():
        raise RuntimeError("An administrator already exists; use the admin portal to add accounts.")
    if db.query(User).filter(User.email == clean_email).first():
        raise ValueError("This email is already in use.")

    try:
        role = db.query(Role).filter(Role.name == "ADMINISTRATOR").first()
        if not role:
            role = Role(name="ADMINISTRATOR", description="Platform administrator", is_system_role=True)
            db.add(role)
            db.flush()
        ensure_role_permissions(db, role)
        user = User(
            email=clean_email,
            password_hash=hash_password(password),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            role_id=role.id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the first administrator after Alembic migrations")
    parser.add_argument("--email", required=True)
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", default="")
    args = parser.parse_args()
    password = getpass.getpass("New administrator password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        parser.error("Passwords do not match.")
    with SessionLocal() as db:
        user = bootstrap_admin(db, args.email, password, args.first_name, args.last_name)
    print(f"Created administrator {user.email}.")


if __name__ == "__main__":
    main()
