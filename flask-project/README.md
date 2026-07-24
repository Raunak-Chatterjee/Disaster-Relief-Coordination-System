# Disaster Relief Coordination Platform (RESQUE)

An engineering mini-project demonstrating a fully integrated **Disaster Relief Coordination System** built using **Python Flask**, **SQLite3**, and **Tailwind CSS**.

---

## 🚀 Key Features

1. **Victim Portal**: Submit real-time support requests with locations, categories, description, and contact info. No signup required.
2. **Volunteer Portal**: Securely view, filter, and search active requests. Volunteers can claim tasks (status becomes `Assigned`) and mark them as `Completed` upon delivery of aid.
3. **Incident Command Center (Admin)**: Detailed KPI dashboards showcasing real-time counts, high-resolution filter tables, and a database-reset button for mock demonstrations.
4. **SQLite Integration**: Schema tables are created and seeded automatically upon first run.

---

## 📂 Project Structure

```text
flask-project/
│
├── app.py              # Main Flask server entry point (routes, controllers, and sessions)
├── database.py         # SQLite database management (schemas, tables creation, and data seeds)
├── requirements.txt    # Python dependency manifest
├── README.md           # Local setup and scenario walkthrough instructions (This file!)
│
├── templates/          # HTML Templates (Jinja2)
│   ├── base.html       # Base template with responsive navbar, flash alerts, and tailwind integrations
│   ├── index.html      # Central dispatcher landing page
│   ├── victim.html     # Assistance submission portal
│   ├── volunteer.html  # Claiming and updating system for active responders
│   ├── admin.html      # Logistics dashboard and audit logs
│   └── login.html      # Portal login for Volunteers and Administrators
```

---

## 🛠️ Local Installation & Running Guide

### Prerequisite
Ensure you have **Python 3.8+** installed on your computer. You can check this by running `python --version` (or `python3 --version`) in your terminal.

### Step 1: Extract or Navigate to the Folder
Open your command terminal (Command Prompt, Terminal, or PowerShell) and change directories (`cd`) into the `flask-project` workspace root.

### Step 2: Create a Virtual Environment (Recommended)
This keeps your system's python dependencies separated:
```bash
# On macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# On Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 3: Install Required Dependencies
Install the required packages declared in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### Step 4: Initialize the SQLite Database
Initialize tables and pre-populate them with realistic sample data:
```bash
python database.py
```
*Note: This creates a file named `disaster_relief.db` in your folder. The Flask server also initializes this automatically if it doesn't exist.*

### Step 5: Start the Flask Dev Server
Start the local server by executing:
```bash
python app.py
```

### Step 6: Explore in the Browser
Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 🔑 Default Credentials for Evaluators

For fast evaluation of the project, use the pre-seeded testing accounts below:

| Portal / Role | Username | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` |
| **Volunteer (First Responder)** | `volunteer1` | `volunteer123` |
| **Volunteer (Backup Responder)** | `volunteer2` | `volunteer123` |

---

## 🎯 Demo Scenario Walkthrough (Step-by-Step)

The project includes a unified scenario that showcases full-stack SQLite transactional loops:

1. **Submit Distress Form**:
   - Go to `http://127.0.0.1:5000/victim`.
   - Submit a request under Name: **"Sarah Jenkins"**, Location: **"Sector 4, West End"**, Help Type: **"Food & Water"**, Priority: **"High"**.
   - Press **"Submit Assistance Request"**. A success message will appear, and a new record will be safely inserted into the SQLite `requests` table with status **Pending**.

2. **Claim Request (Volunteer Role)**:
   - Click **"Portal Login"** in the navbar and log in with username `volunteer1` and password `volunteer123`.
   - You will be redirected to the **Volunteer Dispatch Grid**.
   - Notice the **Sarah Jenkins** food request has appeared. Click **"Accept & Claim Task"**.
   - The task moves to the assigned section. The backend queries SQLite and sets the request status to **Assigned**, linking the volunteer handle `volunteer1` as the owner.

3. **Fulfill & Complete Request**:
   - Deliver the supplies. When finished, press **"Mark as Completed"** next to her card.
   - The card status transitions to **Completed** in real-time.

4. **Verify on Admin Panel**:
   - Log out of your volunteer session, then click **"Portal Login"** again.
   - Sign in using administrator credentials (`admin` / `admin123`).
   - Observe the live KPI counter update automatically. You will see **Sarah Jenkins**' request registered as **Completed**, with full logs visible inside the admin requests logs table!
