document.getElementById('activate').addEventListener('click', async () => {
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Debug logging
        console.log('Tab info:', {
            id: tab.id,
            url: tab.url,
            status: tab.status
        });

        // Check if we're on ChatGPT - check both possible URLs
        const isChatGPT = tab.url && (
            tab.url.includes('chat.openai.com') || 
            tab.url.includes('chatgpt.com')
        );
        console.log('Is ChatGPT page:', isChatGPT);

        if (!isChatGPT) {
            document.getElementById('status').textContent = 'Please open ChatGPT to use this extension';
            return;
        }

        // Update status
        document.getElementById('status').textContent = 'Injecting scripts...';

        // Inject the content script
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['/src/content/content.js']
        });

        // Inject the CSS
        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['/src/content/styles.css']
        });

        document.getElementById('status').textContent = 'Bookmarker activated! You can close this popup.';
    } catch (error) {
        console.error('Activation error:', error);
        document.getElementById('status').textContent = 'Error: ' + error.message;
    }
});

// Add immediate execution when popup opens
document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup opened');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            console.log('Current URL:', tabs[0].url);
        } else {
            console.log('No active tab found');
        }
    });
}); 