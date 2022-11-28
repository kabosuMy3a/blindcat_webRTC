import styles from 'styles/video.module.scss';
import {useRef, useEffect} from "react";
import { Device } from 'mediasoup-client' ;
import io from 'socket.io-client';


const Video = () => {

  const socketRef = useRef<any>(null);

  const paramsRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);

  const deviceRef = useRef<any>(null);
  const rtpCapabilitiesRef = useRef<any>(null);
  const producerTransportRef = useRef<any>(null);
  const consumerTransportRef = useRef<any>(null);

  const producerRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);

  const isProducerRef = useRef<boolean>(false);

  useEffect(()=> {
    const to = 'https://blindcat.shop:8443';
    socketRef.current = io(to);
    socketRef.current.on('connection-success', ({socketId, existsProducer}: any) => {
      console.log(socketId, existsProducer);
    });
  },[]);


  //Producer 시작 코드
  const getLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true ,
        video: {
          width: {
            min: 640,
            max: 1920,
          },
          height: {
            min: 400,
            max: 1080,
          }
        }
      });

      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
      paramsRef.current = {
        encodings: [
          {
            rid: 'r0',
            maxBitrate: 100000,
            scalabilityMode: 'S1T3',
          },
          {
            rid: 'r1',
            maxBitrate: 300000,
            scalabilityMode: 'S1T3',
          },
          {
            rid: 'r2',
            maxBitrate: 900000,
            scalabilityMode: 'S1T3',
          },
        ],
        // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
        codecOptions: {
          videoGoogleStartBitrate: 1000
        }
      }

      localVideoRef.current.srcObject = stream ;
      const track = stream.getVideoTracks()[0];
      paramsRef.current = {
        track,
        ...paramsRef.current
      }
      console.log(paramsRef.current);
      goConnect(true);

    } catch (e) {
      alert('웹캠 가져오기 실패');
    }
  }

  //Consumer 시작코드
  const goConsume = () => {
    goConnect(false);
  }

  const goConnect = (isProducer : any) => {
    isProducerRef.current = isProducer ;
    deviceRef.current === null ? getRtpCapabilities() : goCreateTransport() ;
  }

  const getRtpCapabilities = () => {
    socketRef.current.emit('createRoom',({rtpCapabilities} : any) => {
      console.dir(`Router RTP Capabilities: ${JSON.stringify(rtpCapabilities)}`);
      rtpCapabilitiesRef.current = rtpCapabilities ;
      createDevice();
    });
  }

  const createDevice = async () => {
    try {
      deviceRef.current = new Device();
      await deviceRef.current.load({
        routerRtpCapabilities: rtpCapabilitiesRef.current
      });

      console.log(deviceRef.current.rtpCapabilities);
      goCreateTransport();

    } catch(error){
      console.log(`디바이스 만들 때 에러: ${error}`);
      if(error instanceof Error && error.name === 'UnsupportedError' ){
        console.warn('browser not supported');
      }
    }
  }

  const goCreateTransport = () => {
    console.log('isProducer? ', isProducerRef.current);
    isProducerRef.current ? createSendTransport() : createRecvTransport() ;
  };

  const createSendTransport = () => {
    socketRef.current.emit('createWebRtcTransport', {sender: true}, ({params} : any) => {
      if(params.error){
        console.log(params.error);
        return;
      }
      console.log(params);
      producerTransportRef.current = deviceRef.current.createSendTransport(params);

      producerTransportRef.current.on('connect', async ({dtlsParameters} : any, callback : any, errorback : any)=> {
        console.log("dtlsParameters: ", dtlsParameters);
        try{

          await socketRef.current.emit('transport-connect', {
            dtlsParameters: dtlsParameters,
          });

          callback();

        } catch(error){
         errorback(error);
        }
      });

      producerTransportRef.current.on('produce', async (parameters : any ,callback : any, errorback : any) => {
        console.log('produce parameters: ', parameters);
        try {
          await socketRef.current.emit('transport-produce', {
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData
          }, ({id} : any)=> {
            callback(id);
          });

        } catch (error){
          errorback(error);
        }
      });

      connectSendTransport();
    });
  }

  const connectSendTransport = async () => {
    producerRef.current = await producerTransportRef.current.produce(paramsRef.current);
    producerRef.current.on('trackended', () => {
      console.log('tranck ended');
    });
    producerRef.current.on('transportclose', () => {
      console.log('transport ended');
    });
  }

  const createRecvTransport = async () => {
    await socketRef.current.emit('createWebRtcTransport', {sender: false}, ({params} : any ) =>{
      if(params.error){
        console.log(params.error);
        return ;
      }
      console.log(params);

      consumerTransportRef.current = deviceRef.current.createRecvTransport(params);

      consumerTransportRef.current.on('connect', async({dtlsParameters} : any, callback : any , errorback : any) => {
        try {
          await socketRef.current.emit('transport-recv-connect', {
            //transportId: consumerTransportRef.current.id,
            dtlsParameters,
          });
          callback();
        } catch(error){
          errorback(error);
        }
      });

      connectRecvTransport();

    });
  }

  const connectRecvTransport = async () => {
    await socketRef.current.emit('consume', {
      rtpCapabilities: deviceRef.current.rtpCapabilities,
    }, async ({params} : any) => {
      if(params.error){
        console.log('Cannot consume');
        return ;
      }

      console.log(params);

      consumerRef.current = await consumerTransportRef.current.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters
      });

      const { track } = consumerRef.current;
      remoteVideoRef.current.srcObject = new MediaStream([track]);
      socketRef.current.emit('consumer-resume');
    });
  }

  return (
    <>
      <table>
        <tbody>
          <tr>
            <td>
              <div>
                <video ref={localVideoRef} muted autoPlay className={styles.localVideo}  ></video>
              </div>
            </td>
            <td>
              <div>
                <video ref={remoteVideoRef} autoPlay className={styles.remoteVideo} ></video>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div className={styles.sharedBtns}>
                <button onClick={getLocalStream}> Publish </button>
              </div>
            </td>
            <td>
              <div className={styles.sharedBtns}>
                <button onClick={goConsume}> Consume </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </>

  ) ;

}

export { Video }
