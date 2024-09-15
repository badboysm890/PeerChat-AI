// indexeddb.js

let db;

/**
 * Initializes IndexedDB for storing chat sessions and messages.
 */
export function initializeIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.error("Your browser doesn't support IndexedDB.");
      reject("IndexedDB not supported");
      return;
    }

    const request = indexedDB.open('WebLLMChatDB', 2); // Incremented version to trigger onupgradeneeded

    request.onerror = function (event) {
      console.error('IndexedDB error:', event.target.errorCode);
      reject(event.target.errorCode);
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      resolve(); // Resolve the promise when db is initialized
    };

    request.onupgradeneeded = function (event) {
      db = event.target.result;

      // Create object stores only if they don't exist
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        sessionStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        messageStore.createIndex('sessionId', 'sessionId', { unique: false });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Creates a new chat session.
 * @param {string} name - The name of the chat session.
 * @returns {Promise<object>} - The created session object.
 */
export function createSession(name) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readwrite');
    const sessionStore = transaction.objectStore('sessions');
    const sanitizedName = window.DOMPurify.sanitize(name.trim());
    const request = sessionStore.add({ name: sanitizedName });

    request.onsuccess = function (event) {
      resolve({ id: event.target.result, name: sanitizedName });
    };

    request.onerror = function (event) {
      console.error('Error creating session:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

/**
 * Retrieves all chat sessions.
 * @returns {Promise<Array>} - An array of session objects.
 */
export function getAllSessions() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readonly');
    const sessionStore = transaction.objectStore('sessions');
    const request = sessionStore.getAll();

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      console.error('Error fetching sessions:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

/**
 * Updates the name of a chat session.
 * @param {number} sessionId - The ID of the session.
 * @param {string} newName - The new name for the session.
 * @returns {Promise<void>}
 */
export function updateSessionName(sessionId, newName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readwrite');
    const sessionStore = transaction.objectStore('sessions');
    const request = sessionStore.get(sessionId);

    request.onsuccess = function (event) {
      const session = event.target.result;
      if (session) {
        session.name = window.DOMPurify.sanitize(newName.trim());
        const updateRequest = sessionStore.put(session);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = (e) => {
          console.error('Error updating session name:', e.target.errorCode);
          reject(e.target.errorCode);
        };
      } else {
        reject('Session not found');
      }
    };

    request.onerror = function (event) {
      console.error('Error fetching session for update:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}

/**
 * Deletes a chat session and its associated messages.
 * @param {number} sessionId - The ID of the session to delete.
 * @returns {Promise<void>}
 */
export function deleteSession(sessionId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions', 'messages'], 'readwrite');
    const sessionStore = transaction.objectStore('sessions');
    const messageStore = transaction.objectStore('messages');

    // Delete the session
    const deleteSessionRequest = sessionStore.delete(sessionId);
    deleteSessionRequest.onerror = function (event) {
      console.error('Error deleting session:', event.target.errorCode);
      reject(event.target.errorCode);
    };

    deleteSessionRequest.onsuccess = function () {
      // Delete all messages associated with the session
      const index = messageStore.index('sessionId');
      const range = IDBKeyRange.only(sessionId);
      const deleteMessagesRequest = index.openCursor(range);

      deleteMessagesRequest.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      deleteMessagesRequest.onerror = function (event) {
        console.error('Error deleting messages:', event.target.errorCode);
        reject(event.target.errorCode);
      };
    };
  });
}

/**
 * Saves a message to a specific chat session.
 * @param {number} sessionId - The ID of the session.
 * @param {object} message - The message object containing role and content.
 */
export function saveMessage(sessionId, message) {
  if (!db) {
    console.error('Database not initialized');
    return;
  }
  const transaction = db.transaction(['messages'], 'readwrite');
  const messageStore = transaction.objectStore('messages');
  const sanitizedContent = message.role === 'user' ? window.DOMPurify.sanitize(message.content.trim()) : message.content.trim();
  messageStore.add({
    sessionId,
    content: sanitizedContent,
    role: message.role,
    timestamp: Date.now(),
  });
}

/**
 * Retrieves all messages for a specific chat session.
 * @param {number} sessionId - The ID of the session.
 * @returns {Promise<Array>} - An array of message objects.
 */
export function getAllMessages(sessionId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('Database not initialized');
      reject('Database not initialized');
      return;
    }
    const transaction = db.transaction(['messages'], 'readonly');
    const messageStore = transaction.objectStore('messages');
    const index = messageStore.index('sessionId');
    const range = IDBKeyRange.only(sessionId);
    const request = index.getAll(range);

    request.onsuccess = function (event) {
      // Sort messages by timestamp
      const sortedMessages = event.target.result.sort((a, b) => a.timestamp - b.timestamp);
      resolve(sortedMessages);
    };

    request.onerror = function (event) {
      console.error('Error fetching messages:', event.target.errorCode);
      reject(event.target.errorCode);
    };
  });
}