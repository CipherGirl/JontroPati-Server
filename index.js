require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { dbUserName, dbUserPassword } = process.env;

const port = process.env.PORT || '5000';

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${dbUserName}:${dbUserPassword}@cluster0.jrcuo.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const userCollection = client.db('jontropati').collection('users');
    const productsCollection = client.db('jontropati').collection('products');

    //=========
    // Products
    //=========

    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.status(200).send(products);
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const products = await productsCollection.findOne(query);
      res.status(200).send(products);
    });

    app.put('/products/:id', async (req, res) => {
      const id = req.params.id;
      const quantity = req.body.quantity;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { quantity: quantity },
      };
      console.log(quantity);
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.status(200).send(result);
    });

    //======
    // User
    //======

    app.put('/user/:email', async (req, res) => {
      console.log('Inside user/email');
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
      );
      res.send({ result, token });
    });
  } finally {
    //await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('JontroPati Server is Running!');
});

app.listen(port, () => {
  console.log('Listening to port', port);
});
