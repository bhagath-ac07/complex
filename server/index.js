const keys = require('./keys');

//express libs

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const {Pool} = require('pg');
const pgConnect = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port:keys.pgPassword
});

pgConnect.on('error', () => {
    console.log("Pg conn lost")
});

pgConnect.query('CREATE TABLE IF NOT EXISTS vlaues (number INT)').catch(
    err => console.log(err)
    
);

//redis client setup

const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

//Express route handlers

app.get('/', (req, resp) => {
    resp.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgConnect.query('SELECT * FROM VALUES');

    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    })
});

app.post('/values', (req,res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    } else {
        redisClient.hset('values', index, 'nothing yet');
        redisClient.publish('insert', index);
        pgConnect.query('INSERT INTO VALUES(number) VALUES($1)', [index]);
    }

    res.send({working: true});
});

app.listen(5000, err => {
    console.log("Listening");
});
