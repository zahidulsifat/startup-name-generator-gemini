import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import styles from "./index.module.css";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hi there! 👋 I\'m your AI startup name generator. What kind of startup are you building?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!inputMessage.trim() && !selectedImage) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputMessage,
      image: selectedImage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        startup: inputMessage,
        image: selectedImage,
      }),
      });
      const data = await response.json();

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: data.result || data.error || 'Sorry, I couldn\'t generate names right now.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: 'Oops! Something went wrong. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  }

  function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeSelectedImage() {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // Here you could convert audio to text using speech recognition API
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>AI Startup Name Generator</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.chatContainer}>
        <header className={styles.chatHeader}>
          <div className={styles.botAvatar}>
            <img src="/logo.png" alt="AI Bot" />
          </div>
          <div className={styles.headerInfo}>
            <h1>AI Startup Generator</h1>
            <span className={styles.status}>Online</span>
          </div>
        </header>

        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${styles[message.type + 'Message']}`}
            >
              <div className={styles.messageContent}>
                {message.type === 'bot' && (
                  <div className={styles.avatar}>
                    <img src="/logo.png" alt="Bot" />
                  </div>
                )}
                <div className={styles.messageBubble}>
                  {message.image && (
                    <div className={styles.imageContainer}>
                      <img src={message.image} alt="Uploaded" className={styles.messageImage} />
                    </div>
                  )}
                  <p>{message.text}</p>
                  <span className={styles.timestamp}>
                    {isClient ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.message} ${styles.botMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.avatar}>
                  <img src="/logo.png" alt="Bot" />
                </div>
                <div className={styles.messageBubble}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputContainer}>
          {selectedImage && (
            <div className={styles.imagePreview}>
              <img src={selectedImage} alt="Selected" className={styles.previewImage} />
              <button
                type="button"
                onClick={removeSelectedImage}
                className={styles.removeImageButton}
              >
                ×
              </button>
            </div>
          )}
          <form onSubmit={sendMessage} className={styles.messageForm}>
            <div className={styles.inputActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className={styles.hiddenFileInput}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.actionButton}
                disabled={isLoading}
                title="Attach image"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                className={`${styles.actionButton} ${isRecording ? styles.recording : ''}`}
                disabled={isLoading}
                title={isRecording ? "Stop recording" : "Start voice recording"}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  {isRecording ? (
                    <path fill="currentColor" d="M6,6H18V18H6V6Z"/>
                  ) : (
                    <path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                  )}
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder="Describe your startup idea..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className={styles.messageInput}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

      <footer className={styles.footer}>
        © <a href="https://zahidulsifat.github.io">Zahidul Sifat</a>. All rights reserved.
      </footer>
    </div>
  );
}
