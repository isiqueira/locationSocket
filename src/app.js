const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const config = require('../config');
const loggedCheckpoints = [];
console.log(config.connString);

mongoose.connect(config.connString, { useNewUrlParser: true }).then( () => { 
  console.log('MongoDB Connected');
}).catch(err => { 
   console.error(err);
});

const CheckPoint = require('./schemas/checkpoint.model');

io.on("connection", async  socket => {
  
  console.info(`Client connected [id=${socket.id}]`);
  const checkpointId = socket.handshake.query.checkpoint;
  console.info(checkpointId);
  

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
  
  locations = [];
  socket.on("change", async location =>
  {
    
    const locationIndex = locations.findIndex(lo => lo.idDevice === location.idDevice);

    if ( locationIndex > -1)
      locations.splice(locationIndex , 1);
    
     const nearCheckpoint = await CheckPoint.find({
        gpsLocation: {
         $near: {
          $maxDistance: 1000,
          $geometry: {
           type: "Point",
           coordinates: [location.longitude, location.latitude]
          }
         }
        }
       }).exec();
       console.log(nearCheckpoint);
       nearCheckpoint.forEach(near => { 
         console.log(near._id);

         console.log('checkpoint-'+ loggedCheckpoints[near._id]);
         io.to('checkpoint-'+ near._id).emit('trucksnear', location);
         //io.to('match-'+ req.params.id).emit('video', req.body.video)
         console.log(loggedCheckpoints[near._id]);
         
       });

    locations.push(location);
    socket.broadcast.emit("locations", locations);
  });

  io.emit("locations", locations);

});

http.listen(process.env.PORT || 3000);
