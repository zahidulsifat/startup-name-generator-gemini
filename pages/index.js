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
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setIsClient(true);
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!inputMessage.trim() && !selectedImage && !recordedAudio) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputMessage || (recordedAudio ? '🎤 Voice message' : ''),
      image: selectedImage,
      audio: recordedAudio,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setSelectedImage(null);
    const audioToSend = recordedAudio;
    setRecordedAudio(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        startup: inputMessage,
        image: selectedImage,
        audio: audioToSend,
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

  function compressImage(file, maxSizeKB = 300) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 512;
        const maxHeight = 512;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  async function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const compressedImage = await compressImage(file);
        setSelectedImage(compressedImage);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original method
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  function removeSelectedImage() {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeRecordedAudio() {
    setRecordedAudio(null);
  }

  async function startRecording() {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording is not supported on this device/browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Try different MIME types for better mobile compatibility
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const audioChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = (e) => {
          setRecordedAudio(e.target.result);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      let errorMessage = 'Could not access microphone. ';

      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone permission in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Microphone is being used by another application.';
      } else {
        errorMessage += 'Please try again or check your device settings.';
      }

      alert(errorMessage);
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

  function toggleDarkMode() {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  }

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkMode : ''}`}>
      <Head>
        <title>AI Startup Name Generator</title>
        <link rel="icon" href="/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={`${styles.chatContainer} ${isDarkMode ? styles.darkMode : ''}`}>
        <header className={styles.chatHeader}>
          <div className={styles.botAvatar}>
            <img src="/logo.png" alt="AI Bot" />
          </div>
          <div className={styles.headerInfo}>
            <h1>AI Startup Generator</h1>
            <span className={styles.status}>Online</span>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`${styles.darkModeToggle} ${isDarkMode ? styles.darkMode : ''}`}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.34,17L5.11,13.21C5.25,14 5.5,14.76 5.94,15.5C6.36,16.22 6.9,16.84 7.5,17.35L3.34,17M20.66,7L18.89,10.79C18.75,10 18.5,9.24 18.06,8.5C17.64,7.78 17.1,7.15 16.5,6.65L20.66,7M20.66,17L16.5,17.35C17.1,16.84 17.64,16.22 18.06,15.5C18.5,14.76 18.75,14 18.89,13.21L20.66,17M12,22L9.61,18.58C10.35,18.85 11.16,19 12,19C12.84,19 13.65,18.85 14.39,18.58L12,22Z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"/>
              </svg>
            )}
          </button>
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
                  {message.audio && (
                    <div className={styles.audioContainer}>
                      <audio controls src={message.audio} className={styles.messageAudio} />
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
          {recordedAudio && (
            <div className={styles.audioPreview}>
              <div className={styles.audioInfo}>
                <span>🎤 Audio recorded</span>
                <audio controls src={recordedAudio} className={styles.audioPlayer} />
              </div>
              <button
                type="button"
                onClick={removeRecordedAudio}
                className={styles.removeAudioButton}
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
                title={isRecording ? "Tap to stop recording" : "Tap to start voice recording"}
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
            <div className={styles.inputRow}>
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
                disabled={isLoading || (!inputMessage.trim() && !selectedImage && !recordedAudio)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer className={styles.footer}>
        © <a href="https://zahidulsifat.github.io">Zahidul Sifat</a>. All rights reserved.
      </footer>
    </div>
  );
}
