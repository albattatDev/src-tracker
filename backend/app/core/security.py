from passlib.context import CryptContext

# Pinned bcrypt==4.0.1 in requirements.txt avoids the known passlib/bcrypt>=4.1
# incompatibility (passlib probes bcrypt.__about__, which newer bcrypt removed).
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)
