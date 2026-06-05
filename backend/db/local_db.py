import json, os, threading
from .base import BaseRepository
from config.settings import LOCAL_DATA_DIR

DB_FILE = os.path.join(LOCAL_DATA_DIR, "db.json")
_lock = threading.Lock()

def _load() -> list[dict]:
    os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def _save(items: list[dict]):
    os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, default=str)

class LocalRepository(BaseRepository):
    def get_item(self, pk: str, sk: str) -> dict | None:
        with _lock:
            items = _load()
            for item in items:
                if item.get("PK") == pk and item.get("SK") == sk:
                    return item
            return None

    def put_item(self, item: dict) -> None:
        with _lock:
            items = _load()
            for i, existing in enumerate(items):
                if existing.get("PK") == item["PK"] and existing.get("SK") == item["SK"]:
                    items[i] = item
                    _save(items)
                    return
            items.append(item)
            _save(items)

    def delete_item(self, pk: str, sk: str) -> None:
        with _lock:
            items = _load()
            items = [i for i in items if not (i.get("PK") == pk and i.get("SK") == sk)]
            _save(items)

    def query(self, pk: str, sk_prefix: str = None) -> list[dict]:
        with _lock:
            items = _load()
            result = [i for i in items if i.get("PK") == pk]
            if sk_prefix:
                result = [i for i in result if i.get("SK", "").startswith(sk_prefix)]
            return result

    def query_gsi(self, gsi_pk: str, gsi_sk_prefix: str = None) -> list[dict]:
        with _lock:
            items = _load()
            result = [i for i in items if i.get("GSI1_PK") == gsi_pk]
            if gsi_sk_prefix:
                result = [i for i in result if i.get("GSI1_SK", "").startswith(gsi_sk_prefix)]
            return result

    def scan_prefix(self, pk_prefix: str) -> list[dict]:
        with _lock:
            items = _load()
            return [i for i in items if i.get("PK", "").startswith(pk_prefix)]
