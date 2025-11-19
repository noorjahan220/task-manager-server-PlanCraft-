const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

// GET STATS
router.get("/stats", async (req, res) => {
  const { projectCollection, taskCollection, logCollection, userCollection } = req.db;
  const email = req.query.email; 

  try {
    if (!email) return res.json({});
    
    // 1. Find User
    const user = await userCollection.findOne({ email });
    if (!user) return res.json({});

    // 2. Get Projects
    const totalProjects = await projectCollection.countDocuments({ ownerId: user._id });
    const projects = await projectCollection.find({ ownerId: user._id }).toArray();
    const projectIds = projects.map(p => p._id);

    // 3. Get Total Tasks
    const totalTasks = await taskCollection.countDocuments({ projectId: { $in: projectIds } });

    // 4. CALCULATE WORKLOAD (Aggregation)
    // This groups tasks by the 'assignedTo' field and counts them
    const workload = await taskCollection.aggregate([
      { $match: { projectId: { $in: projectIds } } }, // Only look at tasks in this user's projects
      { $group: { 
          _id: "$assignedTo",  // Group by person name/email
          count: { $sum: 1 }   // Count how many tasks they have
      }}
    ]).toArray();

    // 5. GET LOGS
    // Fetch the last 10 logs related to this user (or their projects)
    // Note: Ensure you are actually inserting into logCollection elsewhere in your app
    const logs = await logCollection.find({ ownerId: user._id }) 
        .sort({ date: -1 }) // Sort by newest
        .limit(10)
        .toArray();

    // SEND THE ACTUAL DATA (Not empty arrays)
    res.json({ 
        totalProjects, 
        totalTasks, 
        workload: workload, // <--- Sending actual workload data
        logs: logs          // <--- Sending actual logs
    });

  } catch (error) { 
      console.error("Stats Error:", error);
      res.status(500).json({ message: "Error fetching stats" }); 
  }
});

// REBALANCE WORKLOAD
router.post("/rebalance", async (req, res) => {
    const { taskCollection, projectCollection, userCollection, logCollection } = req.db;
    const { email } = req.body;

    try {
        const user = await userCollection.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // 1. Get all tasks for this user's projects that are Pending
        const projects = await projectCollection.find({ ownerId: user._id }).toArray();
        const projectIds = projects.map(p => p._id);

        const tasks = await taskCollection.find({ 
            projectId: { $in: projectIds },
            status: { $ne: "Completed" } // Don't reassign completed tasks
        }).toArray();

        if (tasks.length === 0) return res.json({ message: "No tasks to rebalance" });

        // 2. Get Team Members from the projects
        // (Simplified: We assume assignedTo strings are members. 
        // In a real app, you'd query the Team collection. Here we just shuffle).
        
        // Get unique list of people currently assigned
        const uniqueMembers = [...new Set(tasks.map(t => t.assignedTo).filter(n => n))];
        
        if (uniqueMembers.length < 2) return res.json({ message: "Not enough members to rebalance" });

        // 3. Simple Round-Robin Reassignment
        let memberIndex = 0;
        for (const task of tasks) {
            const newAssignee = uniqueMembers[memberIndex];
            
            await taskCollection.updateOne(
                { _id: task._id },
                { $set: { assignedTo: newAssignee } }
            );

            memberIndex = (memberIndex + 1) % uniqueMembers.length;
        }

        // 4. Create a Log entry so it shows up in the dashboard
        await logCollection.insertOne({
            message: `Rebalanced ${tasks.length} tasks among ${uniqueMembers.length} members`,
            action: "Rebalance",
            ownerId: user._id,
            date: new Date()
        });

        res.json({ message: "Workload rebalanced successfully" });

    } catch (error) {
        console.error("Rebalance Error:", error);
        res.status(500).json({ message: "Server error during rebalance" });
    }
});

module.exports = router;