import './App.css'
import OpenAI from "openai";
import { useState } from 'react';

console.log('API Key exists:', !!import.meta.env.VITE_OPEN_AI_API_KEY)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: true
});

const TEMPERATURE = 0.69;
const MAX_TOKENS = 500;

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Select Language');
  const [summaryLength, setSummaryLength] = useState('');

  const DEFAULT_SUMMARY_LENGTH = 150;

  const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Latvian'];

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setIsOpen(false);
  };

  const handleSummaryLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setSummaryLength(value);
    }
  };

  const getValidSummaryLength = () => {
    const length = parseInt(summaryLength);
    if (!summaryLength || isNaN(length) || length <= 0) {
      return DEFAULT_SUMMARY_LENGTH;
    }
    return length;
  };

  const createPopupWindow = async (summary: string) => {
    try {
      // Create HTML content for the popup
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Page Summary</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 16px;
                background-color: white;
                overflow: auto;
                height: 100vh;
              }
              .summary-container {
                background-color: white;
                border-radius: 8px;
                height: 100%;
              }
              h1 {
                color: #333;
                margin: 0 0 16px 0;
                font-size: 18px;
              }
              .summary-text {
                color: #444;
                font-size: 14px;
                line-height: 1.5;
                text-align: justify;
              }
              .drag-handle {
                -webkit-app-region: drag;
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 20px;
                background: #f5f5f5;
                border-bottom: 1px solid #ddd;
              }
            </style>
          </head>
          <body>
            <div class="drag-handle"></div>
            <div class="summary-container">
              <h1>Page Summary</h1>
              <div class="summary-text">${summary}</div>
            </div>
          </body>
        </html>
      `;

      // Create a Blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Get the current window position to place the popup relative to it
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentWindow = await chrome.windows.get(currentTab.windowId);

      // Calculate position for the popup (offset from the current window)
      const left = (currentWindow.left || 0) + 50;
      const top = (currentWindow.top || 0) + 50;

      // Create the popup window
      await chrome.windows.create({
        url: url,
        type: 'popup',
        width: 400,
        height: 500,
        left,
        top,
        focused: true
      });

      // Clean up the Blob URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating popup window:', error);
      alert(`Failed to create popup: ${error}`);
    }
  };

  const getText = async (): Promise<string> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error("No active tab found");

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText || document.body.textContent,
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
      await createPopupWindow(summary);
    } catch (error) {
      console.error("Error summarizing:", error);
      alert(error);
    }
  };

  const gpt_call = async (context: string): Promise<string> => {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Please write an effective and informative
            summary of the content of this webpage in ${selectedLanguage} that is 
            NO more than ${summaryLength} words, but feel free to use LESS if 
            APPROPIATE:\n${context}` }
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

  // Rest of your component's JSX remains the same
  return (
    <div className="container">
      <h1>API Summarizer</h1>
      <div className="card">
        <h2>Page Summarizer</h2>
        <div>
          <div className="input-container" style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder={`Enter Summary Length`}
              value={summaryLength}
              onChange={handleSummaryLengthChange}
              style={{ width: '100%' }}
            />
            {summaryLength && (
              <span style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.8em',
                color: getValidSummaryLength() === DEFAULT_SUMMARY_LENGTH ? '#666' : '#008000'
              }}>
                {getValidSummaryLength()} words
              </span>
            )}
          </div>
          <div className="dropdown" style={{ 
            marginTop: "2rem",
            marginBottom: "2rem",
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minWidth: "15rem",
            position: 'relative'
          }}>
            <div 
              className={`select ${isOpen ? 'select-clicked' : ''}`}
              onClick={toggleDropdown}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "2px solid",
                padding: "1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <span>{selectedLanguage}</span>
              <div className="caret" style={{
                width: "0",
                height: "0",
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid #fff",
                marginLeft: "5px",
                transition: "all 0.3s ease",
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              }}></div>
            </div>
            {isOpen && (
              <ul className="dropdown-menu" style={{
                listStyle: "none",
                padding: "0.2rem 0.5rem",
                border: "2px solid",
                position: "absolute",
                boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.2)",
                borderRadius: "0.5rem",
                width: "100%",
                top: "3rem",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "white",
                zIndex: "1",
              }}>
                {languages.map((language) => (
                  <li 
                    key={language}
                    onClick={() => handleLanguageSelect(language)}
                    style={{
                      padding: "0.7rem",
                      cursor: "pointer",
                      borderRadius: "0.3rem",
                    }}
                    onMouseOver={(e: React.MouseEvent<HTMLLIElement>) => {
                      (e.target as HTMLLIElement).style.backgroundColor = "#f0f0f0";
                    }}
                    onMouseOut={(e: React.MouseEvent<HTMLLIElement>) => {
                      (e.target as HTMLLIElement).style.backgroundColor = "transparent";
                    }}
                  >
                    {language}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p>Click below to generate a summary of the current page</p>
        <button onClick={summarizeAPI} className="button">
          Summarize Page
        </button>
      </div>
    </div>
  );
}

export default App