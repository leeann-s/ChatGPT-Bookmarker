console.log("✅ ChatGPT Bookmarker content script loaded");

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
        try {
          const bookmarks = JSON.parse(localStorage.getItem('chatBookmarks') || '[]');
          bookmarks.push({ scrollY: window.scrollY, idx });
          localStorage.setItem('chatBookmarks', JSON.stringify(bookmarks));
          alert(`✅ Bookmarked message #${idx}`);
        } catch (err) {
          console.error("Failed to save bookmark:", err);
        }
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
    try {
      const bookmarks = JSON.parse(localStorage.getItem('chatBookmarks') || '[]');
      if (!bookmarks.length) {
        alert("⚠️ No bookmarks saved.");
        return;
      }

      const choice = prompt(
        "Choose a bookmark:\n" + bookmarks.map((b, i) => `(${i}) Message #${b.idx}`).join('\n')
      );

      if (choice === null) return; // User hit cancel
      const parsed = parseInt(choice);
      if (isNaN(parsed) || parsed < 0 || parsed >= bookmarks.length) {
        alert("❌ Invalid choice.");
        return;
      }

      const b = bookmarks[parsed];
      window.scrollTo({ top: b.scrollY, behavior: 'smooth' });
    } catch (err) {
      console.error("❌ Failed to view bookmarks:", err);
    }
  };

  document.body.appendChild(btn);
}

function initExtension() {
  console.log("🔄 Initializing ChatGPT Bookmarker...");
  addBookmarkButtons();
  addViewBookmarksButton();

  const observer = new MutationObserver(() => {
    addBookmarkButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener('load', () => {
  setTimeout(initExtension, 2000);
});
