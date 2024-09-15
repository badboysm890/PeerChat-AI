# PeerChat AI 🚀

![GitHub release (latest by date)](https://img.shields.io/github/v/release/badboysm890/peerchat-ai)
![GitHub stars](https://img.shields.io/github/stars/badboysm890/peerchat-ai)
![GitHub forks](https://img.shields.io/github/forks/badboysm890/peerchat-ai)
![GitHub issues](https://img.shields.io/github/issues/badboysm890/peerchat-ai)
![GitHub license](https://img.shields.io/github/license/badboysm890/peerchat-ai)
![Docker Pulls](https://img.shields.io/docker/pulls/badboysm890/peerchat-ai)

PeerChat AI is a real-time, peer-to-peer chat application powered by AI and WebRTC. It allows users to have private, secure conversations using large language models (LLMs) for intelligent responses. The application runs entirely in the browser with WebGPU acceleration and supports a variety of LLMs that users can choose from, ensuring fast, serverless AI interaction.


## 🌟 Features

- **Real-Time Peer-to-Peer Communication:** Connect with other users directly through WebRTC without a central server handling the data.
- **AI-Powered Conversations:** Utilize a range of Large Language Models (LLMs) locally or offload to capable peers for intelligent chat responses.
- **Model Selection:** Choose from a list of pre-configured LLMs or add your own custom models.
- **Chat Sessions:** Create, save, and delete chat sessions to keep track of different conversations.
- **User Collaboration:** Offload tasks to capable peers and contribute to the network by helping others.
- **Contextual Conversations:** Maintain context across the conversation for more coherent responses.
- **Secure and Private:** No server-side data storage; all computations and chat histories are local.
- **Modern UI with Material Design:** A sleek, user-friendly interface with a focus on usability.

## 🚀 Getting Started

Follow these steps to set up and run PeerChat AI on your local machine using Docker.

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Node.js](https://nodejs.org/) (if running without Docker)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/badboysm890/peerchat-ai.git
cd peerchat-ai
```

#### 2. Running with Docker

Build the Docker image and run the container:

```bash
docker build -t peerchat-ai .
docker run -p 3000:3000 --name peerchat-ai-container peerchat-ai
```

Visit `http://localhost:3000` in your browser to start using PeerChat AI!

#### 3. Running Locally

If you prefer to run the application without Docker, follow these steps:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm run start
   ```

Visit `http://localhost:3000` in your browser to start chatting.

## 📄 Configuration

- **Model List Configuration:** Customize your available LLMs in the `model_list.js` file.
- **IndexedDB for Chat History:** The application uses IndexedDB for storing chat sessions. Manage sessions directly in the UI.

## 🛠️ Development

### File Structure

- `frontend/`: Contains all the frontend code including HTML, CSS, and JavaScript files.
- `backend/`: Contains the server code for handling socket connections and peer management.
- `Dockerfile`: Docker configuration to build and run the project easily.
- `README.md`: Project documentation.

### Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Acknowledgements

- [WebLLM](https://github.com/mlc-ai/web-llm) for the in-browser LLM inference engine.
- [SimplePeer](https://github.com/feross/simple-peer) for WebRTC-based peer-to-peer connections.
- [Socket.IO](https://socket.io/) for real-time bidirectional event-based communication.

## 📧 Contact

Feel free to reach out with any questions or feedback:

- **Praveen G**: [praveensm890@gmail.com](mailto:praveensm890@gmail.com)

## 🌐 Follow Us

Stay up to date with our project by following us on [GitHub](https://github.com/badboysm890/peerchat-ai) and [Twitter](https://twitter.com/BadBoy17G)!

---

Made with ❤️ by [BadBoysm890](https://github.com/badboysm890)
