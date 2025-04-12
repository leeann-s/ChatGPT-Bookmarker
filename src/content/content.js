// Track bookmarked messages
let bookmarks = [];

// Create and inject bookmark button for each ChatGPT response
function injectBookmarkButtons() {
    // Select all ChatGPT response containers that don't have bookmark buttons yet
    const responses = document.querySelectorAll('.markdown.prose.w-full:not(.bookmarker-processed)');
    
    responses.forEach((response) => {
        // Mark as processed
        response.classList.add('bookmarker-processed');
        
        // Create bookmark button
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'chatgpt-bookmark-btn';
        bookmarkBtn.innerHTML = '🔖';
        bookmarkBtn.title = 'Bookmark this response';
        
        // Add click handler
        bookmarkBtn.addEventListener('click', () => {
            const isBookmarked = bookmarkBtn.classList.contains('bookmarked');
            if (!isBookmarked) {
                bookmarkBtn.classList.add('bookmarked');
                bookmarks.push({
                    element: response,
                    position: response.offsetTop
                });
            } else {
                bookmarkBtn.classList.remove('bookmarked');
                bookmarks = bookmarks.filter(b => b.element !== response);
            }
            updateNavigationPanel(navigationPanel);
        });

        // Insert button at the start of the response
        response.insertAdjacentElement('afterbegin', bookmarkBtn);
    });
}

// Create floating navigation panel
let navigationPanel;

function createNavigationPanel() {
    navigationPanel = document.createElement('div');
    navigationPanel.className = 'bookmark-navigation-panel';
    navigationPanel.innerHTML = `
        <div class="bookmark-nav-header">Bookmarks</div>
        <div class="bookmark-list"></div>
    `;
    document.body.appendChild(navigationPanel);
}

// Update navigation panel with current bookmarks
function updateNavigationPanel(panel) {
    const bookmarkList = panel.querySelector('.bookmark-list');
    bookmarkList.innerHTML = '';
    
    bookmarks.forEach((bookmark, index) => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        bookmarkItem.textContent = `Bookmark ${index + 1}`;
        bookmarkItem.addEventListener('click', () => {
            bookmark.element.scrollIntoView({ behavior: 'smooth' });
        });
        bookmarkList.appendChild(bookmarkItem);
    });
}

// Initialize the extension
function init() {
    createNavigationPanel();
    
    // Watch for new responses (ChatGPT dynamically adds content)
    const observer = new MutationObserver(() => {
        injectBookmarkButtons();
    });
    
    // Start observing the chat container
    const chatContainer = document.querySelector('#__next');
    if (chatContainer) {
        observer.observe(chatContainer, { 
            childList: true, 
            subtree: true 
        });
    }
}

// Start the extension
init(); 