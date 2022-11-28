import express from "express";

const app = express();

import https from 'https';
import fs from 'fs';
import path from 'path';
const __dirname = path.resolve();
import { Server } from 'socket.io';
import mediasoup, { getSupportedRtpCapabilities } from 'mediasoup'

app.get('/',(req, res) => {
  res.send('hi');
})

const options = {
  key: fs.readFileSync('./privkey.pem', 'utf-8'),
  cert: fs.readFileSync('./cert.pem', 'utf-8')
};

const httpsServer = https.createServer(options, app);
httpsServer.listen(8000, () => {
  console.log('listening');
});

const io = new Server(httpsServer, {
  cors: {
    origin: 'http://localhost:3000'
  }}
);

let worker ;
let router ;
let producerTransport ;
let consumerTransport ;
let producer ;
let consumer ;

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2020,
  });

  console.log(`worker pid ${worker.pid}`);

  worker.on('died', error => {
    console.error('mediasoup worker died ');
    setTimeout(()=> process.exit(1), 2000);
  });
}
await createWorker() ;

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
];

//const peers = io.of('/mediasoup');
io.on('connection', async (socket)=> {

  console.log('socket id: ' + socket.id);
  socket.emit('connection-success', {
    socketId: socket.id,
    existsProducer: producer ? true : false,
  });

  socket.on('disconnect', () => {
    //cleanup in hear ;
    console.log('peer disconnect');
  });

  socket.on('createRoom', async(callback) => {
    if(router === undefined){
      router = await worker.createRouter({ mediaCodecs });
      console.log(`Router ID: ${router.id}`);
    }

    getRtpCapabilities(callback);
  });

  const getRtpCapabilities = (callback) => {
    const rtpCapabilities = router.rtpCapabilities ;
    console.log('rtp Capabilities+++', rtpCapabilities);
    callback({rtpCapabilities});
  }

  socket.on('createWebRtcTransport', async ({sender}, callback) => {
    console.log(`is Sender: ${sender}`);

    if(sender){
      producerTransport = await createWebRtcTransport(callback);
    } else {
      consumerTransport = await createWebRtcTransport(callback);
    }
  });

  socket.on('transport-connect', async ({dtlsParameters}) => {
    console.log('DTLS PARAMS....', {dtlsParameters});
    await producerTransport.connect({dtlsParameters});
  });

  socket.on('transport-produce', async({kind, rtpParameters, appData}, callback) => {
    producer = await producerTransport.produce({
      kind,
      rtpParameters,
    });

    console.log('Producer ID: ', producer.id, producer.kind);

    producer.on('transportclose', () => {
      console.log('transport for this producer closed ')
      producer.close()
    })

    // Send back to the client the Producer's id
    callback({
      id: producer.id
    })
  });

  socket.on('transport-recv-connect', async({dtlsParameters}) => {
    console.log(`DTLS PARAMS: ${dtlsParameters}`);
    await consumerTransport.connect({dtlsParameters});
  });

  socket.on('consume', async ({rtpCapabilities}, callback)=> {
    try {
      if(router.canConsume({
        producerId: producer.id,
        rtpCapabilities,
      })) {
        consumer = await consumerTransport.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: true, /* recommend */
        });

        consumer.on('transportclose', () => {
          console.log('transport for this consumer closed ');
          consumer.close();
        });

        consumer.on('producerclose', () => {
          console.log('producer of consumer closed');
        });

        const params = {
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        }

        console.log(params);

        callback({params});

      } else {
        console.log('cannot consume');
      }
    } catch (error) {
      console.log(error.message);
      callback({
        params: {
          error
        }
      })
    }
  });

  socket.on('consumer-resume', async () => {
    console.log('consumer resume');
    await consumer.resume();
  });

});

const createWebRtcTransport = async (callback) => {
  try {
    const webRtcTransport_options = {
      listenIps: [
        {
          ip: '127.0.0.1'
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    }

    let transport = await router.createWebRtcTransport(webRtcTransport_options);
    console.log('transport id: '+ transport.id);

    transport.on('dtlsstatechange', dtlsState => {
      if(dtlsState === 'closed'){
        transport.close();
      }
    });

    transport.on('close', () => {
      console.log('transport closed')
    });

    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      }
    })

    return transport ;

  } catch (error) {
    console.log(error);
    callback({
      params: { error }
    });
  }
}