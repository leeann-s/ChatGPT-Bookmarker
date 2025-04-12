const bookmarks = JSON.parse(localStorage.getItem('chatBookmarks')) || [];

function saveBookmarks() {
  localStorage.setItem('chatBookmarks', JSON.stringify(bookmarks));
}

function addBookmark(id, text) {
  if (!bookmarks.some(b => b.id === id)) {
    bookmarks.push({ id, text });
    saveBookmarks();
    renderBookmarks();
  }
}

function renderBookmarks() {
  const container = document.getElementById('bookmark-list');
  container.innerHTML = '';
  bookmarks.forEach(b => {
    const div = document.createElement('div');
    div.className = 'bookmark-preview';
    div.textContent = b.text.slice(0, 50) + '...';
    div.onclick = () => {
      document.getElementById(b.id).scrollIntoView({ behavior: 'smooth' });
    };
    container.appendChild(div);
  });
}

document.querySelectorAll('.bookmark-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const messageDiv = e.target.closest('.message');
    const id = messageDiv.id;
    const text = messageDiv.textContent.trim();
    addBookmark(id, text);
  });
});

// Render existing bookmarks on load
renderBookmarks();
