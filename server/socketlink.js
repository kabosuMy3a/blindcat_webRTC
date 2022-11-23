import { Server } from 'socket.io' ;

export const socketlink = (app, server, isHttps) => {

  const offerMap = new Map();
  const idRoomMap = new Map();

  const io = new Server(server, {
    cors: {
      origin: isHttps ? 'https://blindcat.shop:3000' : 'http://localhost:3000'
    }
  });


  io.on('connection', (socket) => {
    console.log('socket-connected', socket.id);

    socket.on('join', ({roomId}) => {
      console.log('room id:',roomId)
      socket.join(roomId);
      idRoomMap.set(socket.id, roomId);
      const prevOffer = offerMap.get(roomId);
      //console.log('prev offer: ',prevOffer)
      socket.emit('remote-offer', {offer:prevOffer});
    });

    socket.on('new-offer', ({roomId, offer}) => {
      //console.log('new offer get', roomId, offer);
      offerMap.set(roomId, offer);
    });

    socket.on('new-answer', ({roomId, answer}) => {
      //console.log('new answer get', roomId, answer);
      socket.to(roomId).emit('remote-answer', {answer});
    });

    socket.on('disconnect', (reason) =>{
      console.log('disconnected', reason);
      const roomId = idRoomMap.get(socket.id);
      offerMap.delete(roomId);
    })

    socket.on('new-ice', ({iceCandidates, roomId})=> {
      socket.to(roomId).emit('remote-ice', {iceCandidates});
    });
  });
};