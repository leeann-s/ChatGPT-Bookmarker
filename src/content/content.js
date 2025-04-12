// Track bookmarked messages
let bookmarks = [];

// Helper function to wait for elements to appear
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout waiting for ${selector}`));
                return;
            }
            
            requestAnimationFrame(checkElement);
        };
        
        checkElement();
    });
}

// Create and inject bookmark button for each ChatGPT response
function injectBookmarkButtons() {
    // Try to find all message containers
    const messages = document.querySelectorAll('div[class*="prose"]');
    console.log('Found messages:', messages.length);
    
    messages.forEach((message) => {
        // Skip if already processed
        if (message.classList.contains('bookmarker-processed')) {
            return;
        }
        
        // Skip if it's not an assistant message
        const isAssistantMessage = message.closest('div[data-message-author-role="assistant"]');
        if (!isAssistantMessage) {
            return;
        }
        
        console.log('Processing message:', message);
        
        // Mark as processed
        message.classList.add('bookmarker-processed');
        
        // Create bookmark container
        const bookmarkContainer = document.createElement('div');
        bookmarkContainer.className = 'bookmark-container';
        bookmarkContainer.style.cssText = `
            position: absolute;
            right: 0;
            top: 0;
            padding: 8px;
            z-index: 1000;
        `;
        
        // Create bookmark button
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'chatgpt-bookmark-btn';
        bookmarkBtn.innerHTML = '🔖';
        bookmarkBtn.title = 'Bookmark this response';
        
        // Add click handler
        bookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isBookmarked = bookmarkBtn.classList.contains('bookmarked');
            if (!isBookmarked) {
                bookmarkBtn.classList.add('bookmarked');
                bookmarks.push({
                    element: message,
                    position: message.offsetTop,
                    text: message.textContent.substring(0, 50) + '...'
                });
            } else {
                bookmarkBtn.classList.remove('bookmarked');
                bookmarks = bookmarks.filter(b => b.element !== message);
            }
            updateNavigationPanel();
        });
        
        // Add button to container
        bookmarkContainer.appendChild(bookmarkBtn);
        
        // Make sure the message container is properly positioned
        message.style.position = 'relative';
        
        // Insert container at the start of the message
        message.insertAdjacentElement('afterbegin', bookmarkContainer);
    });
}

// Create floating navigation panel
function createNavigationPanel() {
    if (document.querySelector('.bookmark-navigation-panel')) {
        return;
    }
    
    const panel = document.createElement('div');
    panel.className = 'bookmark-navigation-panel';
    panel.innerHTML = `
        <div class="bookmark-nav-header">Bookmarks</div>
        <div class="bookmark-list"></div>
    `;
    
    document.body.appendChild(panel);
    return panel;
}

// Update navigation panel
function updateNavigationPanel() {
    const panel = document.querySelector('.bookmark-navigation-panel');
    if (!panel) return;
    
    const bookmarkList = panel.querySelector('.bookmark-list');
    bookmarkList.innerHTML = '';
    
    bookmarks.forEach((bookmark, index) => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        bookmarkItem.textContent = `${index + 1}. ${bookmark.text}`;
        bookmarkItem.addEventListener('click', () => {
            bookmark.element.scrollIntoView({ behavior: 'smooth' });
        });
        bookmarkList.appendChild(bookmarkItem);
    });
}

// Initialize the extension
async function init() {
    console.log('ChatGPT Bookmarker initializing...');
    
    try {
        // Wait for the main chat container
        await waitForElement('div[class*="prose"]');
        
        // Create navigation panel
        createNavigationPanel();
        
        // Initial injection of bookmark buttons
        injectBookmarkButtons();
        
        // Set up observer for new messages
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    injectBookmarkButtons();
                }
            }
        });
        
        // Start observing the chat container
        const chatContainer = document.querySelector('main');
        if (chatContainer) {
            observer.observe(chatContainer, {
                childList: true,
                subtree: true
            });
        }
        
        console.log('ChatGPT Bookmarker initialized successfully');
    } catch (error) {
        console.error('Error initializing ChatGPT Bookmarker:', error);
    }
}

// Start the extension
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Add a message to verify the script is loaded
console.log('ChatGPT Bookmarker script loaded'); 