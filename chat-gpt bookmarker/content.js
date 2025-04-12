console.log("ChatGPT Bookmarker content script loaded");

function addBookmarkButtons() {
  document.querySelectorAll('[data-testid="conversation-turn"]').forEach((el, idx) => {
    if (!el.querySelector('.bookmark-btn')) {
      const btn = document.createElement('button');
      btn.textContent = '⭐';
      btn.className = 'bookmark-btn';
      btn.style.position = 'absolute';
      btn.style.top = '10px';
      btn.style.right = '10px';
      btn.style.zIndex = '999';
      btn.onclick = () => {
        const bookmarks = JSON.parse(localStorage.getItem('chatBookmarks') || '[]');
        bookmarks.push({ scrollY: window.scrollY, idx });
        localStorage.setItem('chatBookmarks', JSON.stringify(bookmarks));
        alert(`Bookmarked message #${idx}`);
      };
      el.style.position = 'relative';
      el.appendChild(btn);
    }
  });
}

function addViewBookmarksButton() {
  if (document.getElementById('viewBookmarksBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'viewBookmarksBtn';
  btn.textContent = '📑 View Bookmarks';
  btn.style.position = 'fixed';
  btn.style.bottom = '10px';
  btn.style.right = '10px';
  btn.style.zIndex = '1000';
  btn.style.padding = '10px';
  btn.style.background = '#fff';
  btn.style.border = '1px solid #ccc';
  btn.style.borderRadius = '8px';
  btn.style.cursor = 'pointer';

  btn.onclick = () => {
    const bookmarks = JSON.parse(localStorage.getItem('chatBookmarks') || '[]');
    const choice = prompt(
      "Choose a bookmark:\n" + bookmarks.map((b, i) => `(${i}) Message #${b.idx}`).join('\n')
    );
    const b = bookmarks[parseInt(choice)];
    if (b) window.scrollTo({ top: b.scrollY, behavior: 'smooth' });
  };

  document.body.appendChild(btn);
}

function initExtension() {
  addBookmarkButtons();
  addViewBookmarksButton();

  // Re-run when new messages appear
  const observer = new MutationObserver(() => {
    addBookmarkButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
  const waitForMessages = setInterval(() => {
    const messages = document.querySelectorAll('[data-testid="conversation-turn"]');
    if (messages.length > 0) {
      clearInterval(waitForMessages);
      console.log("Messages found! Initializing extension...");
      initExtension();
    } else {
      console.log("Waiting for ChatGPT messages...");
    }
  }, 1000);
});

