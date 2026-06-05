from abc import ABC, abstractmethod

class BaseRepository(ABC):
    @abstractmethod
    def get_item(self, pk: str, sk: str) -> dict | None: ...

    @abstractmethod
    def put_item(self, item: dict) -> None: ...

    @abstractmethod
    def delete_item(self, pk: str, sk: str) -> None: ...

    @abstractmethod
    def query(self, pk: str, sk_prefix: str = None) -> list[dict]: ...

    @abstractmethod
    def query_gsi(self, gsi_pk: str, gsi_sk_prefix: str = None) -> list[dict]: ...

    @abstractmethod
    def scan_prefix(self, pk_prefix: str) -> list[dict]: ...
