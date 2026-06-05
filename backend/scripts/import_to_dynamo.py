"""
Import local db.json into AWS DynamoDB.
Run this ONCE after creating the DynamoDB table to restore all your data.

Usage:
    cd backend
    python scripts/import_to_dynamo.py

Requirements:
    - AWS credentials configured (aws configure)
    - DynamoDB table must already exist (run setup_aws.py first)
    - STORAGE=aws and AWS_REGION/DYNAMO_TABLE set in .env
"""
import json, os, sys, time, boto3
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

REGION     = os.getenv("AWS_REGION", "ap-south-1")
TABLE_NAME = os.getenv("DYNAMO_TABLE", "clerk_app")
DB_FILE    = os.path.join(os.path.dirname(__file__), "..", "data", "db.json")

def to_decimal(obj):
    """Recursively convert floats to Decimal (DynamoDB requirement)."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_decimal(i) for i in obj]
    return obj

def main():
    if not os.path.exists(DB_FILE):
        print(f"ERROR: {DB_FILE} not found. Run from backend/ directory.")
        sys.exit(1)

    with open(DB_FILE, "r", encoding="utf-8") as f:
        items = json.load(f)

    print(f"Loaded {len(items)} items from db.json")
    print(f"Target: DynamoDB table '{TABLE_NAME}' in {REGION}")
    print()

    dynamo  = boto3.resource("dynamodb", region_name=REGION)
    table   = dynamo.Table(TABLE_NAME)
    success = 0
    failed  = 0

    # Use batch_writer for efficiency (auto-batches in groups of 25)
    with table.batch_writer() as batch:
        for item in items:
            if not item.get("PK") or not item.get("SK"):
                print(f"  SKIP (no PK/SK): {item}")
                continue
            try:
                batch.put_item(Item=to_decimal(item))
                success += 1
                if success % 25 == 0:
                    print(f"  Imported {success}/{len(items)}...")
            except Exception as e:
                print(f"  FAILED: {item.get('PK')} / {item.get('SK')} — {e}")
                failed += 1

    print()
    print(f"Done!  Imported: {success}  Failed: {failed}")
    if failed == 0:
        print("All data is now in DynamoDB. Set STORAGE=aws in .env and restart the server.")

if __name__ == "__main__":
    main()
