import bcrypt


def hash_password(password: bytes) -> bytes:
    return bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))
