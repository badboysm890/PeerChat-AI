// socket.js

/**
 * Connects to the Socket.IO server.
 * @param {boolean} isCapable - Indicates if the current device is capable of running the model locally.
 * @returns {Socket} - The Socket.IO client instance.
 */
export function connectToSocketServer(isCapable) {
    const socket = io();
  
    // Emit join event with capability status
    socket.emit('join', { capable: isCapable });
  
    // Listen for online users count updates
    socket.on('onlineUsersCount', (count) => {
      // The main.js handles updating the UI
      // Additional handling can be implemented here if needed
    });
  
    return socket;
  }