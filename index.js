const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://localfoodnet_db_user:33lHKCIyjIWrejLC@cluster0.8bxhssp.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //write api stuff after this from now on:
    const reviewsDb = client.db("localfoodnetDb");
    const revCollection = reviewsDb.collection("reviews");

    app.get("/reviews", (req, res) => {
      res.send("reviews.");
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  console.log("local food lover's network server is running.");
  res.send("Hello World.");
});

app.listen(port, () => {
  console.log(`local food lovers network server listening on port ${port}`);
});
