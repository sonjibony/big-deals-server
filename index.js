const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3nhngvm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//jwt middleware
function verifyJWT(req,res,next){
    // console.log('token inside',req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access')
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
    });
}

async function run (){
try{
//collections
const categoryCollection = client.db('bigDeal').collection('categories');
const furnitureCollection = client.db('bigDeal').collection('furniture');
const bookingsCollection = client.db('bigDeal').collection('bookings');
const usersCollection = client.db('bigDeal').collection('users');

//category api
app.get('/category', async(req,res) => {
    const query = {};
    const category = await categoryCollection.find(query).toArray();
    res.send(category);
});

//specific category load
app.get('/category/:id', async(req, res) =>{
    const id = req.params.id;
    console.log(req.body.name);
    const query = {categoryNo:id};
    const furniture = await furnitureCollection.find(query).toArray();
    // const bookingQuery = {_id: ObjectId(id)}
    // const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
    res.send(furniture);
   });

//    //specific product
//    app.get('/category/:id', async(req, res) =>{
//     const id = req.params.id;
//     // console.log(req.body.name);
//     const query = {categoryNo:id};
//     const furniture = await furnitureCollection.find(query).toArray();
//     // const bookingQuery = {_id: ObjectId(id)}
//     // const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
//     res.send(furniture);
//    });

//jwt api
app.get('/jwt', async(req,res) =>{
    const email = req.query.email;
    const query = {email: email};
    const user = await usersCollection.findOne(query);

    if(user){
const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '24h'});
return res.send({accessToken: token})
    }
    // console.log(user);
    res.status(403).send({accessToken: ''})
   })


//booking api
app.get('/bookings',verifyJWT, async(req,res) =>{
    const email = req.query.email;
    const decodedEmail = req.decoded.email;
    if(email !== decodedEmail){
        return res.status(403).send({message: "forbidden access"});
    }
    const query = {email: email};
    const bookings = await bookingsCollection.find(query).toArray();
    res.send(bookings);
})



   //booking posting in bd
   app.post('/bookings', async(req,res) =>{
    const booking = req.body;
    console.log(booking);
    const query ={
        product: booking.product
    }
    const alreadyBooked = await bookingsCollection.find(query).toArray();

    if(alreadyBooked.length){
       const message = `Product is already booked` 
       return res.send({acknowledge: false, message})
    }

    const result = await bookingsCollection.insertOne(booking);
    res.send(result);
   });



   //users api inserted
   app.post('/users', async(req,res) =>{
    const user = req.body;
    const result = await usersCollection.insertOne(user);
    res.send(result);
   });

   




}
finally{

}
}
run().catch(console.log)


app.get("/", async (req, res) => {
  res.send("big deal server is running");
});

app.listen(port, () => console.log(`Big deal is running on ${port}`));
