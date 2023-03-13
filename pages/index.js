import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

export default function Home() {
  const [startupInput, setStartupInput] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [result, setResult] = useState();

  async function onSubmit(event) {
    event.preventDefault();
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startup: startupInput,
        openaiApiKey: openaiApiKey,
      }),
    });
    const data = await response.json();
    setResult(data.result);
    setStartupInput("");
  }

  return (
    <div>
      <Head>
        <title>Startup Name Generator OpenAI</title>
        <link rel="icon" href="/logo.png" />
      </Head>

      <main className={styles.main}>
        <img src="/logo.png" className={styles.icon} />
        <h3>Name Your Startup</h3>
        <p>Here you can generate your startup names</p>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            name="startup"
            placeholder="Enter a startup domain"
            value={startupInput}
            onChange={(e) => setStartupInput(e.target.value)}
          />
          <input type="submit" value="Generate names" />
        </form>
        <div className={styles.result}>{result}</div>
        <iframe
          width="336"
          height="189"
          src="https://zahidulsifat.github.io"
          title="Web video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </main>
      <footer className={styles.footer}>
        Made by <a href="https://zahidulsifat.github.io">Zahidul Sifat</a>
      </footer>
    </div>
  );
}
