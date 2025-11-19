const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

// 1. CREATE PROJECT
router.post("/", async (req, res) => {
  const { projectCollection, userCollection } = req.db;
  const { title, description, teamId, email } = req.body; // GET EMAIL

  try {
    const user = await userCollection.findOne({ email: email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newProject = {
      title, description,
      teamId: new ObjectId(teamId),
      ownerId: user._id,
      createdAt: new Date(),
    };
    const result = await projectCollection.insertOne(newProject);
    res.status(201).json({ message: "Project created", projectId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET PROJECTS
router.get("/", async (req, res) => {
  const { projectCollection, userCollection } = req.db;
  const email = req.query.email; // GET EMAIL

  try {
    if(!email) return res.json([]);
    
    const user = await userCollection.findOne({ email: email });
    if (!user) return res.json([]);

    const projects = await projectCollection.aggregate([
      { $match: { ownerId: user._id } },
      { $lookup: { from: "teams", localField: "teamId", foreignField: "_id", as: "team" } },
      { $unwind: "$team" }
    ]).toArray();
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 3. GET SINGLE PROJECT
router.get("/:id", async (req, res) => {
  const { projectCollection } = req.db;
  try {
    const project = await projectCollection.aggregate([
      { $match: { _id: new ObjectId(req.params.id) }},
      { $lookup: { from: "teams", localField: "teamId", foreignField: "_id", as: "team" } },
      { $unwind: "$team" }
    ]).next();
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;