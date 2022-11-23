import './App.css';
import Video from './Video';
import {BrowserRouter, Route, Routes} from "react-router-dom";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Video/>}/>
        <Route path="/:roomId" element={<Video />} />
      </Routes>
    </BrowserRouter>

  );
}

export default App ;