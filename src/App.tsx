import {useState} from 'react'
import './App.css'
import OpenAI from "openai";

console.log('API Key exists:', !!import.meta.env.VITE_OPEN_AI_API_KEY)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: true
});
console.log(openai);

const TEMPERATURE = 0.69;
const MAX_TOKENS = 250;

function App() {
  const [colour, setColour] = useState('red');

  const onclick = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (color) => {
          document.body.style.backgroundColor = color;
        },
        args: [colour]
      });
    } catch (error) {
      console.error('Error changing color:', error);
    }
  };

  const getText = async (): Promise<string> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error("No active tab found");

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText,
    });

    if (!result?.[0]?.result) {
      throw new Error("Failed to retrieve text content from the page.");
    }
    return result[0].result;
  };

  const summarizeAPI = async () => {
    try {
      const text = await getText();
      console.log("Extracted Text:", text);
      const summary = await gpt_call(text);
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (summary) => {
          alert(summary);
        },
        args: [summary]
      });
    } catch (error) {
      console.error("Error summarizing:", error);
      alert('Error summarizing content. Please try again.');
    }
  };

  const gpt_call = async (context: string): Promise<string> => {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',  // or 'gpt-3.5-turbo' depending on your needs
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Please summarize the content of this webpage:\n${context}` }
        ],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      });
      return completion.choices[0].message.content || 'No summary generated';
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw new Error('Failed to generate summary');
    }
  };

  return (
    <div className="container">
      <h1>API Summarizer</h1>
      <div className="card">
        <input 
          type="color" 
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          className="color-picker"
        />
        <button onClick={onclick} className="button">
          Change Background Color
        </button>
      </div>
      <div className="card">
        <h2>Page Summarizer</h2>
        <p>Click below to generate a summary of the current page</p>
        <button onClick={summarizeAPI} className="button">
          Summarize Page
        </button>
      </div>
    </div>
  );
}

export default App