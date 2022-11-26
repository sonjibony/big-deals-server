const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3nhngvm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//jwt middleware
function verifyJWT(req, res, next) {
  // console.log('token inside',req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    //collections
    const categoryCollection = client.db("bigDeal").collection("categories");
    const furnitureCollection = client.db("bigDeal").collection("furniture");
    const bookingsCollection = client.db("bigDeal").collection("bookings");
    const usersCollection = client.db("bigDeal").collection("users");
    const paymentsCollection = client.db("bigDeal").collection("payments");

    //category api
    app.get("/category", async (req, res) => {
      const query = {};
      const category = await categoryCollection.find(query).toArray();
      res.send(category);
    });

    //specific category load
    // app.get("/category/:id", async (req, res) => {
    //   const id = req.params.id;
    //   // console.log(req.body.name);
    //   const query = { categoryNo: id };
    //   const furniture = await furnitureCollection.find(query).toArray();

    // res.send(furniture);
    // });

    //specific product
    app.post("/furniture", async (req, res) => {
      const furniture = req.body;
      const date_now = new Date();
      const date = `${date_now.toLocaleDateString()},${date_now.toLocaleTimeString()}`;
      const result = await furnitureCollection.insertOne({
        ...furniture,
        date,
      });
      res.send(result);
    });

    //specific product
    app.get("/furniture/:category", async (req, res) => {
      const category = req.params.category;
      // console.log(req.body.name);
      const query = { category: category };
      const furniture = await furnitureCollection.find(query).toArray();
      // const bookingQuery = {_id: ObjectId(id)}
      // const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
      res.send(furniture);
    });

    //my products
    app.get("/products", async (req, res) => {
      const gmail = req.query.gmail;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { gmail: gmail };
      const product = await furnitureCollection.find(query).toArray();
      res.send(product);
    });

    //advertised products
    app.get("/advertisedProducts", async (req, res) => {
      const advertise = req.query.advertise;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { advertise: advertise };
      const product = await furnitureCollection.find(query).toArray();
      res.send(product);
    });

    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          advertise: "advertised",
        },
      };
      const result = await furnitureCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //deleting product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await furnitureCollection.deleteOne(filter);
      res.send(result);
    });

    //reporting product
    app.put("/products/:id", async (req, res) => {
      // const decodedEmail = req.decoded.email;
      // const query = { email: decodedEmail };
      // const user = await usersCollection.findOne(query);
      // if (user?.role !== "admin") {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          report: "reported",
        },
      };
      const result = await furnitureCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //getting reported products
    app.get("/reportedProducts", async (req, res) => {
      const report = req.query.report;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { report: report };
      const product = await furnitureCollection.find(query).toArray();
      res.send(product);
    });

    //deleting reported product

    //stripe
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //payment saving in db
    // app.post('/payments', async(req,res) =>{
    //     const payment = req.body;
    //     const result = await paymentsCollection.insertOne(payment);
    //     const id = payment.bookingId;
    //     const filter = {_id: ObjectId(id)}
    //     const updatedDoc = {
    //         $set: {
    //             paid: true,
    //             transactionId: payment.transactionId
    //         }
    //     }
    //     const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
    //     res.send(result);
    // })

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const email = req?.decoded?.email;
      const result = await paymentsCollection.insertOne(payment);
      const product = payment.product;
      const filter = { product, email };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const { modifiedCount } = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );
      console.log(payment?.product_id);
      if (modifiedCount) {
        const deleted = await furnitureCollection.deleteOne({
          _id: ObjectId(payment?.product_id),
        });
        console.log(deleted);
      }
      res.send(result);
    });

    // app.put("/products/:id",  async (req, res) => {

    //   const id = req.params.id;
    //   const filter = { _id: ObjectId(id) };
    //   const options = { upsert: true };
    //   const updatedDoc = {
    //     $set: {
    //       report: "reported",
    //     },
    //   };
    //   const result = await furnitureCollection.updateOne(
    //     filter,
    //     updatedDoc,
    //     options
    //   );
    //   res.send(result);
    // });

    //jwt api
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);

      if (!email) return res.status(403).send({ accessToken: "" });

      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "24h",
        });
        return res.send({ accessToken: token });
      }
      // console.log(user);
      res.status(403).send({ accessToken: "" });
    });

    //my bookings
    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();

      res.send(bookings);
    });

    //specific booking
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    //booking posting in DB
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const query = {
        product: booking.product,
        email: booking.email,
      };
      const alreadyBooked = await bookingsCollection.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You have already booked this product`;
        return res.send({ acknowledge: false, message });
      }

      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    //deleting booking
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await bookingsCollection.deleteOne(filter);
      res.send(result);
    });

    //users api
    app.get("/users", async (req, res) => {
      // const option =req.query.option;
      // const query = {};
      let query = {};
      if (req?.query?.option) {
        query = {
          option: req.query.option,
        };
        //   } else if (req.query.service) {
        //     query = {
        //       service: req.query.service,
        //     };
      }
      const users = await usersCollection.find(query).toArray();
      // console.log('inside buyers',users);

      res.send(users);
    });

    app.get("/booked", async (req, res) => {
      let query = {};
      if (req?.query?.paid) {
        query = {
          paid: true,
        };

        // const paid = req.query.paid
        // const query = {paid: paid };
      }
      const allBookings = await bookingsCollection.find(query).toArray();
      res.send(allBookings);
    });

    app.get("/allBookings", async (req, res) => {
      // const paid = req.query.paid
      const query = {};
      const allBookings = await bookingsCollection.find(query).toArray();
      res.send(allBookings);
    });

    //users api inserted
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(req.body);
      const old_data = await usersCollection.findOne({
        email: req?.body?.email,
      });
      if (!!old_data?.email) {
        res.status(200).send(old_data);
      } else {
        const result = await usersCollection.insertOne(user);
        res.status(200).send(result);
      }
    });

    //checking admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //checking buyer
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.option === "buyer" });
    });

    //checking seller
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.option === "seller" });
    });

    //verification
    app.put("/users/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          status: "verified",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //deleting users
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("big deal server is running");
});

app.listen(port, () => console.log(`Big deal is running on ${port}`));
