require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { dbUserName, dbUserPassword, ACCESS_TOKEN_SECRET } = process.env;

const port = process.env.PORT || '5000';

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${dbUserName}:${dbUserPassword}@cluster0.jrcuo.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();
    const userCollection = client.db('jontropati').collection('users');
    const productsCollection = client.db('jontropati').collection('products');
    const ordersCollection = client.db('jontropati').collection('orders');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === 'admin') {
        next();
      } else {
        res.status(403).send({ message: 'Forbidden Access' });
      }
    };

    //=========
    // Products
    //=========

    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.status(200).send(products);
    });

    app.post('/products', verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
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
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.status(200).send(result);
    });

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.status(200).send(result);
    });
    //========
    // Orders
    //========

    app.get('/orders', verifyJWT, async (req, res) => {
      const query = {};
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.status(200).send(orders);
    });

    app.get('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });

    app.get('/myorders', verifyJWT, async (req, res) => {
      const authorization = req.headers.authorization;
      const email = req.query.email;
      if (email === req.decoded.email) {
        const query = { ...req.query };
        const userOrders = await ordersCollection.find(query).toArray();
        return res.status(200).send(userOrders);
      } else {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
    });

    app.post('/orders', async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.status(200).send(result);
    });

    app.put('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const deliveryStatus = req.body.deliveryStatus;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { deliveryStatus: deliveryStatus },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.status(200).send(result);
    });

    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.status(200).send(result);
    });

    //======
    // User
    //======

    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.status(200).send(users);
    });

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    });

    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const role = req.body;
      const filter = { email: email };
      const updateDoc = {
        $set: role,
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.status(200).send(result);
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
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
