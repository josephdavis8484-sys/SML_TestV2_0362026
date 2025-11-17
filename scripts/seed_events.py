#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

events_data = [
    {
        "id": str(uuid.uuid4()),
        "title": "Laugh Out Loud",
        "category": "Comedy",
        "image_url": "https://showmelive.online/uploads/events/68b49d20e24c7.png",
        "date": "March 15, 2025",
        "description": "Get ready for a night of non-stop laughter with the best comedians in town. An unforgettable evening of hilarious stand-up comedy that will have you rolling in the aisles.",
        "venue": "Comedy Central Theater",
        "price": 45.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Shoe Rating",
        "category": "Influencer",
        "image_url": "https://showmelive.online/uploads/events/68b4991971119.png",
        "date": "March 20, 2025",
        "description": "Join top sneaker influencers as they review and rate the latest shoe releases. Get exclusive insights into the hottest footwear trends.",
        "venue": "Fashion District Hall",
        "price": 30.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Classic Cars",
        "category": "Entertainment",
        "image_url": "https://showmelive.online/uploads/events/68b473d15c09a.png",
        "date": "April 5, 2025",
        "description": "Experience automotive history with a stunning collection of vintage and classic cars. Meet collectors and hear the stories behind these beautiful machines.",
        "venue": "Grand Exhibition Center",
        "price": 25.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "No Screen Recording",
        "category": "Influencer",
        "image_url": "https://showmelive.online/uploads/events/68b47227de13b.png",
        "date": "March 25, 2025",
        "description": "An exclusive live event experience where you have to be present to enjoy. No recordings, just pure authentic entertainment.",
        "venue": "Secret Location",
        "price": 55.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "TEST",
        "category": "Music",
        "image_url": "https://showmelive.online/uploads/events/68a8b48b22bca.jpg",
        "date": "April 10, 2025",
        "description": "A spectacular music festival featuring top artists from around the world. Multiple stages, incredible performances, and unforgettable moments.",
        "venue": "Downtown Arena",
        "price": 75.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Test 751",
        "category": "Comedy",
        "image_url": "https://showmelive.online/uploads/events/688657e9a6731.png",
        "date": "April 15, 2025",
        "description": "Comedy showcase featuring up-and-coming talent and established comedians. A perfect blend of fresh humor and classic comedy.",
        "venue": "Laugh Factory",
        "price": 35.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Admin Event Test",
        "category": "Sports",
        "image_url": "https://showmelive.online/uploads/event_posters/1753634707_event-planning.png",
        "date": "April 20, 2025",
        "description": "Watch the biggest sporting event of the season live. Intense competition, incredible athleticism, and unforgettable moments.",
        "venue": "Sports Complex Stadium",
        "price": 90.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Test 5",
        "category": "Entertainment",
        "image_url": "https://showmelive.online/uploads/events/6885403bb818e.png",
        "date": "May 1, 2025",
        "description": "An evening of entertainment featuring magic, music, and more. Perfect for the whole family.",
        "venue": "Entertainment Plaza",
        "price": 40.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Test 4",
        "category": "Music",
        "image_url": "https://showmelive.online/uploads/events/68853a18b7776.png",
        "date": "May 5, 2025",
        "description": "Live music concert featuring chart-topping artists. An electrifying performance you won't want to miss.",
        "venue": "Music Hall",
        "price": 65.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Test 3",
        "category": "Comedy",
        "image_url": "https://showmelive.online/uploads/events/688538d917be6.jpg",
        "date": "May 10, 2025",
        "description": "Comedy night with special surprise guests. Laughter guaranteed or your money back!",
        "venue": "Comedy Club Downtown",
        "price": 38.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Test 2",
        "category": "Sports",
        "image_url": "https://showmelive.online/uploads/events/688537ddd62dd.png",
        "date": "May 15, 2025",
        "description": "Championship finals - witness history in the making. The ultimate showdown between top competitors.",
        "venue": "National Stadium",
        "price": 120.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Classic Car Show",
        "category": "Entertainment",
        "image_url": "https://showmelive.online/uploads/event_posters/1756655593_Classic_Car.png",
        "date": "May 20, 2025",
        "description": "Rare and exotic car collection showcase. See vehicles you've only dreamed about up close.",
        "venue": "Auto Pavilion",
        "price": 28.00,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

async def seed_events():
    # Clear existing events
    await db.events.delete_many({})
    print("Cleared existing events")
    
    # Insert new events
    await db.events.insert_many(events_data)
    print(f"Inserted {len(events_data)} events")
    
    # Verify
    count = await db.events.count_documents({})
    print(f"Total events in database: {count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_events())