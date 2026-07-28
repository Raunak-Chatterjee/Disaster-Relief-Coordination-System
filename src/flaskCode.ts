export interface CodeFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const FLASK_PROJECT_FILES: CodeFile[] = [
  {
    name: "database.py",
    path: "database.py",
    language: "python",
    description: "Database connection & SQLite initialization, creating request and user schemas, and seeding default sample data.",
    content: `import sqlite3
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
    print("Database initialization complete!")`
  },
  {
    name: "app.py",
    path: "app.py",
    language: "python",
    description: "Main Python Flask server defining Web templates paths, managing session auth guards, and performing SQL reads/writes.",
    content: `import os
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from database import init_db, get_db_connection

app = Flask(__name__)
app.secret_key = 'disaster_relief_secret_key_for_local_development'

# Initialize SQLite database on first app startup
init_db()

@app.route('/')
def index():
    """Portal Landing Page - redirects or offers navigation to portals."""
    return render_template('index.html')

@app.route('/victim', methods=['GET', 'POST'])
def victim_portal():
    """Victim Portal: Submission of new disaster support/aid requests."""
    if request.method == 'POST':
        name = request.form.get('name')
        location = request.form.get('location')
        contact = request.form.get('contact')
        help_type = request.form.get('help_type')
        priority = request.form.get('priority', 'Medium')
        description = request.form.get('description')

        if not name or not location or not contact or not help_type or not description:
            flash('All fields are required. Please fill in the full request form.', 'error')
            return redirect(url_for('victim_portal'))

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT INTO requests (name, location, contact, help_type, priority, description, status) 
                   VALUES (?, ?, ?, ?, ?, ?, 'Pending')''',
                (name, location, contact, help_type, priority, description)
            )
            conn.commit()
            conn.close()
            flash('Your aid request has been successfully submitted.', 'success')
            return redirect(url_for('victim_portal', success=True))
        except Exception as e:
            flash(f'An error occurred: {e}', 'error')
            return redirect(url_for('victim_portal'))

    return render_template('victim.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Simple login handler for Volunteers and Administrators."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        conn = get_db_connection()
        user = conn.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            (username, password)
        ).fetchone()
        conn.close()

        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            flash(f'Welcome back, {username}!', 'success')

            if user['role'] == 'Admin':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('volunteer_dashboard'))
        else:
            flash('Invalid username or password credentials.', 'error')
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/volunteer')
def volunteer_dashboard():
    if 'username' not in session or session.get('role') != 'Volunteer':
        flash('Please login as a Volunteer first.', 'error')
        return redirect(url_for('login'))

    username = session['username']
    search_query = request.args.get('search', '').strip()
    status_filter = request.args.get('status', 'All')

    conn = get_db_connection()
    query = 'SELECT * FROM requests WHERE 1=1'
    params = []

    if status_filter != 'All':
        query += ' AND status = ?'
        params.append(status_filter)

    if search_query:
        query += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ?)'
        like_pattern = f'%{search_query}%'
        params.extend([like_pattern, like_pattern, like_pattern])

    query += ' ORDER BY created_at DESC'
    requests_list = conn.execute(query, params).fetchall()
    conn.close()

    return render_template('volunteer.html', requests=requests_list, search=search_query, current_status=status_filter, username=username)

@app.route('/volunteer/update/<int:request_id>', methods=['POST'])
def update_request_status(request_id):
    if 'username' not in session or session.get('role') != 'Volunteer':
        return redirect(url_for('login'))

    action = request.form.get('action')
    volunteer_name = session['username']

    conn = get_db_connection()
    if action == 'accept':
        conn.execute(
            'UPDATE requests SET status = "Assigned", assigned_volunteer = ? WHERE id = ?',
            (volunteer_name, request_id)
        )
        flash('Request assigned to you successfully.', 'success')
    elif action == 'complete':
        conn.execute(
            'UPDATE requests SET status = "Completed" WHERE id = ?',
            (request_id,)
        )
        flash('Request completed successfully.', 'success')

    conn.commit()
    conn.close()
    return redirect(url_for('volunteer_dashboard'))

@app.route('/admin')
def admin_dashboard():
    if 'username' not in session or session.get('role') != 'Admin':
        flash('Please login as an Admin.', 'error')
        return redirect(url_for('login'))

    search_query = request.args.get('search', '').strip()
    status_filter = request.args.get('status', 'All')

    conn = get_db_connection()
    total_reqs = conn.execute('SELECT COUNT(*) FROM requests').fetchone()[0]
    pending_reqs = conn.execute('SELECT COUNT(*) FROM requests WHERE status = "Pending"').fetchone()[0]
    assigned_reqs = conn.execute('SELECT COUNT(*) FROM requests WHERE status = "Assigned"').fetchone()[0]
    completed_reqs = conn.execute('SELECT COUNT(*) FROM requests WHERE status = "Completed"').fetchone()[0]
    total_volunteers = conn.execute('SELECT COUNT(*) FROM users WHERE role = "Volunteer"').fetchone()[0]

    query = 'SELECT * FROM requests WHERE 1=1'
    params = []

    if status_filter != 'All':
        query += ' AND status = ?'
        params.append(status_filter)

    if search_query:
        query += ' AND (name LIKE ? OR location LIKE ?)'
        like_pattern = f'%{search_query}%'
        params.extend([like_pattern, like_pattern])

    query += ' ORDER BY created_at DESC'
    requests_list = conn.execute(query, params).fetchall()
    conn.close()

    stats = {
        'total': total_reqs, 'pending': pending_reqs, 'assigned': assigned_reqs,
        'completed': completed_reqs, 'volunteers': total_volunteers
    }

    return render_template('admin.html', stats=stats, requests=requests_list, search=search_query, current_status=status_filter)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)`
  },
  {
    name: "templates/base.html",
    path: "templates/base.html",
    language: "html",
    description: "Global site header navigation, responsive visual elements, and flashing action alerts.",
    content: `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Disaster Relief Coordination Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        h1, h2, h3 { font-family: 'Outfit', sans-serif; }
    </style>
</head>
<body class="flex flex-col h-full">
    <nav class="bg-slate-900 text-white py-4 shadow-md">
        <div class="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <a href="/" class="font-bold text-lg flex items-center gap-2">
                <span class="p-1.5 bg-rose-600 rounded text-xs font-mono">Disaster Relief Coordination System</span>
                <span>Relief Grid</span>
            </a>
            <div class="flex items-center gap-4 text-sm">
                <a href="/victim" class="hover:text-slate-300">Victim Portal</a>
                {% if session.get('username') %}
                    <span class="text-slate-400 font-mono">{{ session['username'] }}</span>
                    <a href="/logout" class="bg-slate-800 px-3 py-1.5 rounded">Logout</a>
                {% else %}
                    <a href="/login" class="bg-rose-600 px-3 py-1.5 rounded">Login</a>
                {% endif %}
            </div>
        </div>
    </nav>

    {% with messages = get_flashed_messages(with_categories=true) %}
        {% if messages %}
            <div class="max-w-7xl mx-auto px-4 mt-4">
                {% for category, msg in messages %}
                    <div class="p-3 rounded border {% if category == 'error' %}bg-rose-50 border-rose-200 text-rose-800{% else %}bg-emerald-50 border-emerald-200 text-emerald-800{% endif %} text-xs font-semibold">
                        {{ msg }}
                    </div>
                {% endfor %}
            </div>
        {% endif %}
    {% endwith %}

    <main class="flex-grow max-w-7xl w-full mx-auto px-4 py-8">
        {% block content %}{% endblock %}
    </main>

    <footer class="bg-white border-t py-4 text-center text-xs text-slate-400">
        &copy; 2026 Disaster Relief Coordination Platform. Built with Flask & SQLite.
    </footer>
</body>
</html>`
  },
  {
    name: "templates/victim.html",
    path: "templates/victim.html",
    language: "html",
    description: "Self-assessed urgency levels, location landmarks, and full-description forms for rescue/aid coordination.",
    content: `{% extends 'base.html' %}
{% block content %}
<div class="max-w-xl mx-auto bg-white p-6 rounded-xl border">
    <h2 class="text-2xl font-bold mb-4">Request Disaster Assistance</h2>
    <p class="text-xs text-slate-500 mb-6">Your request will be visible immediately to coordinators and rescue volunteers.</p>

    {% if request.args.get('success') %}
        <div class="p-4 bg-emerald-50 border text-emerald-800 text-xs rounded mb-4">
            Thank you! Your request was received.
        </div>
    {% endif %}

    <form action="/victim" method="POST" class="space-y-4 text-sm">
        <div>
            <label class="block font-bold mb-1">Full Name</label>
            <input type="text" name="name" required class="w-full p-2 border rounded">
        </div>
        <div>
            <label class="block font-bold mb-1">Exact Location</label>
            <input type="text" name="location" required class="w-full p-2 border rounded">
        </div>
        <div>
            <label class="block font-bold mb-1">Contact Phone</label>
            <input type="text" name="contact" required class="w-full p-2 border rounded">
        </div>
        <div>
            <label class="block font-bold mb-1">Help Needed Type</label>
            <select name="help_type" required class="w-full p-2 border rounded">
                <option value="Food & Water">Food & Water</option>
                <option value="Medical Supplies">Medical Supplies</option>
                <option value="Shelter & Clothing">Shelter & Clothing</option>
                <option value="Search & Rescue">Search & Rescue</option>
            </select>
        </div>
        <div>
            <label class="block font-bold mb-1">Urgency Priority</label>
            <select name="priority" class="w-full p-2 border rounded">
                <option value="High">High</option>
                <option value="Medium" selected>Medium</option>
                <option value="Low">Low</option>
            </select>
        </div>
        <div>
            <label class="block font-bold mb-1">Specific Needs Description</label>
            <textarea name="description" rows="3" required class="w-full p-2 border rounded"></textarea>
        </div>
        <button type="submit" class="w-full bg-rose-600 text-white font-bold py-2 rounded">Submit Help Request</button>
    </form>
</div>
{% endblock %}`
  },
  {
    name: "templates/volunteer.html",
    path: "templates/volunteer.html",
    language: "html",
    description: "Responder command console enabling task claims, status tracking, and details lookup.",
    content: `{% extends 'base.html' %}
{% block content %}
<div class="space-y-6">
    <div class="bg-slate-900 text-white p-4 rounded flex justify-between items-center">
        <div>
            <h2 class="text-xl font-bold">Volunteer Dashboard</h2>
            <p class="text-xs text-slate-400">Responder ID: {{ username }}</p>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {% for r in requests %}
            <div class="border p-4 rounded bg-white flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{{ r.help_type }}</span>
                        <span class="text-xs font-semibold uppercase {% if r.priority == 'High' %}text-rose-600{% else %}text-amber-600{% endif %}">{{ r.priority }}</span>
                    </div>
                    <h3 class="font-bold text-slate-900 text-base mt-2">{{ r.name }}</h3>
                    <p class="text-xs text-slate-500 mt-1">📍 {{ r.location }}</p>
                    <p class="text-xs text-slate-600 font-mono mt-1">📞 {{ r.contact }}</p>
                    <p class="text-xs bg-slate-50 p-2.5 rounded mt-3 text-slate-700">{{ r.description }}</p>
                </div>
                <div class="mt-4 pt-3 border-t flex justify-between items-center text-xs">
                    <span class="text-slate-400 font-mono">Status: {{ r.status }}</span>
                    {% if r.status == 'Pending' %}
                        <form action="/volunteer/update/{{ r.id }}" method="POST">
                            <input type="hidden" name="action" value="accept">
                            <button type="submit" class="bg-slate-900 text-white px-3 py-1 rounded">Claim Mission</button>
                        </form>
                    {% elif r.status == 'Assigned' and r.assigned_volunteer == username %}
                        <form action="/volunteer/update/{{ r.id }}" method="POST">
                            <input type="hidden" name="action" value="complete">
                            <button type="submit" class="bg-emerald-600 text-white px-3 py-1 rounded">Mark Complete</button>
                        </form>
                    {% else %}
                        <span class="text-slate-400">Assigned: {{ r.assigned_volunteer }}</span>
                    {% endif %}
                </div>
            </div>
        {% endfor %}
    </div>
</div>
{% endblock %}`
  },
  {
    name: "templates/admin.html",
    path: "templates/admin.html",
    language: "html",
    description: "Incidents command matrix with logistics metrics blocks and interactive search/filter tables.",
    content: `{% extends 'base.html' %}
{% block content %}
<div class="space-y-6 text-sm">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-2xl font-bold font-display">Command & Dispatch</h2>
            <p class="text-xs text-slate-500">Monitor and manage disaster relief requests in real time.</p>
        </div>
        <form action="/admin/reset-db" method="POST">
            <button type="submit" class="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded">Reset Database</button>
        </form>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="border p-4 rounded bg-white">
            <span class="text-slate-400 text-xs block font-mono">Total</span>
            <span class="text-2xl font-bold">{{ stats.total }}</span>
        </div>
        <div class="border p-4 rounded bg-white">
            <span class="text-slate-400 text-xs block font-mono">Pending</span>
            <span class="text-2xl font-bold text-amber-500">{{ stats.pending }}</span>
        </div>
        <div class="border p-4 rounded bg-white">
            <span class="text-slate-400 text-xs block font-mono">Assigned</span>
            <span class="text-2xl font-bold text-sky-500">{{ stats.assigned }}</span>
        </div>
        <div class="border p-4 rounded bg-white">
            <span class="text-slate-400 text-xs block font-mono">Completed</span>
            <span class="text-2xl font-bold text-emerald-500">{{ stats.completed }}</span>
        </div>
        <div class="border p-4 rounded bg-white">
            <span class="text-slate-400 text-xs block font-mono">Volunteers</span>
            <span class="text-2xl font-bold text-indigo-500">{{ stats.volunteers }}</span>
        </div>
    </div>

    <!-- Table logs -->
    <div class="bg-white border rounded overflow-hidden">
        <table class="w-full text-left">
            <thead class="bg-slate-100 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                    <th class="p-3">ID</th>
                    <th class="p-3">Recipient</th>
                    <th class="p-3">Location</th>
                    <th class="p-3">Priority</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Responder</th>
                </tr>
            </thead>
            <tbody class="divide-y text-xs">
                {% for r in requests %}
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono">#{{ r.id }}</td>
                    <td class="p-3 font-bold">{{ r.name }}</td>
                    <td class="p-3">{{ r.location }}</td>
                    <td class="p-3">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase {% if r.priority == 'High' %}bg-rose-50 text-rose-700{% else %}bg-slate-100{% endif %}">{{ r.priority }}</span>
                    </td>
                    <td class="p-3">
                        <span class="px-2 py-0.5 rounded-full font-bold text-[10px] {% if r.status == 'Pending' %}bg-amber-100 text-amber-800{% elif r.status == 'Assigned' %}bg-sky-100 text-sky-800{% else %}bg-emerald-100 text-emerald-800{% endif %}">{{ r.status }}</span>
                    </td>
                    <td class="p-3 font-mono font-medium text-slate-600">{{ r.assigned_volunteer or 'None' }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
</div>
{% endblock %}`
  },
  {
    name: "requirements.txt",
    path: "requirements.txt",
    language: "text",
    description: "Defines package names and specific versioning metrics for simple deployment.",
    content: `Flask==3.0.3`
  }
];
