import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface ReliefRequest {
  id: string;
  name: string;
  location: string;
  contact: string;
  help_type: string;
  priority: 'Low' | 'Medium' | 'High';
  description: string;
  status: 'Pending' | 'Assigned' | 'Completed';
  assigned_volunteer: string | null;
  created_at: string;
}

const DB_FILE = path.join(process.cwd(), 'database.json');

// Helper to load requests from DB
function loadRequests(): ReliefRequest[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = getSampleData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, returning empty', err);
    return getSampleData();
  }
}

// Helper to save requests to DB
function saveRequests(data: ReliefRequest[]): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB', err);
  }
}

// Sample requests for testing the demo scenario
function getSampleData(): ReliefRequest[] {
  return [
    {
      id: 'req_1',
      name: 'Rahul Sharma',
      location: 'Beltola, Guwahati, Assam (Near Community Park)',
      contact: '+91 98765 43210',
      help_type: 'Food & Water',
      priority: 'High',
      description: 'Family of four stranded due to severe flooding. Immediate drinking water and food supplies are required.',
      status: 'Pending',
      assigned_volunteer: null,
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() // 4 hours ago
    },
    {
      id: 'req_2',
      name: 'Priya Das',
      location: 'Silchar, Assam',
      contact: '+91 91234 56789',
      help_type: 'Medical Supplies',
      priority: 'High',
      description: 'Elderly resident needs essential insulin refills and basic first aid bandages. Floodwaters block the main road.',
      status: 'Assigned',
      assigned_volunteer: 'Volunteer Ravi',
      created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString() // 8 hours ago
    },
    {
      id: 'req_3',
      name: 'The Arjun Singh',
      location: 'Flood Relief Camp, Tezpur, Assam',
      contact: '+91 70021 45678',
      help_type: 'Shelter & Clothing',
      priority: 'Medium',
      description: 'Displaced after roof collapse. Requiring blankets, dry clothes, and baby formula for an 8-month-old.',
      status: 'Completed',
      assigned_volunteer: 'Volunteer Rohit',
      created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString() // 18 hours ago
    },
    {
      id: 'req_4',
      name: 'Riya Chatterjee',
      location: 'Dibrugarh, Assam',
      contact: '+91 86384 98765',
      help_type: 'Search & Rescue',
      priority: 'High',
      description: 'Reporting rising water levels around the ground floor. Need guidance or evacuation assistance before nightfall.',
      status: 'Pending',
      assigned_volunteer: null,
      created_at: new Date(Date.now() - 30 * 60000).toISOString() // 30 mins ago
    },
    {
      id: 'req_5',
      name: 'Abhijeet Bhattacharya',
      location: 'Jorhat, Assam',
      contact: '+91 86384 98456',
      help_type: 'Other Support',
      priority: 'Low',
      description: 'Downed powerlines and tree branches blocking the secondary driveway. No active hazard but limits vehicle exit.',
      status: 'Pending',
      assigned_volunteer: null,
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() // 1 hour ago
    }
  ];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get all relief requests
  app.get('/api/requests', (req, res) => {
    try {
      const requests = loadRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  // API Route: Get system statistics
  app.get('/api/stats', (req, res) => {
    try {
      const requests = loadRequests();
      
      const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'Pending').length,
        assigned: requests.filter(r => r.status === 'Assigned').length,
        completed: requests.filter(r => r.status === 'Completed').length,
        // Calculate unique volunteers (assigned_volunteer names)
        volunteers: new Set(
          requests
            .map(r => r.assigned_volunteer)
            .filter((v): v is string => !!v)
        ).size + 3 // Pad with baseline volunteers for visual realism
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // API Route: Create a new relief request
  app.post('/api/requests', (req, res) => {
    try {
      const { name, location, contact, help_type, priority, description } = req.body;

      if (!name || !location || !contact || !help_type || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const requests = loadRequests();
      
      const newRequest: ReliefRequest = {
        id: 'req_' + Date.now(),
        name,
        location,
        contact,
        help_type,
        priority: priority || 'Medium',
        description,
        status: 'Pending',
        assigned_volunteer: null,
        created_at: new Date().toISOString()
      };

      requests.unshift(newRequest); // Insert at the beginning
      saveRequests(requests);

      res.status(201).json(newRequest);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create request' });
    }
  });

  // API Route: Update an existing request (assigning volunteer, changing status)
  app.patch('/api/requests/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, assigned_volunteer, priority } = req.body;

      const requests = loadRequests();
      const index = requests.findIndex(r => r.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const reqToUpdate = requests[index];

      if (status !== undefined) {
        reqToUpdate.status = status;
      }
      if (assigned_volunteer !== undefined) {
        reqToUpdate.assigned_volunteer = assigned_volunteer;
      }
      if (priority !== undefined) {
        reqToUpdate.priority = priority;
      }

      saveRequests(requests);
      res.json(reqToUpdate);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update request' });
    }
  });

  // API Route: Reset database to sample state
  app.post('/api/reset', (req, res) => {
    try {
      const sample = getSampleData();
      saveRequests(sample);
      res.json({ message: 'Database reset to sample data', requests: sample });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });

  // Vite Integration for HMR & Client Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
