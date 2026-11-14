from app.database import init_db, seed_data

if __name__ == "__main__":
    init_db()
    seed_data()
    print("Database initialized and seeded.")
