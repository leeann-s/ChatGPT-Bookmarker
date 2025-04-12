// Track bookmarked messages and subparts
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
                    customName: questionPreview, // Add customName property
                    type: 'full'  // Mark as full message bookmark
                });

            } else {
                bookmarkBtn.classList.remove('bookmarked');
                // Remove this full message bookmark and any subpart bookmarks from this message
                bookmarks = bookmarks.filter(b => !(b.element === message || (b.parentMessage && b.parentMessage === message)));
            }

            updateNavigationPanel();
        });

        // Add button to container
        bookmarkContainer.appendChild(bookmarkBtn);

        // Make sure the message container is properly positioned
        message.style.position = 'relative';

        // Insert container at the start of the message
        message.insertAdjacentElement('afterbegin', bookmarkContainer);

        // Now process paragraph subparts for this message
        injectSubpartBookmarks(message);
    });
}

// Function to inject subpart bookmarks
function injectSubpartBookmarks(message) {
    // Find paragraphs, lists, code blocks, etc. that can be bookmarked separately
    const subparts = message.querySelectorAll('p, ul, ol, pre, blockquote, h1, h2, h3, h4, h5, h6, table');
    
    subparts.forEach((subpart) => {
        // Skip if already processed
        if (subpart.classList.contains('subpart-processed')) {
            return;
        }
        
        // Mark as processed
        subpart.classList.add('subpart-processed');
        
        // Make sure the subpart is properly positioned
        if (getComputedStyle(subpart).position === 'static') {
            subpart.style.position = 'relative';
        }
        
        // Create subpart bookmark button (smaller than the main bookmark)
        const subpartBtn = document.createElement('button');
        subpartBtn.className = 'subpart-bookmark-btn';
        subpartBtn.innerHTML = '🔖';
        subpartBtn.title = 'Bookmark this section';
        subpartBtn.style.cssText = `
            position: absolute;
            right: -25px;
            top: 0;
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
            padding: 2px;
            z-index: 9999;
        `;
        
        // Show button on hover
        subpart.addEventListener('mouseenter', () => {
            subpartBtn.style.opacity = '0.7';
        });
        
        subpart.addEventListener('mouseleave', () => {
            if (!subpartBtn.classList.contains('bookmarked')) {
                subpartBtn.style.opacity = '0';
            }
        });
        
        // Add click handler
        subpartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isBookmarked = subpartBtn.classList.contains('bookmarked');
            
            if (!isBookmarked) {
                subpartBtn.classList.add('bookmarked');
                subpartBtn.style.opacity = '1';
                
                // Get the text content for this subpart
                let subpartText = subpart.textContent.trim();
                const subpartPreview = subpartText.length > 50 
                    ? subpartText.substring(0, 50) + '...' 
                    : subpartText;
                
                // Add to bookmarks
                bookmarks.push({
                    element: subpart,
                    parentMessage: message,  // Track parent message for better organization
                    position: subpart.offsetTop,
                    text: subpartPreview,
                    customName: subpartPreview,
                    type: 'subpart'  // Mark as subpart bookmark
                });
            } else {
                subpartBtn.classList.remove('bookmarked');
                subpartBtn.style.opacity = '0.7';  // Keep visible while hovering
                
                // Remove from bookmarks
                bookmarks = bookmarks.filter(b => b.element !== subpart);
            }
            
            updateNavigationPanel();
        });
        
        // Add to DOM
        subpart.appendChild(subpartBtn);
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
    <div class="bookmark-nav-header" style="display: flex; justify-content: space-between; align-items: center;">
        <span>Bookmarks</span>
        <span class="collapse-btn-container"></span>
    </div>
    <div class="bookmark-actions" style="display: flex; justify-content: flex-end; margin-bottom: 8px;"></div>
    <div class="bookmark-list"></div>
`;

    document.body.appendChild(panel);

    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = 'Collapse ▲'; 
    collapseBtn.title = 'Collapse';
    collapseBtn.style.marginLeft = '0px';
    collapseBtn.style.cursor = 'pointer';
    collapseBtn.style.border = 'none';
    collapseBtn.style.background = 'transparent';
    collapseBtn.className = 'collapse-button';

    collapseBtn.addEventListener('click', () => {
        listVisible = !listVisible; // toggle the state

        if (listVisible) {
            panel.style.height = 'auto';
            collapseBtn.textContent = 'Collapse ▲';
            collapseBtn.title = 'Collapse';
        } else {
            panel.style.height = '63px';
            collapseBtn.textContent = 'Expand ▼';
            collapseBtn.title = 'Expand';
        }

        updateNavigationPanel();
    });
    // Attach collapse button to header push
    panel.querySelector('.collapse-btn-container').appendChild(collapseBtn);
    
    // Add Clear All button
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'clear-all-btn';
    clearAllBtn.textContent = 'Clear All';
    clearAllBtn.title = 'Remove all bookmarks';
    clearAllBtn.style.cssText = `
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
    `;
    
    clearAllBtn.addEventListener('mouseenter', () => {
        clearAllBtn.style.background = '#e5e7eb';
    });
    
    clearAllBtn.addEventListener('mouseleave', () => {
        clearAllBtn.style.background = '#f3f4f6';
    });
    
    clearAllBtn.addEventListener('click', () => {
        if (bookmarks.length === 0) return;
        
        if (confirm('Are you sure you want to clear all bookmarks?')) {
            // Remove all bookmarked styles
            document.querySelectorAll('.chatgpt-bookmark-btn.bookmarked').forEach(btn => {
                btn.classList.remove('bookmarked');
            });
            
            document.querySelectorAll('.subpart-bookmark-btn.bookmarked').forEach(btn => {
                btn.classList.remove('bookmarked');
                btn.style.opacity = '0';
            });
            
            // Clear bookmarks array
            bookmarks = [];
            updateNavigationPanel();
        }
    });
    
    // Attach clear all button to actions container
    panel.querySelector('.bookmark-actions').appendChild(clearAllBtn);

    return panel;
}

// Helper function to group bookmarks by parent message
function groupBookmarksByParent() {
    const groups = [];
    const fullBookmarks = bookmarks.filter(b => b.type === 'full');
    const subpartBookmarks = bookmarks.filter(b => b.type === 'subpart');
    
    // First add all full message bookmarks
    groups.push(...fullBookmarks.map(bookmark => ({
        isGroup: false,
        bookmark
    })));
    
    // Then add any subpart bookmarks that don't have a parent in bookmarks
    subpartBookmarks.forEach(bookmark => {
        // Check if parent is bookmarked
        const parentIndex = fullBookmarks.findIndex(fb => fb.element === bookmark.parentMessage);
        
        if (parentIndex === -1) {
            // Parent not bookmarked, add as standalone
            groups.push({
                isGroup: false,
                bookmark
            });
        } else {
            // Parent is bookmarked, add to existing group or create new group
            const groupIndex = groups.findIndex(g => g.isGroup && g.parentBookmark === fullBookmarks[parentIndex]);
            
            if (groupIndex === -1) {
                // Create new group
                groups.push({
                    isGroup: true,
                    parentBookmark: fullBookmarks[parentIndex],
                    childBookmarks: [bookmark]
                });
            } else {
                // Add to existing group
                groups[groupIndex].childBookmarks.push(bookmark);
            }
        }
    });
    
    return groups;
}

// Update navigation panel
function updateNavigationPanel() {
    const panel = document.querySelector('.bookmark-navigation-panel');
    if (!panel) return;

    const bookmarkList = panel.querySelector('.bookmark-list');
    bookmarkList.innerHTML = '';
    bookmarkList.style.visibility = listVisible ? 'visible' : 'hidden';
    bookmarkList.style.display = listVisible ? 'block' : 'none';

    // Show/hide Clear All button based on bookmarks count
    const clearAllBtn = panel.querySelector('.clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.style.visibility = bookmarks.length > 0 ? 'visible' : 'hidden';
    }

    // Add a scroller class to the bookmark list
    bookmarkList.className = 'bookmark-list bookmark-scroller';

    if (bookmarks.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No bookmarks yet. Click the 🔖 icon to add bookmarks.';
        bookmarkList.appendChild(emptyState);
        return;
    }

    // Group bookmarks by parent message
    const groupedBookmarks = groupBookmarksByParent();
    
    groupedBookmarks.forEach((group, groupIndex) => {
        if (!group.isGroup) {
            // Single bookmark (either full message or orphaned subpart)
            createBookmarkItem(bookmarkList, group.bookmark, groupIndex);
        } else {
            // Create parent bookmark item
            const parentItem = createBookmarkItem(bookmarkList, group.parentBookmark, groupIndex);
            parentItem.classList.add('parent-bookmark');
            
            // Create container for child bookmarks
            const childContainer = document.createElement('div');
            childContainer.className = 'child-bookmarks';
            childContainer.style.paddingLeft = '15px';
            childContainer.style.borderLeft = '1px solid #e5e5e6';
            childContainer.style.marginLeft = '8px';
            
            // Add child bookmarks
            group.childBookmarks.forEach((childBookmark, childIndex) => {
                const childItem = createBookmarkItem(childContainer, childBookmark, `${groupIndex}-${childIndex}`, true);
                childItem.classList.add('child-bookmark');
            });
            
            // Add child container after parent
            parentItem.after(childContainer);
        }
    });

    // Auto-scroll to the bottom of the bookmark list
    bookmarkList.scrollTop = bookmarkList.scrollHeight;
}

// Helper function to create bookmark items
function createBookmarkItem(container, bookmark, index, isChild = false) {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';
    bookmarkItem.style.display = 'flex';
    bookmarkItem.style.justifyContent = 'space-between';
    bookmarkItem.style.alignItems = 'center';
    bookmarkItem.style.padding = '4px 0';
    
    if (isChild) {
        bookmarkItem.style.fontSize = '0.9em';
        bookmarkItem.style.marginTop = '4px';
    }

    // Create the text display element
    const textSpan = document.createElement('span');
    textSpan.className = 'bookmark-text';
    const prefix = isChild ? '↳ ' : `${index + 1}. `;
    textSpan.textContent = `${prefix}${bookmark.customName || bookmark.text}`;
    textSpan.style.cursor = 'pointer';
    textSpan.style.flex = '1';
    textSpan.style.overflow = 'hidden';
    textSpan.style.textOverflow = 'ellipsis';
    textSpan.style.whiteSpace = 'nowrap';
    textSpan.addEventListener('click', () => {
        bookmark.element.scrollIntoView({ behavior: 'smooth' });
        
        // Flash effect instead of sustained highlight
        const originalBackground = bookmark.element.style.background;
        bookmark.element.style.background = 'rgba(16, 163, 127, 0.2)';
        setTimeout(() => {
            bookmark.element.style.background = originalBackground;
        }, 800); // shorter flash duration
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

        // Remove bookmark style on the original button if it's still in DOM
        if (bookmark.type === 'full') {
            const btn = bookmark.element.querySelector('.chatgpt-bookmark-btn');
            if (btn) btn.classList.remove('bookmarked');
        } else if (bookmark.type === 'subpart') {
            const btn = bookmark.element.querySelector('.subpart-bookmark-btn');
            if (btn) {
                btn.classList.remove('bookmarked');
                btn.style.opacity = '0';
            }
        }

        updateNavigationPanel();
    });

    // Add all elements to bookmark item
    bookmarkItem.appendChild(textSpan);
    bookmarkItem.appendChild(editBtn);
    bookmarkItem.appendChild(removeBtn);
    container.appendChild(bookmarkItem);
    
    return bookmarkItem;
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