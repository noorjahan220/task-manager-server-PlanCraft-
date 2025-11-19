const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

// CREATE TASK
router.post("/", async (req, res) => {
  const { taskCollection } = req.db;
  const { projectId, title, description, assignedTo, priority, status } = req.body;

  try {
    const newTask = {
      projectId: new ObjectId(projectId),
      title, description, assignedTo, priority, status: status || "Pending",
      createdAt: new Date()
    };
    const result = await taskCollection.insertOne(newTask);
    res.status(201).json({ message: "Task created", taskId: result.insertedId });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// GET TASKS
router.get("/project/:projectId", async (req, res) => {
  const { taskCollection } = req.db;
  try {
    const tasks = await taskCollection.find({ projectId: new ObjectId(req.params.projectId) }).toArray();
    res.status(200).json(tasks);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// Change router.patch to router.put
router.put("/:id", async (req, res) => {
  const { taskCollection } = req.db;
  const { status } = req.body;
  
  // Log to prove the server received it
  console.log(`Received UPDATE for ${req.params.id} -> ${status}`);

  try {
    // Validations...
    const result = await taskCollection.updateOne(
        { _id: new ObjectId(req.params.id) }, 
        { $set: { status: status } }
    );
    res.status(200).json({ message: "Updated" });
  } catch (error) { 
    res.status(500).json({ message: "Error" }); 
  }
});
// --- NEW: DELETE TASK API ---
router.delete("/:id", async (req, res) => {
  const { taskCollection } = req.db;
  const { id } = req.params;

  try {
    const query = { _id: new ObjectId(id) };
    const result = await taskCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task deleted successfully", result });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Error deleting task" });
  }
});

module.exports = router;