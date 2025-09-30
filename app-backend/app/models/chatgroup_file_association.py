from sqlalchemy import Table, Column, Integer, ForeignKey
from app.core.database import Base

chatgroup_file_table = Table(
    "chatgroup_file_link",
    Base.metadata,
    Column("chat_group_id", Integer, ForeignKey("chat_groups.id")),
    Column("file_id", Integer, ForeignKey("files.id"))
)
