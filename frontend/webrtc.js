// webrtc.js

import { initializeWebLLM } from './webllm.js';

let peers = {};
let socketInstance = null;
let helpingIndicator = document.getElementById('helping-indicator'); // Add this element in your HTML

/**
 * Sets up WebRTC event listeners and handlers.
 * @param {Socket} socket - The Socket.IO client instance.
 * @param {boolean} isCapable - Indicates if the current device is capable of running the model locally.
 */
export function setupWebRTC(socket, isCapable) {
  socketInstance = socket;

  if (isCapable) {
    // Handle incoming offers from other users
    socket.on('offer', (data) => {
      const { from, offer } = data;

      // Prevent multiple connections with the same user
      if (peers[from]) {
        peers[from].destroy();
        delete peers[from];
      }

      const peer = new SimplePeer({ initiator: false, trickle: false });

      peer.on('signal', (answer) => {
        socket.emit('answer', { to: from, answer });
      });

      peer.on('data', async (data) => {
        const request = JSON.parse(data);

        // Show helping indicator when handling a task
        showHelpingIndicator(from);

        const reply = await processRequestWithLLM(request);
        peer.send(JSON.stringify(reply));

        // Notify server that computation is completed
        socket.emit('computationCompleted', { helperId: socket.id });

        // Hide helping indicator after task is completed
        hideHelpingIndicator();
        showCompletionMessage(); // Show completion message

        // Clean up peer after communication
        peer.destroy();
        delete peers[from];
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        peer.destroy();
        delete peers[from];
      });

      try {
        peer.signal(offer);
      } catch (err) {
        console.error('Error signaling peer:', err);
      }

      peers[from] = peer;
    });
  }
}

/**
 * Requests computation from a capable peer.
 * @param {string} messageContent - The message content from the user.
 * @param {Socket} socket - The Socket.IO client instance.
 * @returns {Promise<object>} - A promise that resolves with the assistant's reply.
 */
export function requestComputation(messageContent, socket) {
  return new Promise((resolve, reject) => {
    // Request a capable user from the server
    socket.emit('requestComputation');

    // Remove any previous listeners to prevent duplicates
    socket.off('peerId');
    socket.off('answer');

    socket.once('peerId', (data) => {
      const { peerId } = data;

      if (!peerId) {
        console.error('No capable users available');
        resolve({ role: 'assistant', content: 'No capable users available at the moment.' });
        return;
      }

      // Prevent multiple connections with the same user
      if (peers[peerId]) {
        peers[peerId].destroy();
        delete peers[peerId];
      }

      const peer = new SimplePeer({ initiator: true, trickle: false });

      peer.on('signal', (offer) => {
        socket.emit('offer', { to: peerId, offer });
      });

      peer.on('connect', () => {
        peer.send(JSON.stringify({ message: messageContent }));
      });

      peer.on('data', (data) => {
        const reply = JSON.parse(data);
        resolve({ role: 'assistant', content: reply.reply });

        // Notify server that computation is completed
        socket.emit('computationCompleted', { helperId: peerId });

        // Clean up peer after communication
        peer.destroy();
        delete peers[peerId];
      });

      peer.on('error', (err) => {
        console.error('WebRTC error:', err);
        resolve({ role: 'assistant', content: 'An error occurred while processing your request.' });
        peer.destroy();
        delete peers[peerId];
      });

      peers[peerId] = peer;
    });

    socket.on('answer', (data) => {
      const { from, answer } = data;
      const peer = peers[from];
      if (peer) {
        try {
          peer.signal(answer);
        } catch (err) {
          console.error('Error signaling peer:', err);
        }
      }
    });
  });
}

/**
 * Processes the computation request using the local LLM engine.
 * @param {object} request - The request object containing the user's message.
 * @returns {Promise<object>} - A promise that resolves with the assistant's reply.
 */
async function processRequestWithLLM(request) {
  try {
    const engine = await initializeWebLLM();

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: request.message },
    ];

    const reply = await engine.chat.completions.create({
      messages,
    });

    return { reply: reply.choices[0].message.content };
  } catch (error) {
    console.error('Error processing request with LLM:', error);
    return { reply: 'An error occurred while processing your request.' };
  }
}

/**
 * Displays an indicator that the device is helping another user.
 * @param {string} fromUserId - The ID of the user being helped.
 */
function showHelpingIndicator(fromUserId) {
  if (helpingIndicator) {
    helpingIndicator.style.display = 'block';
    helpingIndicator.textContent = `Helping user ${fromUserId}...`; // Display which user you're helping
  }
}

/**
 * Hides the helping indicator.
 */
function hideHelpingIndicator() {
  if (helpingIndicator) {
    helpingIndicator.style.display = 'none';
  }
}

/**
 * Shows a completion message when the task is completed.
 */
function showCompletionMessage() {
  if (helpingIndicator) {
    helpingIndicator.style.display = 'block';
    helpingIndicator.textContent = 'Task completed successfully!';
    setTimeout(() => {
      helpingIndicator.style.display = 'none'; // Hide the message after a few seconds
    }, 3000);
  }
}