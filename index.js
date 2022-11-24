const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3nhngvm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run (){
try{
//collections
const categoryCollection = client.db('bigDeal').collection('categories');
const furnitureCollection = client.db('bigDeal').collection('furniture');
const bookingsCollection = client.db('bigDeal').collection('bookings');

//category api
app.get('/category', async(req,res) => {
    const query = {};
    const category = await categoryCollection.find(query).toArray();
    res.send(category);
});

//specific category load
app.get('/category/:id', async(req, res) =>{
    const id = req.params.id;
    const query = {categoryNo:id};
    const furniture = await furnitureCollection.find(query).toArray();
    const bookingQuery = {_id: ObjectId(_id)}
    res.send(furniture);
   });

   //booking posting in bd
   app.post('/bookings', async(req,res) =>{
    const booking = req.body;
    // console.log(booking);
    const result = await bookingsCollection.insertOne(booking);
    res.send(result);
   })

}
finally{

}
}
run().catch(console.log)


app.get("/", async (req, res) => {
  res.send("big deal server is running");
});

app.listen(port, () => console.log(`Big deal is running on ${port}`));
