const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const config = require('../config');
const loggedCheckpoints = [];
let locations = [];
const dotenv = require('dotenv');
const cacheSocketKey  = 'CacheDataSocket';
dotenv.config();
console.log(process.env.MONGO_DATABASE);

mongoose.connect(process.env.MONGO_DATABASE, { useNewUrlParser: true }).then( () => {
  console.log('MongoDB Connected');
}).catch(err => {
   console.error(err);
});

const redis = require("redis");

const redisClient = redis.createClient({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
});

redisClient.on('connect', function() {
    console.log('Redis client connected');
});

redisClient.on("error", function (err) {
    console.log("Error " + err);
});

const CheckPoint = require('./schemas/checkpoint.model');

io.on("connection", async  socket => {
  
  console.info(`Client connected [id=${socket.id}]`);
  const checkpointId = socket.handshake.query.checkpoint;
  console.info(checkpointId);

  const _data = [];

  redisClient.get(cacheSocketKey, async(error, _redisData) => {

    if (error || _redisData !== null) {
      
      io.emit( "on_connect", JSON.parse(_redisData));
    
    }
  });

  if (typeof checkpointId !== 'undefined') {

     loggedCheckpoints[checkpointId] = socket.id;
     console.log('Checkpoint Connected ', socket.handshake.query.checkpoint)
     socket.join('checkpoint-'+ socket.handshake.query.checkpoint);
     console.log('checkpoint added to room');

   } else {

    console.log('a new client connected');

  }

  io.emit("locations", locations);

  socket.on("change", async location =>
  {

    //Procuro se ja tenho a localizacao desse device
    const locationIndex = locations.findIndex(lo => lo.idDevice === location.idDevice);

    if ( locationIndex > -1)
      locations.splice(locationIndex , 1);

     const nearCheckpoint = await CheckPoint.find(
     {
        gpsLocation: {
         $near: {
          $maxDistance: 2000,
          $geometry: {
           type: "Point",
           coordinates: [location.longitude, location.latitude]
          }
         }
        }
      }).exec();

       nearCheckpoint.forEach(near => {

         console.log('Have a checkpoint near!');
         console.log(near._id);
         console.log('checkpoint-'+ loggedCheckpoints[near._id]);
         io.to('checkpoint-'+ near._id).emit('trucksnear', location);
         console.log(loggedCheckpoints[near._id]);
         
       });

    redisClient.get(cacheSocketKey, async(error, _redisData) => {

      if (error || _redisData !== null) {
    
        locations = JSON.parse(_redisData);

        for( var i = 0; i < locations.length; i++) {
        

          if ( locations[i].idDevice == location.idDevice) {
            locations.splice(i, 1);
            i--;
          }
        }

        locations.push(location);
        redisClient.set( cacheSocketKey, JSON.stringify(locations), redis.print );

      }
    });

    redisClient.set(cacheSocketKey, JSON.stringify(locations), redis.print);
    console.log(locations);
    socket.broadcast.emit("locations", location);

  });

});

http.listen(process.env.PORT || 4000);
