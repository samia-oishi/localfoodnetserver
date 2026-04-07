const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
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

async function run() {
  try {
    await client.connect();

    const db = client.db("localfoodnetDb");
    const reviewsCollection = db.collection("reviews");
    const favoritesCollection = db.collection("favorites");

    // ============ REVIEWS ENDPOINTS ============

    // CREATE - Add a new review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    // READ - Get all reviews (sorted by date descending)
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection
        .find()
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // READ - Get top 6 highest rated reviews (for homepage featured section)
    app.get("/reviews/top", async (req, res) => {
      const result = await reviewsCollection
        .find()
        .sort({ rating: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // SEARCH - Search reviews by food name using $regex
    app.get("/reviews/search", async (req, res) => {
      const query = req.query.query || "";
      const result = await reviewsCollection
        .find({ foodName: { $regex: query, $options: "i" } })
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // READ - Get a single review by ID
    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const result = await reviewsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // READ - Get all reviews by a specific user (by email)
    app.get("/reviews/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await reviewsCollection
        .find({ userEmail: email })
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // UPDATE - Update a review by ID
    app.put("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const updatedReview = req.body;
      const result = await reviewsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            foodName: updatedReview.foodName,
            foodImage: updatedReview.foodImage,
            restaurantName: updatedReview.restaurantName,
            location: updatedReview.location,
            rating: updatedReview.rating,
            reviewText: updatedReview.reviewText,
          },
        }
      );
      res.send(result);
    });

    // DELETE - Delete a review by ID
    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const result = await reviewsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // ============ FAVORITES ENDPOINTS ============

    // CREATE - Add a review to favorites
    app.post("/favorites", async (req, res) => {
      const favorite = req.body;
      // Check if already in favorites
      const existing = await favoritesCollection.findOne({
        reviewId: favorite.reviewId,
        userEmail: favorite.userEmail,
      });
      if (existing) {
        return res.status(400).send({ message: "Already in favorites" });
      }
      const result = await favoritesCollection.insertOne(favorite);
      res.send(result);
    });

    // READ - Get all favorites for a user
    app.get("/favorites/:email", async (req, res) => {
      const email = req.params.email;
      const result = await favoritesCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    // DELETE - Remove a favorite
    app.delete("/favorites/:id", async (req, res) => {
      const id = req.params.id;
      const result = await favoritesCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Ping to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } finally {
    // Keep connection alive
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Local Food Lovers Network server is running.");
});

app.listen(port, () => {
  console.log(`Local Food Lovers Network server listening on port ${port}`);
});
