"""
Auto-selects storage backend based on STORAGE env var:
  STORAGE=local  →  LocalRepository  (db.json — default, works offline)
  STORAGE=aws    →  DynamoRepository (AWS DynamoDB)
"""
import os

_storage = os.getenv("STORAGE", "local").strip().lower()

if _storage == "aws":
    from .dynamo_db import DynamoRepository
    repo = DynamoRepository()
else:
    from .local_db import LocalRepository
    repo = LocalRepository()
