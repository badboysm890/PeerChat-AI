// main.js

import {
  initializeIndexedDB,
  saveMessage,
  getAllMessages,
  deleteSession,
  getAllSessions,
  createSession,
  updateSessionName
} from './indexeddb.js';
import { initializeWebLLM, isDeviceCapable } from './webllm.js';
import { connectToSocketServer } from './socket.js';
import { setupWebRTC, requestComputation } from './webrtc.js';
import { loadModels } from './models.js';

// Constants for performance optimization
const MESSAGE_BATCH_SIZE = 20;

// Current Chat Session ID
let currentSessionId = null;

// Track loaded message batches for lazy loading
let loadedMessageCount = 0;

// Initialize IndexedDB and load chat sessions
initializeIndexedDB()
  .then(() => {
      console.log('IndexedDB initialized successfully');
      loadChatSessions();
  })
  .catch((error) => {
      console.error('Failed to initialize IndexedDB:', error);
  });

// Device capability check and setup
let deviceCapable = false;
let socket;

(async () => {
  deviceCapable = await isDeviceCapable();

  // Load models
  loadModels();

  // Connect to Socket.IO server
  socket = connectToSocketServer(deviceCapable);

  // Set up WebRTC connections
  setupWebRTC(socket, deviceCapable);

  // Handle form submission
  const form = document.getElementById('message-form');
  form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = document.getElementById('message-input');
      const messageContent = input.value.trim();
      if (messageContent === '' || !currentSessionId) return;

      const message = { role: 'user', content: messageContent };
      displayMessage(message);
      saveMessage(currentSessionId, message);

      input.value = '';

      // Display spinner for assistant's reply
      const spinnerId = displaySpinner();

      if (deviceCapable) {
          // Process locally with full context
          const reply = await processMessageLocally(currentSessionId);
          removeSpinner(spinnerId);
          displayMessage(reply);
          saveMessage(currentSessionId, reply);
      } else {
          // Request computation from peer with full context
          const reply = await requestComputationWithContext(currentSessionId, socket);
          removeSpinner(spinnerId);
          if (reply) {
              displayMessage(reply);
              saveMessage(currentSessionId, reply);
          } else {
              displayMessage({ role: 'assistant', content: 'Unable to get response from peer.' });
          }
      }
  });

  // Settings modal event
  const settingsIcon = document.getElementById('settings-icon');
  settingsIcon.addEventListener('click', () => {
      $('#settings-modal').modal('show');
  });

  // Listen for online users count updates
  socket.on('onlineUsersCount', (count) => {
      updateOnlineUsersCount(count);
  });

  // Listen for usersUpdate to refresh sessions list
  socket.on('usersUpdate', (users) => {
      // Optional: Update UI based on users if needed
  });
})();

/**
* Loads and displays chat sessions in the modal.
* Automatically creates a new session if none exist.
*/
async function loadChatSessions() {
  const sessions = await getAllSessions();

  // If no sessions exist, create a default session
  if (sessions.length === 0) {
      const defaultSessionName = 'Default Session';
      try {
          const newSession = await createSession(defaultSessionName);
          console.log('Default session created:', newSession);
          sessions.push(newSession); // Add the new session to the sessions array
      } catch (error) {
          console.error('Failed to create default session:', error);
          alert('Failed to create a default chat session. Please try again.');
          return;
      }
  }

  populateSessionsList(sessions);

  // Retrieve saved session ID from localStorage
  const savedSessionId = parseInt(localStorage.getItem('activeSessionId'), 10);
  const sessionToLoad = sessions.find(session => session.id === savedSessionId) || sessions[0];

  if (sessionToLoad) {
      switchSession(sessionToLoad.id);
  }
}

/**
* Populates the sessions list in the modal with search and edit functionalities.
* @param {Array} sessions - Array of session objects.
*/
function populateSessionsList(sessions) {
  const sessionsList = document.getElementById('sessions-list');
  sessionsList.innerHTML = ''; // Clear existing list

  // Create search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'session-search';
  searchInput.classList.add('form-control', 'mb-3');
  searchInput.placeholder = 'Search Sessions...';
  searchInput.addEventListener('input', () => {
      filterSessionsList(sessions);
  });
  sessionsList.appendChild(searchInput);

  // Create list group for sessions
  const listGroup = document.createElement('ul');
  listGroup.classList.add('list-group');
  listGroup.id = 'sessions-list-group';

  sessions.forEach(session => {
      const listItem = document.createElement('li');
      listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
      listItem.dataset.sessionId = session.id;

      const sessionNameSpan = document.createElement('span');
      sessionNameSpan.textContent = session.name;
      sessionNameSpan.style.cursor = 'pointer';
      sessionNameSpan.addEventListener('click', () => {
          switchSession(session.id);
          $('#sessions-modal').modal('hide');
      });

      // Edit Button
      const editBtn = document.createElement('button');
      editBtn.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.title = 'Edit Session Name';
      editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          enableSessionEditing(session, sessionNameSpan);
      });

      // Delete Button with confirmation
      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('btn', 'btn-danger', 'btn-sm');
      deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteBtn.title = 'Delete Session';
      deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const confirmDelete = confirm(`Are you sure you want to delete the session "${session.name}"? This action cannot be undone.`);
          if (confirmDelete) {
              await deleteSession(session.id);
              loadChatSessions();
          }
      });

      listItem.appendChild(sessionNameSpan);
      listItem.appendChild(editBtn);
      listItem.appendChild(deleteBtn);
      listGroup.appendChild(listItem);
  });

  sessionsList.appendChild(listGroup);
}

document.addEventListener('DOMContentLoaded', () => {
  const createSessionBtn = document.getElementById('create-session-btn');
  const newSessionNameInput = document.getElementById('new-session-name');

  if (createSessionBtn && newSessionNameInput) {
      createSessionBtn.addEventListener('click', async () => {
          console.log('Create Session button clicked.');
          const sessionName = newSessionNameInput.value.trim();
          console.log(`Session name input: "${sessionName}"`);

          if (sessionName === '') {
              alert('Please enter a session name.');
              console.log('Session name is empty.');
              return;
          }

          try {
              // Create the new session
              const newSession = await createSession(sessionName);
              console.log('New session created:', newSession);

              // Clear the input field
              newSessionNameInput.value = '';
              console.log('Session name input cleared.');

              // Reload and populate the sessions list
              loadChatSessions();
              console.log('Sessions list reloaded.');

              // Switch to the newly created session
              switchSession(newSession.id);
              console.log(`Switched to session ID: ${newSession.id}`);

              // Close the modal
              $('#sessions-modal').modal('hide');
              console.log('Sessions modal closed.');
          } catch (error) {
              console.error('Error creating session:', error);
              alert('Failed to create session. Please try again.');
          }
      });
  } else {
      console.error('Create Session button or input field not found.');
  }
});

/**
* Enables inline editing of a session name.
* @param {object} session - The session object.
* @param {HTMLElement} sessionNameSpan - The span element displaying the session name.
*/
function enableSessionEditing(session, sessionNameSpan) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = session.name;
  input.classList.add('form-control');
  input.style.maxWidth = '200px';

  // Replace the span with the input
  sessionNameSpan.replaceWith(input);
  input.focus();

  // Handle saving the new name
  input.addEventListener('blur', async () => {
      const newName = window.DOMPurify.sanitize(input.value.trim());
      if (newName === '') {
          alert('Session name cannot be empty.');
          input.focus();
          return;
      }

      // Update session name in IndexedDB
      await updateSessionName(session.id, newName);

      // Update UI
      session.name = newName;
      const newSpan = document.createElement('span');
      newSpan.textContent = newName;
      newSpan.style.cursor = 'pointer';
      newSpan.addEventListener('click', () => {
          switchSession(session.id);
          $('#sessions-modal').modal('hide');
      });

      input.replaceWith(newSpan);
      loadChatSessions(); // Refresh the sessions list to reflect changes
  });

  // Allow saving with Enter key
  input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
          input.blur();
      }
  });
}

/**
* Filters the sessions list based on the search input.
* @param {Array} sessions - Array of session objects.
*/
function filterSessionsList(sessions) {
  const searchValue = document.getElementById('session-search').value.toLowerCase();
  const listGroup = document.getElementById('sessions-list-group');
  const items = listGroup.getElementsByTagName('li');

  Array.from(items).forEach(item => {
      if (item === document.getElementById('session-search').parentElement) {
          // Skip the search input itself
          return;
      }
      const sessionName = item.querySelector('span').textContent.toLowerCase();
      if (sessionName.includes(searchValue)) {
          item.style.display = '';
      } else {
          item.style.display = 'none';
      }
  });
}

/**
* Switches to a selected chat session.
* @param {number} sessionId - The ID of the session to switch to.
*/
async function switchSession(sessionId) {
  currentSessionId = sessionId;
  localStorage.setItem('activeSessionId', sessionId); // Save to localStorage
  clearMessages();
  loadChatHistory(sessionId);
  loadedMessageCount = 0; // Reset loaded message count for lazy loading
}

/**
* Loads chat history for a specific session with lazy loading.
* Initially loads the latest MESSAGE_BATCH_SIZE messages.
* As the user scrolls up, older messages are fetched and displayed.
* @param {number} sessionId - The ID of the session.
*/
async function loadChatHistory(sessionId) {
  const allMessages = await getAllMessages(sessionId);
  const totalMessages = allMessages.length;
  loadedMessageCount = Math.min(MESSAGE_BATCH_SIZE, totalMessages);

  const messagesToLoad = allMessages.slice(-loadedMessageCount);
  messagesToLoad.forEach(message => {
      displayMessage(message, false); // Pass false to prevent scrolling
  });

  // Scroll to the bottom after initial load
  const messagesDiv = document.getElementById('messages');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Set up scroll event for lazy loading
  messagesDiv.addEventListener('scroll', handleScroll);
}

/**
* Handles the scroll event to implement lazy loading of messages.
*/
async function handleScroll() {
  const messagesDiv = document.getElementById('messages');
  if (messagesDiv.scrollTop === 0) {
      // User has scrolled to the top, load more messages
      const allMessages = await getAllMessages(currentSessionId);
      const totalMessages = allMessages.length;

      if (loadedMessageCount >= totalMessages) {
          // All messages are loaded
          return;
      }

      const remainingMessages = totalMessages - loadedMessageCount;
      const messagesToLoadNow = Math.min(MESSAGE_BATCH_SIZE, remainingMessages);
      const newLoadedMessageCount = loadedMessageCount + messagesToLoadNow;

      const messagesToLoad = allMessages.slice(-newLoadedMessageCount, -loadedMessageCount);
      const previousScrollHeight = messagesDiv.scrollHeight;

      messagesToLoad.forEach(message => {
          displayMessage(message, true); // Pass true to prepend messages
      });

      loadedMessageCount = newLoadedMessageCount;

      // Maintain scroll position after loading new messages
      messagesDiv.scrollTop = messagesDiv.scrollHeight - previousScrollHeight;
  }
}

/**
* Displays a message in the chat area.
* Parses Markdown for assistant messages.
* @param {object} message - The message object containing role and content.
* @param {boolean} prepend - If true, prepends the message (used for lazy loading).
*/
function displayMessage(message, prepend = false) {
  const messagesDiv = document.getElementById('messages');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', message.role);

  const bubble = document.createElement('div');
  bubble.classList.add('bubble', message.role);

  if (message.role === 'assistant') {
      // Parse Markdown and sanitize HTML
      const rawHTML = marked.parse(message.content);
      const cleanHTML = window.DOMPurify.sanitize(rawHTML);
      bubble.innerHTML = cleanHTML;
  } else {
      // User messages are plain text
      bubble.textContent = message.content;
  }

  messageElement.appendChild(bubble);

  if (prepend) {
      messagesDiv.insertBefore(messageElement, messagesDiv.firstChild.nextSibling); // After search input
  } else {
      messagesDiv.appendChild(messageElement);
  }

  if (!prepend) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

/**
* Clears all messages from the chat area.
*/
function clearMessages() {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
}

/**
* Displays a spinner in the chat area indicating that the assistant is processing.
* @returns {string} - The ID of the spinner element.
*/
function displaySpinner() {
  const messagesDiv = document.getElementById('messages');
  const spinnerElement = document.createElement('div');
  spinnerElement.classList.add('message', 'assistant');
  spinnerElement.id = `spinner-${Date.now()}`;

  const spinner = document.createElement('div');
  spinner.classList.add('spinner-border', 'text-secondary');
  spinner.setAttribute('role', 'status');

  const bubble = document.createElement('div');
  bubble.classList.add('bubble', 'assistant');
  bubble.appendChild(spinner);

  spinnerElement.appendChild(bubble);
  messagesDiv.appendChild(spinnerElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  return spinnerElement.id;
}

/**
* Removes the spinner from the chat area.
* @param {string} spinnerId - The ID of the spinner element to remove.
*/
function removeSpinner(spinnerId) {
  const spinnerElement = document.getElementById(spinnerId);
  if (spinnerElement) {
      spinnerElement.remove();
  }
}

/**
* Processes the user's messages with full context locally using WebLLM.
* @param {number} sessionId - The ID of the current chat session.
* @returns {Promise<object>} - The assistant's reply.
*/
async function processMessageLocally(sessionId) {
  try {
      const engine = await initializeWebLLM();

      // Retrieve all messages for the current session
      const allMessages = await getAllMessages(sessionId);

      // Format messages for the LLM, ensuring system prompt is first
      const formattedMessages = allMessages
          .filter(msg => msg.role !== 'system') // Exclude any existing system prompts
          .map(msg => ({ role: msg.role, content: msg.content }));

      // Prepend system prompt
      formattedMessages.unshift({ role: 'system', content: 'You are a helpful AI assistant.' });

      const reply = await engine.chat.completions.create({
          messages: formattedMessages,
      });

      return { role: 'assistant', content: reply.choices[0].message.content };
  } catch (error) {
      console.error('Error processing message locally:', error);
      return { role: 'assistant', content: 'An error occurred while processing your request.' };
  }
}

/**
* Requests computation from a capable peer with full conversation context.
* @param {number} sessionId - The ID of the current chat session.
* @param {Socket} socket - The Socket.IO client instance.
* @returns {Promise<object>} - A promise that resolves with the assistant's reply.
*/
async function requestComputationWithContext(sessionId, socket) {
  try {
      // Retrieve all messages for the current session
      const allMessages = await getAllMessages(sessionId);

      // Format messages for the peer, ensuring system prompt is first
      const formattedMessages = allMessages
          .filter(msg => msg.role !== 'system') // Exclude any existing system prompts
          .map(msg => ({ role: msg.role, content: msg.content }));

      // Prepend system prompt
      formattedMessages.unshift({ role: 'system', content: 'You are a helpful AI assistant.' });

      // Combine all messages into a single context string
      const context = formattedMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      // Send the entire context to the peer for processing
      const reply = await requestComputation(context, socket);
      return reply;
  } catch (error) {
      console.error('Error requesting computation with context:', error);
      return { role: 'assistant', content: 'An error occurred while processing your request.' };
  }
}

/**
* Updates the online users count badge in the navbar.
* @param {number} count - The number of online users.
*/
function updateOnlineUsersCount(count) {
  const countElement = document.getElementById('online-users-count');
  if (countElement) {
      countElement.textContent = count;
  }
}

/**
* Displays the helping indicator in the navbar.
* Called when the system starts helping another user.
*/
function showHelpingIndicator() {
  const helpingIndicator = document.getElementById('helping-indicator');
  if (helpingIndicator) {
      helpingIndicator.style.display = 'flex';
  }
}

/**
* Hides the helping indicator from the navbar.
* Called when the system finishes helping another user.
*/
function hideHelpingIndicator() {
  const helpingIndicator = document.getElementById('helping-indicator');
  if (helpingIndicator) {
      helpingIndicator.style.display = 'none';
  }
}

/**
* Shows a completion message after helping another user.
*/
function showCompletionMessage() {
  const helpingIndicator = document.getElementById('helping-indicator');
  if (helpingIndicator) {
      helpingIndicator.innerHTML = '<i class="fas fa-check-circle text-success"></i> Task completed!';
      setTimeout(() => {
          helpingIndicator.style.display = 'none';
          helpingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin text-success"></i> Helping...';
      }, 3000); // Hide after 3 seconds
  }
}