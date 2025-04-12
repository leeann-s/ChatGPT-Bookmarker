// Track bookmarked messages
let bookmarks = [];
let listVisible = true;

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

                // Get all messages (in order of appearance)
                const allMessages = Array.from(document.querySelectorAll('div[data-message-author-role="user"], div[data-message-author-role="assistant"]'));

                // Find the index of this assistant message
                const index = allMessages.findIndex(msg => msg.contains(message));

                let lastUserMessage = '';
                for (let i = index - 1; i >= 0; i--) {
                    if (allMessages[i].dataset.messageAuthorRole === 'user') {
                        lastUserMessage = allMessages[i].textContent.trim();
                        break;
                    }
                }

                const questionPreview = lastUserMessage
                    ? lastUserMessage.substring(0, 50) + '...'
                    : 'User question not found';

                // Add a custom name field that initially matches the question preview
                bookmarks.push({
                    element: message,
                    position: message.offsetTop,
                    text: questionPreview,
                    customName: questionPreview // Add customName property
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

    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = 'Collapse List ▲';
    collapseBtn.style.color = 'black'; // or any color like 'white', '#fff', 'red', etc.
    collapseBtn.title = 'Collapse List';
    collapseBtn.style.marginLeft = '8px';
    collapseBtn.style.cursor = 'pointer';
    collapseBtn.style.border = 'none';
    collapseBtn.style.background = 'transparent';


    collapseBtn.addEventListener('click', () => {
        listVisible = !listVisible; // toggle the state
    
        if (listVisible) {
            panel.style.height = 'auto';
            collapseBtn.textContent = 'Collapse List ▲';
            collapseBtn.title = 'Collapse List';
        } else {
            panel.style.height = '90px';
            collapseBtn.textContent = 'Expand List ▼';
            collapseBtn.title = 'Expand List';
        }
    
        updateNavigationPanel();
    });
    
    panel.appendChild(collapseBtn);

    return panel;
} 

// Update navigation panel
function updateNavigationPanel() {
    const panel = document.querySelector('.bookmark-navigation-panel');
    if (!panel) return;

    const bookmarkList = panel.querySelector('.bookmark-list');
    bookmarkList.innerHTML = '';
    bookmarkList.style.visibility = listVisible ? 'visible' : 'hidden';
    bookmarkList.style.display = listVisible ? 'block' : 'none';

    // Add a scroller class to the bookmark list lol
    bookmarkList.className = 'bookmark-list bookmark-scroller';

    bookmarks.forEach((bookmark, index) => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        bookmarkItem.style.display = 'flex';
        bookmarkItem.style.justifyContent = 'space-between';
        bookmarkItem.style.alignItems = 'center';
        bookmarkItem.style.padding = '4px 0';

        // Create the text display element
        const textSpan = document.createElement('span');
        textSpan.className = 'bookmark-text';
        textSpan.textContent = `${index + 1}. ${bookmark.customName || bookmark.text}`;
        textSpan.style.cursor = 'pointer';
        textSpan.style.flex = '1';
        textSpan.style.overflow = 'hidden';
        textSpan.style.textOverflow = 'ellipsis';
        textSpan.style.whiteSpace = 'nowrap';
        textSpan.addEventListener('click', () => {
            bookmark.element.scrollIntoView({ behavior: 'smooth' });
        });

        // Create edit (pencil) button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✏️';
        editBtn.className = 'bookmark-edit-btn';
        editBtn.title = 'Rename bookmark';
        editBtn.style.marginLeft = '4px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.border = 'none';
        editBtn.style.background = 'transparent';
        editBtn.style.fontSize = '12px';
        editBtn.style.padding = '2px';

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Create input field for renaming
            const newName = prompt('Enter new name for this bookmark:', bookmark.customName || bookmark.text);
            
            // Update if not cancelled and not empty
            if (newName !== null && newName.trim() !== '') {
                bookmark.customName = newName.trim();
                updateNavigationPanel();
            }
        });

        // Remove bookmark button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✖';
        removeBtn.title = 'Remove bookmark';
        removeBtn.style.marginLeft = '4px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.border = 'none';
        removeBtn.style.background = 'transparent';
        removeBtn.style.fontSize = '12px';
        removeBtn.style.padding = '2px';

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Remove from bookmarks list
            bookmarks = bookmarks.filter(b => b !== bookmark);

            // Remove bookmark style on the original 🔖 button if it's still in DOM
            const btn = bookmark.element.querySelector('.chatgpt-bookmark-btn');
            if (btn) btn.classList.remove('bookmarked');

            updateNavigationPanel();
        });

        // Add all elements to bookmark item
        bookmarkItem.appendChild(textSpan);
        bookmarkItem.appendChild(editBtn);
        bookmarkItem.appendChild(removeBtn);
        bookmarkList.appendChild(bookmarkItem);
    });

    // Auto-scroll to the bottom of the bookmark list
    bookmarkList.scrollTop = bookmarkList.scrollHeight;

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