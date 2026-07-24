import os
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
            flash('Your aid request has been successfully submitted. Relief personnel will coordinate with you shortly.', 'success')
            return redirect(url_for('victim_portal', success=True))
        except Exception as e:
            flash(f'An error occurred while saving your request: {e}', 'error')
            return redirect(url_for('victim_portal'))

    # If GET request, render the victim form template
    return render_template('victim.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Simple login handler for Volunteers and Administrators."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if not username or not password:
            flash('Please enter both username and password.', 'error')
            return redirect(url_for('login'))

        conn = get_db_connection()
        user = conn.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            (username, password)
        ).fetchone()
        conn.close()

        if user:
            # Save user session
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            flash(f'Welcome back, {username}! Logged in as {user["role"]}.', 'success')

            # Route appropriately
            if user['role'] == 'Admin':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('volunteer_dashboard'))
        else:
            flash('Invalid username or password credentials. Please try again.', 'error')
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    """Logs out active sessions."""
    session.clear()
    flash('You have been successfully logged out of the portal.', 'info')
    return redirect(url_for('index'))

@app.route('/volunteer', methods=['GET', 'POST'])
def volunteer_dashboard():
    """Volunteer Dashboard: View pending aid and claim/fulfill active assignments."""
    # Auth guard for Volunteers
    if 'username' not in session or session.get('role') != 'Volunteer':
        flash('Please login as a Volunteer to access this dashboard.', 'error')
        return redirect(url_for('login'))

    username = session['username']
    search_query = request.args.get('search', '').strip()
    status_filter = request.args.get('status', 'All')

    conn = get_db_connection()
    
    # Base SQL query
    query = 'SELECT * FROM requests WHERE 1=1'
    params = []

    if status_filter != 'All':
        query += ' AND status = ?'
        params.append(status_filter)

    if search_query:
        query += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ? OR help_type LIKE ?)'
        like_pattern = f'%{search_query}%'
        params.extend([like_pattern, like_pattern, like_pattern, like_pattern])

    # Order requests: pending first, then by priority, then by creation date
    query += ' ORDER BY CASE status WHEN "Pending" THEN 1 WHEN "Assigned" THEN 2 ELSE 3 END, CASE priority WHEN "High" THEN 1 WHEN "Medium" THEN 2 ELSE 3 END, created_at DESC'
    
    requests_list = conn.execute(query, params).fetchall()
    conn.close()

    return render_template('volunteer.html', requests=requests_list, search=search_query, current_status=status_filter, username=username)

@app.route('/volunteer/update/<int:request_id>', methods=['POST'])
def update_request_status(request_id):
    """Processes volunteer actions: accepting a task or completing it."""
    if 'username' not in session or session.get('role') != 'Volunteer':
        flash('Unauthorized operation.', 'error')
        return redirect(url_for('login'))

    action = request.form.get('action') # 'accept' or 'complete'
    volunteer_name = session['username']

    conn = get_db_connection()
    req = conn.execute('SELECT * FROM requests WHERE id = ?', (request_id,)).fetchone()

    if not req:
        conn.close()
        flash('Relief request not found.', 'error')
        return redirect(url_for('volunteer_dashboard'))

    if action == 'accept':
        if req['status'] != 'Pending':
            flash('This request has already been claimed.', 'error')
        else:
            conn.execute(
                'UPDATE requests SET status = "Assigned", assigned_volunteer = ? WHERE id = ?',
                (volunteer_name, request_id)
            )
            conn.commit()
            flash(f'Request #{request_id} has been assigned to you. Move quickly to assist.', 'success')
    
    elif action == 'complete':
        if req['assigned_volunteer'] != volunteer_name:
            flash('You can only complete tasks assigned to you.', 'error')
        else:
            conn.execute(
                'UPDATE requests SET status = "Completed" WHERE id = ?',
                (request_id,)
            )
            conn.commit()
            flash(f'Thank you! Request #{request_id} has been marked as Completed.', 'success')

    conn.close()
    return redirect(url_for('volunteer_dashboard'))

@app.route('/admin')
def admin_dashboard():
    """Admin Dashboard: High-level analytics cards, filtering tables, and resets."""
    # Auth guard for Admins
    if 'username' not in session or session.get('role') != 'Admin':
        flash('Please login as an Administrator to access this dashboard.', 'error')
        return redirect(url_for('login'))

    search_query = request.args.get('search', '').strip()
    status_filter = request.args.get('status', 'All')
    priority_filter = request.args.get('priority', 'All')

    conn = get_db_connection()

    # Calculate real-time analytics
    total_reqs = conn.execute('SELECT COUNT(*) FROM requests').fetchone()[0]
    pending_reqs = conn.execute('SELECT COUNT(*) FROM requests WHERE status = "Pending"').fetchone()[0]
    assigned_reqs = conn.execute('SELECT COUNT(*) FROM requests WHERE status = "Assigned"').fetchone()[0]
    completed_reqs = conn.execute('SELECT COUNT(*) FROM requests WHERE status = "Completed"').fetchone()[0]
    
    # Count unique active volunteer accounts
    total_volunteers = conn.execute('SELECT COUNT(*) FROM users WHERE role = "Volunteer"').fetchone()[0]

    # Pull request logs with filters
    query = 'SELECT * FROM requests WHERE 1=1'
    params = []

    if status_filter != 'All':
        query += ' AND status = ?'
        params.append(status_filter)

    if priority_filter != 'All':
        query += ' AND priority = ?'
        params.append(priority_filter)

    if search_query:
        query += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ? OR help_type LIKE ?)'
        like_pattern = f'%{search_query}%'
        params.extend([like_pattern, like_pattern, like_pattern, like_pattern])

    query += ' ORDER BY created_at DESC'
    requests_list = conn.execute(query, params).fetchall()
    conn.close()

    # Packaging metrics
    stats = {
        'total': total_reqs,
        'pending': pending_reqs,
        'assigned': assigned_reqs,
        'completed': completed_reqs,
        'volunteers': total_volunteers
    }

    return render_template(
        'admin.html',
        stats=stats,
        requests=requests_list,
        search=search_query,
        current_status=status_filter,
        current_priority=priority_filter
    )

@app.route('/admin/reset-db', methods=['POST'])
def admin_reset_db():
    """Utility route to reset the SQLite database back to its default clean seeded state."""
    if 'username' not in session or session.get('role') != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        if os.path.exists('disaster_relief.db'):
            os.remove('disaster_relief.db')
        init_db()
        flash('SQLite Database has been fully reset to its default testing sample state.', 'success')
        return redirect(url_for('admin_dashboard'))
    except Exception as e:
        flash(f'Failed to reset database: {e}', 'error')
        return redirect(url_for('admin_dashboard'))

if __name__ == '__main__':
    # Local running server configuration
    app.run(host='0.0.0.0', port=5000, debug=True)
