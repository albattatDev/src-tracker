from pydantic import BaseModel, ConfigDict

from app.models import UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str  # not EmailStr: it rejects the seed users' .local addresses
    role: UserRole
