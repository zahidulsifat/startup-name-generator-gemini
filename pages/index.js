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
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef(null);

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
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startup: inputMessage,
          openaiApiKey: openaiApiKey,
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
          {showApiKeyInput && (
            <div className={styles.apiKeySection}>
              <input
                type="password"
                placeholder="🔑 Enter your OpenAI API key"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                className={styles.apiKeyInput}
              />
              <button
                onClick={() => setShowApiKeyInput(false)}
                className={styles.hideApiKey}
                disabled={!openaiApiKey}
              >
                ✓
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className={styles.messageForm}>
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
              disabled={isLoading || !inputMessage.trim()}
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
