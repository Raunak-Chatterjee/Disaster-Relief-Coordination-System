import sqlite3
import os
from datetime import datetime

DATABASE_NAME = 'disaster_relief.db'

def get_db_connection():
    """Establishes an SQLite database connection with row factory enabled."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schema and seeds sample testing data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Create requests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            contact TEXT NOT NULL,
            help_type TEXT NOT NULL,
            priority TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            assigned_volunteer TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Create users table for simple authentication
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')

    # Commit tables before checking seed state
    conn.commit()

    # 3. Seed users if table is empty
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        # Seed an admin and volunteers
        users_seed = [
            ('admin', 'admin123', 'Admin'),
            ('volunteer1', 'volunteer123', 'Volunteer'),
            ('volunteer2', 'volunteer123', 'Volunteer')
        ]
        cursor.executemany(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            users_seed
        )
        print("Users table seeded successfully!")

    # 4. Seed requests if table is empty
    cursor.execute('SELECT COUNT(*) FROM requests')
    if cursor.fetchone()[0] == 0:
        requests_seed = [
            (
                'Rahul Sharma',
                'Beltola, Guwahati, Assam (Near Community Park)',
                '+91 98765 43210',
                'Food & Water',
                'High',
                'Family of four stranded due to severe flooding. Immediate drinking water and food supplies are required.',
                'Pending',
                None
            ),
            (
                'Priya Das',
                'Silchar, Assam',
                '+91 91234 56789',
                'Medical Supplies',
                'High',
                'Elderly resident needs essential insulin refills and basic first aid bandages. Floodwaters block the main road.',
                'Assigned',
                'volunteer1'
            ),
            (
                'The Arjun Singh',
                'Flood Relief Camp, Tezpur, Assam',
                '+91 70021 45678',
                'Shelter & Clothing',
                'Medium',
                'Displaced after roof collapse. Requiring blankets, dry clothes, and baby formula for an 8-month-old.',
                'Completed',
                'volunteer2'
            ),
            (
                'Riya Chatterjee',
                'Dibrugarh, Assam',
                '+91 86384 98765',
                'Search & Rescue',
                'High',
                'Reporting rising water levels around the ground floor. Need guidance or evacuation assistance before nightfall.',
                'Pending',
                None
            ),
            (
                'Abhijeet Bhattacharya',
                'Jorhat, Assam',
                '+91 86384 98456',
                'Other Support',
                'Low',
                'Downed powerlines and tree branches blocking the secondary driveway. No active hazard but limits vehicle exit.',
                'Pending',
                None
            )
        ]
        cursor.executemany(
            '''INSERT INTO requests 
               (name, location, contact, help_type, priority, description, status, assigned_volunteer) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            requests_seed
        )
        print("Requests table seeded successfully!")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    print("Initializing local database...")
    init_db()
    print("Database initialization complete!")
