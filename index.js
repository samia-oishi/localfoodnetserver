const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8bxhssp.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let reviewsCollection;
let favoritesCollection;
let dbReady = false;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("localfoodnetDb");
    reviewsCollection = db.collection("reviews");
    favoritesCollection = db.collection("favorites");
    await client.db("admin").command({ ping: 1 });
    dbReady = true;
    console.log("Successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
  }
}
connectDB();

const requireDB = (req, res, next) => {
  if (!dbReady) {
    return res
      .status(503)
      .json({ error: "Database not connected. Check server logs." });
  }
  next();
};

// ============ REVIEWS ENDPOINTS ============

app.post("/reviews", requireDB, async (req, res) => {
  try {
    const result = await reviewsCollection.insertOne(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/reviews", requireDB, async (req, res) => {
  try {
    const result = await reviewsCollection
      .find()
      .sort({ date: -1 })
      .toArray();
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/reviews/top", requireDB, async (req, res) => {
  try {
    const result = await reviewsCollection
      .find()
      .sort({ rating: -1 })
      .limit(6)
      .toArray();
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/reviews/search", requireDB, async (req, res) => {
  try {
    const query = req.query.query || "";
    const result = await reviewsCollection
      .find({ foodName: { $regex: query, $options: "i" } })
      .sort({ date: -1 })
      .toArray();
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/reviews/user/:email", requireDB, async (req, res) => {
  try {
    const result = await reviewsCollection
      .find({ userEmail: req.params.email })
      .sort({ date: -1 })
      .toArray();
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/reviews/:id", requireDB, async (req, res) => {
  try {
    const result = await reviewsCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/reviews/:id", requireDB, async (req, res) => {
  try {
    const u = req.body;
    const result = await reviewsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          foodName: u.foodName,
          foodImage: u.foodImage,
          restaurantName: u.restaurantName,
          location: u.location,
          rating: u.rating,
          reviewText: u.reviewText,
        },
      }
    );
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/reviews/:id", requireDB, async (req, res) => {
  try {
    const result = await reviewsCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ FAVORITES ENDPOINTS ============

app.post("/favorites", requireDB, async (req, res) => {
  try {
    const favorite = req.body;
    const existing = await favoritesCollection.findOne({
      reviewId: favorite.reviewId,
      userEmail: favorite.userEmail,
    });
    if (existing) {
      return res.status(400).send({ message: "Already in favorites" });
    }
    const result = await favoritesCollection.insertOne(favorite);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/favorites/:email", requireDB, async (req, res) => {
  try {
    const result = await favoritesCollection
      .find({ userEmail: req.params.email })
      .toArray();
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/favorites/:id", requireDB, async (req, res) => {
  try {
    const result = await favoritesCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send(
    `Local Food Lovers Network server is running. DB: ${dbReady ? "connected" : "NOT connected"}`
  );
});

app.listen(port, () => {
  console.log(`Local Food Lovers Network server listening on port ${port}`);
});
