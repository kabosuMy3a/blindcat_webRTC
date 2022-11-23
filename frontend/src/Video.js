import styled from 'styled-components';
import {useEffect, useRef} from 'react';
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom' ;

const iceConfiguration ={
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302'],
    },
    {
      urls: process.env.REACT_APP_TURN_URL,
      username: process.env.REACT_APP_TURN_USERNAME,
      credential: process.env.REACT_APP_TURN_CREDENTIAL
    }
  ],
}

function Video() {

  const localVideoRef = useRef(null);
  const localDisplayVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const options = {audio: true, video: {facingMode: {exact: 'user'}}} ;

  let {roomId} = useParams() ;
  roomId = roomId ?? 'alpaka-blindcat';
  const socketRef = useRef(null);

  const peerConnectRef = useRef(new RTCPeerConnection(iceConfiguration));
  const iceCandidateRef = useRef([]);


  const getLocalVideos = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    localVideoRef.current.srcObject = localStream ;

    const localTracks = localStream.getTracks() ;
    localTracks.forEach((localTrack)=>{
      peerConnectRef.current.addTrack(localTrack, localStream);
    });

    //options.video = {displaySurface: "window"};
    //localDisplayVideoRef.current.srcObject = await navigator.mediaDevices.getDisplayMedia(options);
  }



  useEffect(() => {
    localVideoRef.current.onloadedmetadata = () => {
      localVideoRef.current.play();
    }
  },[]);

  useEffect(() => {
    remoteVideoRef.current.onloadedmetadata = () => {
      remoteVideoRef.current.play();
    }
  },[]);

  //이벤트 등록
  useEffect(()=> {
    peerConnectRef.current.addEventListener("signalingstatechange", ()=>{
      if(peerConnectRef.current.signalingState === 'stable' && peerConnectRef.current.iceGatheringState === 'complete'){
        socketRef.current.emit('new-ice', {iceCandidates: iceCandidateRef.current, roomId});
      }
    })

    peerConnectRef.current.addEventListener("icegatheringstatechange", () => {
      if(peerConnectRef.current.signalingState === 'stable' && peerConnectRef.current.iceGatheringState === 'complete'){
        socketRef.current.emit('new-ice', {iceCandidates: iceCandidateRef.current, roomId});
      }
    })

    peerConnectRef.current.addEventListener("icecandidate", (event) => {
      iceCandidateRef.current = [...iceCandidateRef.current, event.candidate];
    })

    peerConnectRef.current.addEventListener('track', (event) => {
      const [remoteStream] = event.streams;
      remoteVideoRef.current.srcObject = remoteStream ;
    });
  },[]);

  //Signalling
  useEffect(()=> {
   console.log('signalingState:', peerConnectRef.current.signalingState);

    const to = process.env.REACT_APP_PROFILE === 'local'
      ?  'http://localhost:8000'
      : 'https://blindcat.shop:8443'

    socketRef.current = io(to);
    socketRef.current.emit('join', {roomId});

    socketRef.current.on('remote-offer', ({offer}) => {

      if(offer)/* callee */{
        handleRemoteOffer(offer);
      } else /* caller */ {
        createNewOfferAndSend();
      }
    });

    socketRef.current.on('remote-answer', ({answer}) => {
      handleRemoteAnswer(answer);
    });

    socketRef.current.on('remote-ice', ({iceCandidates})=>{
      iceCandidates.forEach((iceCandidate)=> {
        peerConnectRef.current.addIceCandidate(iceCandidate);
        console.log('ice: ', peerConnectRef.current);
      });
    });
  },[]);

  /*
      Caller는 먼저 들어온 사람이 없는 경우
      Callee는 먼저 들어온 사람이 있는 경우
  */

  //Caller
  //내꺼 먼저 받아서 local 설정 후 offer 보내 놓음
  const createNewOfferAndSend = async () => {
    await getLocalVideos();

    const newOffer = await peerConnectRef.current.createOffer();
    console.log(newOffer);
    await peerConnectRef.current.setLocalDescription(newOffer);
    socketRef.current.emit('new-offer', ({roomId, offer: newOffer}));
  }

  //Callee
  //상대 offer 받고 remote 설정 후 내 answer 만들어 local 설정하면 stable !
  //그리고 answer 서버로 보냄
  const handleRemoteOffer = async (offer) => {
    await getLocalVideos();
    const remoteOffer = new RTCSessionDescription(offer);
    await peerConnectRef.current.setRemoteDescription(remoteOffer);
    console.log('remoteOffer:', remoteOffer);

    const newAnswer = await peerConnectRef.current.createAnswer(remoteOffer);
    await peerConnectRef.current.setLocalDescription(newAnswer);
    console.log('new Answer:', newAnswer);

    socketRef.current.emit('new-answer', ({roomId, answer: newAnswer}));
  }

  //Caller
  //상대 answer 받고 remote 설정하면 stable !
  const handleRemoteAnswer = async (answer) => {
    const remoteAnswer = new RTCSessionDescription(answer);
    await peerConnectRef.current.setRemoteDescription(remoteAnswer);
  }

  return (
    <div>
      <Layout>
        <span><LocalVideo playsinline ref={localVideoRef} muted/></span>
        <span><RemoteVideo playsinline ref={remoteVideoRef} muted/></span>
        <LocalVideo playsinline ref={localDisplayVideoRef}/>
      </Layout>
    </div>
  ) ;
}

export default Video ;

const Layout = styled.div`
  display: flex ;
  flex-direction: row ;
  overflow: auto;
`;

const LocalVideo = styled.video`
  background-color: teal;
` ;

const RemoteVideo = styled.video`
  background-color: salmon;
` ;
