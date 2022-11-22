import './App.css';
import styled from 'styled-components';
import {useEffect, useRef} from 'react';

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoOptions = ['default','browser','window','monitor'] ;
  const options = {audio: true, video: true} ;

  useEffect(()=>{
    const getLocalVideo = async () => {
      options.video = {displaySurface: "browser"};
      localVideoRef.current.srcObject = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
      remoteVideoRef.current.srcObject = await navigator.mediaDevices.getDisplayMedia(options);
    }
    getLocalVideo();
    localVideoRef.current.onloadedmetadata = () => {
      localVideoRef.current.play();
    }

    remoteVideoRef.current.onloadedmetadata = () =>{
      remoteVideoRef.current.play();
    }

  },[]);



  return (
    <Layout>
      <span>
        <LocalVideo ref={localVideoRef} muted/>
      </span>
      <LocalVideo ref={remoteVideoRef}/>
    </Layout>
  ) ;
}

export default App ;

const Layout = styled.div`
  display: flex ;
  flex-direction: column ;
`;

const LocalVideo = styled.video`
  background-color: chartreuse;
  width: 360px;
  height: 360px;
` ;