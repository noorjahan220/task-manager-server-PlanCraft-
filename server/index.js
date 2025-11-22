const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

/// --- FIX STARTS HERE ---
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://smart-task-manager-server-delta.vercel.app'
    
  ],
  credentials: true,
  optionSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] // <--- PATCH MUST BE HERE
};

app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rq93w.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const db = client.db("smart-task-manager-db");
        
        const userCollection = db.collection("users");
        const teamCollection = db.collection("teams");
        const projectCollection = db.collection("projects");
        const taskCollection = db.collection("tasks");
        const logCollection = db.collection("logs");

        // Inject DB into request
        app.use((req, res, next) => {
            req.db = {
                userCollection, teamCollection, projectCollection, taskCollection, logCollection
            };
            next();
        });

        app.get('/', (req, res) => {
            res.send('Server is running (No Security Mode)');
        });

        // ---------------------------------------------------------
        // ROUTES (Directly linked, no verifyUser middleware)
        // ---------------------------------------------------------
        app.use('/api/users', require('./routes/userRoutes'));
        app.use("/api/teams", require("./routes/teamRoutes"));
        app.use("/api/projects", require("./routes/projectRoutes"));
    const taskRoutes = require("./routes/taskRoutes"); // Adjust path if needed
app.use("/api/tasks", taskRoutes);
        app.use("/api/dashboard", require("./routes/dashboardRoutes"));

        console.log("Connected to MongoDB!");
        app.listen(port, () => {
            console.log(`Server running on port: ${port}`);
        });

    } finally {}
}
run().catch(console.dir);