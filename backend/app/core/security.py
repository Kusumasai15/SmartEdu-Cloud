"""Security and Cryptographic Utilities for SmartEdu Cloud."""
import hashlib
import os
import secrets

PBKDF2_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    """Generate a secure salted PBKDF2-HMAC-SHA256 password hash.
    
    Format:
        pbkdf2_sha256$iterations$salt_hex$hash_hex
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    salt = secrets.token_bytes(16)
    iterations = PBKDF2_ITERATIONS
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${hash_bytes.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored PBKDF2 hash string."""
    if not plain_password or not hashed_password:
        return False
    
    try:
        algorithm, iterations_str, salt_hex, hash_hex = hashed_password.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        
        iterations = int(iterations_str)
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        actual_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return secrets.compare_digest(expected_hash, actual_hash)
    except Exception:
        return False


def password_hash_needs_upgrade(hashed_password: str) -> bool:
    """Return true when a valid legacy PBKDF2 hash uses a weaker work factor."""
    try:
        algorithm, iterations_str, _, _ = hashed_password.split("$")
        return algorithm != "pbkdf2_sha256" or int(iterations_str) < PBKDF2_ITERATIONS
    except (TypeError, ValueError):
        return True
