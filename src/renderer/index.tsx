import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';

import App from './App';

Amplify.configure(outputs);

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
