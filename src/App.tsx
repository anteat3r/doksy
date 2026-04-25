import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Editor from './Editor';
import LinkRedirect from './LinkRedirect';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/link/:alias" element={<LinkRedirect />} />
        <Route path="/:mode/:token" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
