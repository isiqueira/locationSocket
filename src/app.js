const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const config = require('../config');
const loggedCheckpoints = [];
const locations = [];
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
//const redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, );

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
//const ForbiddenArea = require('./schemas/forbidden-area.model');

io.on("connection", async  socket => {
  
  console.info(`Client connected [id=${socket.id}]`);
  const checkpointId = socket.handshake.query.checkpoint;
  console.info(checkpointId);

  redisClient.get(cacheSocketKey, async(error, _redisData) => {

    if (error || _redisData !== null) {
      
      io.emit( "OnConnect", JSON.parse(locations));
    
    }
  });
  

  //console.log(loggedCheckpoints);

  if (typeof checkpointId !== 'undefined')
  {
     loggedCheckpoints[checkpointId] = socket.id;

 
      console.log('Checkpoint Connected ', socket.handshake.query.checkpoint)

      socket.join('checkpoint-'+ socket.handshake.query.checkpoint);
      console.log('checkpoint added to room');
       
   } else {
    console.log('a new client connected');
   }     
      

  console.log(loggedCheckpoints);
  
  //locations = [];
  io.emit("locations", locations);

  socket.on("change", async location =>
  {

//    console.log('Location change');
//    console.log(location);
   
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

//     console.log(`Checkpoint near`);
//       console.log(nearCheckpoint);

       nearCheckpoint.forEach(near => {

         console.log('Have a checkpoint near!');
         console.log(near._id);
         console.log('checkpoint-'+ loggedCheckpoints[near._id]);
         io.to('checkpoint-'+ near._id).emit('trucksnear', location);
         console.log(loggedCheckpoints[near._id]);
         
       });

    redisClient.get(cacheSocketKey, async(error, _redisData) => {

      if (error || _redisData !== null) {
    
        const _data = JSON.parse(_redisData);
        _data.push(location);
        redisClient.set(req.params.idTravel, JSON.stringify(_data), redis.print);
        //io.emit( "OnConnect", JSON.parse(locations));
      
      }
    });
  

    redisClient.set(req.params.idTravel, JSON.stringify(location), redis.print);
    console.log(locations);
    socket.broadcast.emit("locations", location);
  });

  

});

http.listen(process.env.PORT || 4000);
