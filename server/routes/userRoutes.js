const express = require("express");
const router = express.Router();

// 1. SYNC USER (Create if not exists)
// URL: POST /api/users
router.post("/", async (req, res) => {
  const { userCollection } = req.db;
  const { name, email } = req.body;

  if (!email) {
      return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if user exists
    const existingUser = await userCollection.findOne({ email: email });
    
    if (existingUser) {
      return res.status(200).json(existingUser);
    }

    // If not, create new user
    const newUser = {
      name: name || "User",
      email,
      createdAt: new Date(),
    };

    const result = await userCollection.insertOne(newUser);
    res.status(201).json({ 
        message: "User created", 
        user: { _id: result.insertedId, ...newUser } 
    });

  } catch (error) {
    console.error("User Sync Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET ALL USERS (Optional)
router.get("/", async (req, res) => {
    const { userCollection } = req.db;
    try {
      const users = await userCollection.find().toArray();
      res.status(200).send(users);
    } catch (error) {
      res.status(500).send({ message: "Server error" });
    }
});

module.exports = router;