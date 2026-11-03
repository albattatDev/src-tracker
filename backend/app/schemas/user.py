from pydantic import BaseModel, ConfigDict


class UserBrief(BaseModel):
    """What a picker needs to show a person: never the password hash, role or manager."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
