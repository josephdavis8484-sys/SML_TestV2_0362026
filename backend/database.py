"""
Database connection and initialization for ShowMeLive
"""
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URL, DB_NAME

# MongoDB client and database
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME.strip('"')]

# Export for use in other modules
__all__ = ['client', 'db']
