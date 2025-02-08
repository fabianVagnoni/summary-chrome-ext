chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "changeColor") {
      const { color } = message;
  
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            args: [color],
            func: (selectedColor) => {
              document.body.style.backgroundColor = selectedColor;
            },
          });
        }
      });
  
      sendResponse({ status: "success" });
    }
  });
  