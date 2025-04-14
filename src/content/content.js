// Track bookmarked messages and subparts
let bookmarks = [];
let listVisible = true;

// Helper function to reset any stuck highlights
function resetStuckHighlights() {
    document.querySelectorAll('div[class*="prose"]').forEach(element => {
        if (element.style.background === 'rgba(16, 163, 127, 0.2)') {
            element.style.background = '';
        }
    });
    
    document.querySelectorAll('p, ul, ol, pre, blockquote, h1, h2, h3, h4, h5, h6, table').forEach(element => {
        if (element.style.background === 'rgba(16, 163, 127, 0.2)') {
            element.style.background = '';
        }
    });
}

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
            right: -10px;
            top: 0;
            padding: 8px;
            z-index: 1000;
        `;

        // Create bookmark button
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'chatgpt-bookmark-btn';
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
                    customName: questionPreview,
                    type: 'full'
                });

            } else {
                bookmarkBtn.classList.remove('bookmarked');
                // Remove only this full message bookmark, keep subpart bookmarks
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

        // Now process paragraph subparts for this message
        injectSubpartBookmarks(message);
    });
}

// Function to inject subpart bookmarks
function injectSubpartBookmarks(message) {
    // Find paragraphs, lists, code blocks, etc. that can be bookmarked separately
    const subparts = message.querySelectorAll('p, ul, ol, pre, blockquote, h1, h2, h3, h4, h5, h6, table');
    
    // Get the bookmark container to check its position
    const bookmarkContainer = message.querySelector('.bookmark-container');
    const bookmarkContainerRect = bookmarkContainer ? bookmarkContainer.getBoundingClientRect() : null;
    
    subparts.forEach((subpart) => {
        // Skip if already processed
        if (subpart.classList.contains('subpart-processed')) {
            return;
        }
        
        // Get the subpart's position
        const subpartRect = subpart.getBoundingClientRect();
        
        // Skip if this subpart is directly next to a main bookmark button
        if (bookmarkContainerRect) {
            // Check if the subpart is in the same area as the bookmark container
            const isNearBookmarkContainer = 
                Math.abs(subpartRect.top - bookmarkContainerRect.top) < 30 && 
                Math.abs(subpartRect.right - bookmarkContainerRect.right) < 50;
                
            if (isNearBookmarkContainer) {
                return;
            }
        }
        
        // Skip if this subpart is the first child of the message (where the main bookmark is)
        if (subpart === message.firstElementChild || 
            (message.firstElementChild && message.firstElementChild.contains(subpart))) {
            return;
        }
        
        // Skip if this subpart is within the first 50px from the top of the message
        if (subpartRect.top - message.getBoundingClientRect().top < 50) {
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
        subpartBtn.title = 'Bookmark this section';
        
        // Show button on hover
        subpart.addEventListener('mouseenter', () => {
            if (!subpartBtn.classList.contains('bookmarked')) {
                subpartBtn.style.opacity = '0.7';
            }
        });
        
        subpart.addEventListener('mouseleave', (e) => {
            // Check if we're not hovering over the button itself
            if (!subpartBtn.contains(e.relatedTarget) && !subpartBtn.classList.contains('bookmarked')) {
                subpartBtn.style.opacity = '0';
            }
        });
        
        // Add hover handler for the button itself
        subpartBtn.addEventListener('mouseenter', () => {
            if (!subpartBtn.classList.contains('bookmarked')) {
                subpartBtn.style.opacity = '1';
            }
        });
        
        subpartBtn.addEventListener('mouseleave', (e) => {
            // Check if we're not hovering over the parent element
            if (!subpart.contains(e.relatedTarget) && !subpartBtn.classList.contains('bookmarked')) {
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
                
                // Check if this subpart is already bookmarked
                const existingBookmark = bookmarks.find(b => b.element === subpart);
                if (!existingBookmark) {
                    // Add to bookmarks only if it doesn't exist
                    bookmarks.push({
                        element: subpart,
                        parentMessage: message,
                        position: subpart.offsetTop,
                        text: subpartPreview,
                        customName: subpartPreview,
                        type: 'subpart'
                    });
                    
                    updateNavigationPanel();
                }
            } else {
                subpartBtn.classList.remove('bookmarked');
                subpartBtn.style.opacity = '0';
                
                // Remove from bookmarks
                bookmarks = bookmarks.filter(b => b.element !== subpart);
                updateNavigationPanel();
            }
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
    
    // Create the header with collapse button
    const header = document.createElement('div');
    header.className = 'bookmark-nav-header';
    header.innerHTML = `
        <span>Bookmarks</span>
        <button class="collapse-button">▼</button>
    `;

    // Create actions bar with delete all button
    const actions = document.createElement('div');
    actions.className = 'bookmark-actions';
    const deleteAllBtn = document.createElement('button');
    deleteAllBtn.className = 'delete-all-btn';
    //deleteAllBtn.height = isCollapsed ? '0px' : 'auto';
    deleteAllBtn.textContent = 'Delete All';
    actions.appendChild(deleteAllBtn);
    
    // Create the bookmark list container
    const bookmarkList = document.createElement('div');
    bookmarkList.className = 'bookmark-list';
    
    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    
    // Assemble the panel
    panel.appendChild(header);
    panel.appendChild(actions);
    panel.appendChild(bookmarkList);
    panel.appendChild(resizeHandle);
    document.body.appendChild(panel);


// Collapse functionality
let isCollapsed = false;
const collapseBtn = header.querySelector('.collapse-button');
const contentToToggle = [actions, bookmarkList];

// Store original styles to restore them when expanding
const originalStyles = {
    panel: {
        height: panel.style.height || 'auto'
    },
    actions: {
        display: actions.style.display || 'block',
        height: actions.style.height || '',
        margin: actions.style.margin || '',
        padding: actions.style.padding || ''
    },
    bookmarkList: {
        display: bookmarkList.style.display || 'block',
        height: bookmarkList.style.height || '',
        margin: bookmarkList.style.margin || '',
        padding: bookmarkList.style.padding || ''
    }
};

collapseBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    collapseBtn.textContent = isCollapsed ? '▲' : '▼';
    collapseBtn.title = isCollapsed ? 'expand' : 'collapse';

    if (isCollapsed) {
        // Hide content areas
        actions.style.display = 'none';
        bookmarkList.style.display = 'none';

        // Shrink panel to fit header only
        panel.style.height = header.offsetHeight + 15 + 'px';
        panel.style.minHeight = '0';
        panel.style.width = panel.style.minWidth;
        panel.style.overflow = 'hidden';
    } else {
        // Show everything again
        actions.style.display = '';
        bookmarkList.style.display = '';

        panel.style.height = '';
        panel.style.padding = '';
        panel.style.overflow = '';

        updateNavigationPanel();
    }
});


    // Delete all functionality
    deleteAllBtn.addEventListener('click', () => {
        // Remove all bookmark indicators
        document.querySelectorAll('.chatgpt-bookmark-btn.bookmarked').forEach(btn => {
            btn.classList.remove('bookmarked');
        });
        document.querySelectorAll('.subpart-bookmark-btn.bookmarked').forEach(btn => {
            btn.classList.remove('bookmarked');
        });
        // Clear bookmarks array
        bookmarks = [];
        resetStuckHighlights();
        updateNavigationPanel();

        
        
    });

    // Dragging functionality
    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);

    function startDragging(e) {
        isDragging = true;
        startX = e.clientX - panel.offsetLeft;
        startY = e.clientY - panel.offsetTop;
        header.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;

        e.preventDefault();
        
        // Calculate new position
        let newX = e.clientX - startX;
        let newY = e.clientY - startY;
        
        // Keep within viewport bounds
        newX = Math.max(0, Math.min(newX, window.innerWidth - panel.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - panel.offsetHeight));
        
        panel.style.left = newX + 'px';
        panel.style.top = newY + 'px';
        panel.style.right = 'auto'; // Remove default right positioning
    }

    function stopDragging() {
        isDragging = false;
        header.style.cursor = 'grab';
    }

    // Modified resize functionality
    let isResizing = false;
    let originalWidth, originalHeight, originalX, originalY;

    resizeHandle.addEventListener('mousedown', startResizing);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);

    function startResizing(e) {
        if (isCollapsed) return; // Prevent resizing when collapsed
        isResizing = true;
        originalWidth = panel.offsetWidth;
        originalHeight = panel.offsetHeight;
        originalX = e.clientX;
        originalY = e.clientY;
        e.stopPropagation();
    }

    function resize(e) {
        if (!isResizing) return;

        const width = originalWidth + (e.clientX - originalX);
        const height = originalHeight + (e.clientY - originalY);

        // Calculate content height (header + actions + visible bookmarks)
        const headerHeight = header.offsetHeight;
        const actionsHeight = actions.offsetHeight;
        const visibleBookmarksHeight = Array.from(bookmarkList.children)
            .reduce((total, item) => total + item.offsetHeight, 0);
        const minContentHeight = headerHeight + actionsHeight + visibleBookmarksHeight;

        // Enforce minimum and maximum sizes
        const newWidth = Math.max(150, Math.min(width, window.innerWidth - panel.offsetLeft));
        const newHeight = Math.max(minContentHeight, Math.min(height, window.innerHeight - panel.offsetTop));

        panel.style.width = newWidth + 'px';
        panel.style.height = newHeight + 'px';
    }

    function stopResizing() {
        isResizing = false;
    }

    // Save position and size
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('bookmarkPanelState', JSON.stringify({
            left: panel.offsetLeft,
            top: panel.offsetTop,
            width: panel.offsetWidth,
            height: panel.offsetHeight
        }));
    });

    // Restore position and size
    const savedState = localStorage.getItem('bookmarkPanelState');
    if (savedState) {
        const state = JSON.parse(savedState);
        panel.style.left = state.left + 'px';
        panel.style.top = state.top + 'px';
        panel.style.width = state.width + 'px';
        panel.style.height = state.height + 'px';
        panel.style.right = 'auto';
    }

    const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No bookmarks yet. Click the icon to add bookmarks!';
        emptyState.style.marginTop = '0px';
        emptyState.style.textAlign = 'center';
        emptyState.style.height = '10px'
        emptyState.style.color = '#9ca3af';
        emptyState.style.fontStyle = 'italic';

    
        bookmarkList.appendChild(emptyState); // attach to bookmarkList instead

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
    
    // Remove any duplicate parent bookmarks
    const seenParents = new Set();
    return groups.filter(group => {
        if (!group.isGroup) {
            // For standalone bookmarks, check if it's a parent that's already in a group
            if (group.bookmark.type === 'full') {
                const isParentInGroup = groups.some(g => 
                    g.isGroup && g.parentBookmark === group.bookmark
                );
                
                if (isParentInGroup) {
                    return false; // Skip this standalone parent as it's already in a group
                }
            }
        }
        return true;
    });
}

// Update navigation panel
function updateNavigationPanel() {
    const panel = document.querySelector('.bookmark-navigation-panel');
    if (!panel) return;

    const bookmarkList = panel.querySelector('.bookmark-list');
    bookmarkList.innerHTML = '';
    bookmarkList.style.visibility = listVisible ? 'visible' : 'hidden';
    bookmarkList.style.display = listVisible ? 'block' : 'none';
    bookmarkList.height = bookmarks.length > 0 ? 'auto' : '0px';

    // Show/hide Clear All button based on bookmarks count
    const clearAllBtn = panel.querySelector('.clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.style.visibility = bookmarks.length > 0 ? 'visible' : 'hidden';
        clearAllBtn.height = bookmarks.length > 0 ? 'auto' : '0px';
        // Attach an event listener to the "Clear All" button
        clearAllBtn.addEventListener('click', () => {
            bookmarks = []; // Clear the bookmarks array
            resetStuckHighlights(); // Reset any stuck highlights
            updateNavigationPanel(); // Update the panel after clearing the bookmarks
        });
    }

    // Add a scroller class to the bookmark list
    bookmarkList.className = 'bookmark-list bookmark-scroller';

    if (bookmarks.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No bookmarks yet. Click the icon to add bookmarks!';
        emptyState.style.marginTop = '0px';
        emptyState.style.textAlign = 'center';
        emptyState.style.height = '10px'
        emptyState.style.color = '#9ca3af';
        emptyState.style.fontStyle = 'italic';
    
        bookmarkList.appendChild(emptyState); // attach to bookmarkList instead
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
    bookmarkItem.style.paddingLeft = '20px';  // Increased left padding
    bookmarkItem.style.paddingRight = '20px'; // Increased right padding
    
    if (isChild) {
        bookmarkItem.style.fontSize = '0.9em';
        bookmarkItem.style.marginTop = '4px';
    } else if (bookmark.type === 'subpart') {
        // Style for standalone subpart bookmarks
        bookmarkItem.style.fontSize = '0.9em';
        bookmarkItem.style.marginTop = '4px';
        bookmarkItem.style.borderLeft = '2px solid #e5e7eb';
        bookmarkItem.style.paddingLeft = '25px';
    }

    // Create the text display element
    const textSpan = document.createElement('span');
    textSpan.className = 'bookmark-text';
    const prefix = isChild ? '↳ ' : (bookmark.type === 'subpart' ? '• ' : `${index + 1}. `);
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
        
        // Ensure the background is reset after the flash
        setTimeout(() => {
            if (bookmark.element) {
                bookmark.element.style.background = originalBackground || '';
            }
        }, 800); // shorter flash duration
        
        // Add a backup reset in case the first one fails
        setTimeout(() => {
            if (bookmark.element && bookmark.element.style.background === 'rgba(16, 163, 127, 0.2)') {
                bookmark.element.style.background = originalBackground || '';
            }
        }, 1000);
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

        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'bookmark-edit-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'bookmark-edit-modal';
        modal.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            width: 300px;
            position: relative;
        `;

        // Create title
        const title = document.createElement('h3');
        title.textContent = 'Edit Bookmark Name';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #374151;
            font-size: 16px;
            font-weight: 600;
        `;

        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = bookmark.customName || bookmark.text;
        input.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            font-size: 14px;
            margin-bottom: 15px;
            box-sizing: border-box;
            outline: none;
            caret-color: #10a37f;
            background: white;
            color: #374151;
        `;

        // Add focus styles
        input.addEventListener('focus', () => {
            input.style.borderColor = '#10a37f';
            input.style.boxShadow = '0 0 0 1px #10a37f';
        });

        input.addEventListener('blur', () => {
            input.style.borderColor = '#e5e7eb';
            input.style.boxShadow = 'none';
        });

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        `;

        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 6px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            background: white;
            color: #374151;
            cursor: pointer;
            font-size: 14px;
        `;

        // Create save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.cssText = `
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: #10a37f;
            color: white;
            cursor: pointer;
            font-size: 14px;
        `;

        // Add hover effects
        cancelBtn.addEventListener('mouseover', () => {
            cancelBtn.style.background = '#f3f4f6';
        });
        cancelBtn.addEventListener('mouseout', () => {
            cancelBtn.style.background = 'white';
        });
        saveBtn.addEventListener('mouseover', () => {
            saveBtn.style.background = '#0d8c6d';
        });
        saveBtn.addEventListener('mouseout', () => {
            saveBtn.style.background = '#10a37f';
        });

        // Add event listeners
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });

        saveBtn.addEventListener('click', () => {
            const newName = input.value.trim();
            if (newName) {
                bookmark.customName = newName;
                updateNavigationPanel();
            }
            document.body.removeChild(modalOverlay);
        });

        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });

        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newName = input.value.trim();
                if (newName) {
                    bookmark.customName = newName;
                    updateNavigationPanel();
                }
                document.body.removeChild(modalOverlay);
            }
        });

        // Assemble modal
        buttonsContainer.appendChild(cancelBtn);
        buttonsContainer.appendChild(saveBtn);
        modal.appendChild(title);
        modal.appendChild(input);
        modal.appendChild(buttonsContainer);
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        // Focus input
        input.focus();
        input.select();
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
        // Wait for the main chat container blah
        await waitForElement('div[class*="prose"]');

        // Create navigation panel
        createNavigationPanel();

        // Initial injection of bookmark buttons
        injectBookmarkButtons();
        
        // Reset any stuck highlights from previous sessions
        resetStuckHighlights();

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