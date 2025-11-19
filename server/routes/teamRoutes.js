const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

// 1. CREATE TEAM (Expects { name, email })
router.post("/", async (req, res) => {
  const { teamCollection, userCollection } = req.db;
  const { name, email } = req.body; // GET EMAIL FROM BODY

  try {
    // Find the user ID based on the email sent
    const user = await userCollection.findOne({ email: email });
    
    if (!user) {
        // Fallback if user not found (prevents crash)
        return res.status(404).json({ message: "User not found in DB" });
    }

    const newTeam = {
      name,
      ownerId: user._id, // Use the ID we found
      members: [], 
      createdAt: new Date(),
    };

    const result = await teamCollection.insertOne(newTeam);
    res.status(201).json({ message: "Team created", teamId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET TEAMS (Expects ?email=user@example.com)
router.get("/", async (req, res) => {
  const { teamCollection, userCollection } = req.db;
  const email = req.query.email; // GET EMAIL FROM URL

  try {
    if(!email) return res.json([]); // No email? Return empty

    const user = await userCollection.findOne({ email: email });
    if (!user) return res.json([]); // User not found? Return empty

    const teams = await teamCollection.find({ ownerId: user._id }).toArray();
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 3. ADD MEMBER
router.post("/:id/members", async (req, res) => {
  const { teamCollection } = req.db;
  const { name, role, capacity } = req.body;

  try {
    const newMember = {
      id: new ObjectId(),
      name, role, capacity: parseInt(capacity),
    };

    // Simplified: Just add to the team ID, don't check owner
    await teamCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { members: newMember } }
    );

    res.status(200).json({ message: "Member added" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;