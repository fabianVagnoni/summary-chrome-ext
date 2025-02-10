import './App.css'
import OpenAI from "openai";
import { useState } from 'react';

console.log('API Key exists:', !!import.meta.env.VITE_OPEN_AI_API_KEY)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: true
});
console.log(openai);

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

  const handleLanguageSelect = (language:string) => {
    setSelectedLanguage(language);
    setIsOpen(false);
  };

  const handleSummaryLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and empty string
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

  const injectModal = async (summary: string) => {
    // Get the current active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        console.error('No tab ID found');
        return;
    }
    
  
    // Execute script in the context of the webpage
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (summaryText) => {
        try {
          // Check if modal container already exists
          let modalContainer = document.getElementById('extension-modal-container');
          if (!modalContainer) {
            // If not, create it
            modalContainer = document.createElement('div');
            modalContainer.id = 'extension-modal-container';
            document.body.insertBefore(modalContainer, document.body.firstChild);
          }
    
          // Create the HTML structure for the modal
          const modalHTML = `
            <div class="modal-overlay">
              <button class="modal-close">×</button>
              <div class="modal-content">
                <h3 style="margin-top: 2px; 
                margin-bottom: 5px;
                font-size: 30px;
                font-color: black">Page Summary</h3>
                <p class="modal-text">${summaryText}</p>
              </div>
            </div>
          `;
    
          // Insert the modal HTML into the container
          modalContainer.innerHTML = modalHTML;
    
          // Create and add styles to the page
          const styles = document.createElement('style');
          styles.textContent = `
            .modal-overlay {
              position: relative;     // Changed from 'fixed' to 'absolute'
              top: 20px;             // Instead of 0, give it some spacing from top
              right: 20px;           // Position it in the top-right corner
              width: 300px;          // Set a specific width
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              z-index: 9999;
              padding: 15px;
              border: 1px solid #ddd;
            }

            .modal-content {
              position: relative;
              width: 100%;
              max-height: 400px;     // Limit maximum height
              overflow-y: auto;      // Allow scrolling if content is too long
            }

            .modal-close {
              position: absolute;
              top: 10px;
              right: 10px;
              border: none;
              background: none;
              font-size: 30px;
              cursor: pointer;
              color: #666;
            }

            .modal-close:hover {
              color: #333;
            }
            .modal-text {
              font-size: small;
              text-align: justify;
              margin = 3px;
            }
          `;
          document.head.appendChild(styles);

          // Add event listeners for closing
          const closeBtn = modalContainer.querySelector('.modal-close');
          const overlay = modalContainer.querySelector('.modal-overlay');
          
          if (closeBtn && overlay) {
            closeBtn.addEventListener('click', () => {
              try {
                modalContainer.remove();
              } catch (error) {
                console.error('Error removing modal:', error);
              }
            });
          }
      } catch (error) {
        console.error('Error in injected script:', error);
        throw error; // Re-throw to be caught by the outer try-catch
      }
        },
        args: [summary]
      }).catch(error => {
        console.error('Error executing script:', error);
        throw error; // Re-throw to be caught by the outer try-catch
      });
      } catch (error) {
        console.error('Error in injectModal:', error);
        alert(`Failed to show modal: ${error}`);
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
      await injectModal(summary);
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