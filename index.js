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
let connectionPromise = null;

async function ensureConnected() {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await client.connect();
      const db = client.db("localfoodnetDb");
      reviewsCollection = db.collection("reviews");
      favoritesCollection = db.collection("favorites");
      await client.db("admin").command({ ping: 1 });
      console.log("Successfully connected to MongoDB!");
    })().catch((err) => {
      // reset so the next request can retry instead of being permanently broken
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
}

const requireDB = async (req, res, next) => {
  try {
    await ensureConnected();
    next();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    res
      .status(503)
      .json({ error: "Database not connected: " + err.message });
  }
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
    const { search, category, rating, sort } = req.query;
    const filter = {};
    if (search) filter.foodName = { $regex: search, $options: "i" };
    if (category) filter.category = category;
    if (rating) filter.rating = Number(rating);

    const sortMap = {
      date_desc: { date: -1 },
      date_asc: { date: 1 },
      rating_desc: { rating: -1 },
      rating_asc: { rating: 1 },
    };
    const sortBy = sortMap[sort] || { date: -1 };

    const result = await reviewsCollection.find(filter).sort(sortBy).toArray();
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

app.get("/reviews/counts", requireDB, async (req, res) => {
  try {
    const total = await reviewsCollection.countDocuments();
    const catAgg = await reviewsCollection
      .aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }])
      .toArray();
    const ratAgg = await reviewsCollection
      .aggregate([{ $group: { _id: "$rating", count: { $sum: 1 } } }])
      .toArray();
    const byCategory = {};
    catAgg.forEach((x) => {
      if (x._id) byCategory[x._id] = x.count;
    });
    const byRating = {};
    ratAgg.forEach((x) => {
      if (x._id != null) byRating[x._id] = x.count;
    });
    res.send({ total, byCategory, byRating });
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
          category: u.category,
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

app.delete("/users/:email", requireDB, async (req, res) => {
  try {
    const email = req.params.email;
    const r1 = await reviewsCollection.deleteMany({ userEmail: email });
    const r2 = await favoritesCollection.deleteMany({ userEmail: email });
    res.send({
      reviewsDeleted: r1.deletedCount,
      favoritesDeleted: r2.deletedCount,
    });
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

app.get("/", async (req, res) => {
  let dbStatus = "not yet connected";
  try {
    await ensureConnected();
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "FAILED — " + err.message;
  }
  res.send(`Local Food Lovers Network server is running. DB: ${dbStatus}`);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Local Food Lovers Network server listening on port ${port}`);
  });
}

module.exports = app;
