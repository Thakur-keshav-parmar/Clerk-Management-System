"""
DynamoDB repository — drop-in replacement for LocalRepository.
Used when STORAGE=aws in .env
"""
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from config.settings import AWS_REGION, DYNAMO_TABLE, DYNAMO_ENDPOINT
from .base import BaseRepository


def _resource():
    kwargs = {"region_name": AWS_REGION}
    if DYNAMO_ENDPOINT:
        kwargs["endpoint_url"] = DYNAMO_ENDPOINT
    return boto3.resource("dynamodb", **kwargs)


class DynamoRepository(BaseRepository):

    def __init__(self):
        self._table = None

    @property
    def table(self):
        if self._table is None:
            self._table = _resource().Table(DYNAMO_TABLE)
        return self._table

    def get_item(self, pk: str, sk: str) -> dict | None:
        resp = self.table.get_item(Key={"PK": pk, "SK": sk})
        return resp.get("Item")

    def put_item(self, item: dict) -> None:
        self.table.put_item(Item=item)

    def delete_item(self, pk: str, sk: str) -> None:
        self.table.delete_item(Key={"PK": pk, "SK": sk})

    def query(self, pk: str, sk_prefix: str = None) -> list[dict]:
        if sk_prefix:
            resp = self.table.query(
                KeyConditionExpression=Key("PK").eq(pk) & Key("SK").begins_with(sk_prefix)
            )
        else:
            resp = self.table.query(
                KeyConditionExpression=Key("PK").eq(pk)
            )
        return resp.get("Items", [])

    def query_gsi(self, gsi_pk: str, gsi_sk_prefix: str = None) -> list[dict]:
        if gsi_sk_prefix:
            resp = self.table.query(
                IndexName="GSI1",
                KeyConditionExpression=Key("GSI1_PK").eq(gsi_pk) & Key("GSI1_SK").begins_with(gsi_sk_prefix)
            )
        else:
            resp = self.table.query(
                IndexName="GSI1",
                KeyConditionExpression=Key("GSI1_PK").eq(gsi_pk)
            )
        return resp.get("Items", [])

    def scan_prefix(self, pk_prefix: str) -> list[dict]:
        from boto3.dynamodb.conditions import Attr
        items = []
        kwargs = {"FilterExpression": Attr("PK").begins_with(pk_prefix)}
        while True:
            resp = self.table.scan(**kwargs)
            items.extend(resp.get("Items", []))
            if "LastEvaluatedKey" not in resp:
                break
            kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        return items
