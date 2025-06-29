const QUOTES_KEY = 'quotes';
const LAST_QUOTE_INDEX_KEY = 'lastQuoteIndex';
const LAST_CATEGORY_KEY = 'lastCategoryFilter';

let quotes = [];

// Sync quotes between local and server
async function syncQuotes() {
    try {
        // First, fetch quotes from server
        const serverFetchSuccess = await fetchQuotesFromServer();

        if (serverFetchSuccess) {
            alert('Quotes synced with server!');
            console.log('Quotes synced with server!');
            populateCategories();
            filterQuotes();
            return true;
        } else {
            console.log('Failed to sync quotes from server');
            return false;
        }
    } catch (error) {
        console.log('Error during quote sync:', error);
        return false;
    }
}

// Send quotes to server
async function sendQuotesToServer(quoteData) {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quoteData)
        });
        if (response.ok) {
            const result = await response.json();
            console.log('Quote sent to server:', result);
            return true;
        }
    } catch (error) {
        console.log('Failed to send quote to server:', error);
    }
    return false;
}

// Fetch quotes from server
async function fetchQuotesFromServer() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts');
        if (response.ok) {
            const posts = await response.json();
            if (Array.isArray(posts) && posts.length > 0) {
                // Transform posts into quote format
                const serverQuotes = posts.slice(0, 10).map(post => ({
                    text: post.title,
                    category: "Inspiration"
                }));
                quotes = serverQuotes;
                saveQuotes();
                return true;
            }
        }
    } catch (error) {
        console.log('Failed to fetch quotes from server:', error);
    }
    return false;
}

// Load quotes from localStorage or use defaults
async function loadQuotes() {
    const stored = localStorage.getItem(QUOTES_KEY);
    if (stored) {
        try {
            quotes = JSON.parse(stored);
        } catch {
            quotes = [];
        }
    }

    // Try to fetch from server first
    const serverFetchSuccess = await fetchQuotesFromServer();

    // If no quotes from server and no local quotes, use defaults
    if (!serverFetchSuccess && !quotes.length) {
        quotes = [
            { text: "The only way to do great work is to love what you do.", category: "Motivation" },
            { text: "Life is what happens when you're busy making other plans.", category: "Life" },
            { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Success" }
        ];
        saveQuotes();
    }
}

function saveQuotes() {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

function populateCategories() {
    let categories = [...new Set(quotes.map(q => q.category))];
    const filter = document.getElementById('categoryFilter');
    if (!filter) return;
    filter.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filter.appendChild(option);
    });
    // Restore last selected filter
    const lastCategory = localStorage.getItem(LAST_CATEGORY_KEY);
    if (lastCategory && [...filter.options].some(opt => opt.value === lastCategory)) {
        filter.value = lastCategory;
    }
}

function filterQuotes() {
    const filter = document.getElementById('categoryFilter');
    const selectedCategory = filter ? filter.value : 'all';
    localStorage.setItem(LAST_CATEGORY_KEY, selectedCategory);
    const container = document.getElementById('quoteDisplay');
    if (!container) return;
    let filtered = selectedCategory === 'all' ? quotes : quotes.filter(q => q.category === selectedCategory);
    if (filtered.length === 0) {
        container.innerHTML = `<p>No quotes found for this category.</p>`;
        return;
    }
    // Show all filtered quotes
    container.innerHTML = filtered.map(quote => `
        <blockquote>
            "${quote.text}"
            <footer><em>${quote.category}</em></footer>
        </blockquote>
    `).join('');
}

function showRandomQuote() {
    const filter = document.getElementById('categoryFilter');
    const selectedCategory = filter ? filter.value : 'all';
    let filtered = selectedCategory === 'all' ? quotes : quotes.filter(q => q.category === selectedCategory);
    const container = document.getElementById('quoteDisplay');
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = `<p>No quotes found for this category.</p>`;
        return;
    }
    const randomIndex = Math.floor(Math.random() * filtered.length);
    const quote = filtered[randomIndex];
    container.innerHTML = `
        <blockquote>
            "${quote.text}"
            <footer><em>${quote.category}</em></footer>
        </blockquote>
    `;
    // Save last viewed quote index in session storage (relative to all quotes)
    const globalIndex = quotes.findIndex(q => q.text === quote.text && q.category === quote.category);
    sessionStorage.setItem(LAST_QUOTE_INDEX_KEY, globalIndex);
}

function addQuote() {
    const textInput = document.getElementById('newQuoteText');
    const categoryInput = document.getElementById('newQuoteCategory');
    const text = textInput.value.trim();
    const category = categoryInput.value.trim();
    if (text && category) {
        const newQuote = { text, category };
        quotes.push(newQuote);
        saveQuotes();

        // Send to server
        sendQuotesToServer(newQuote);

        populateCategories();
        // If new category, select it
        const filter = document.getElementById('categoryFilter');
        if (filter) {
            filter.value = category;
            localStorage.setItem(LAST_CATEGORY_KEY, category);
        }
        filterQuotes();
        textInput.value = '';
        categoryInput.value = '';
    }
}

function createAddQuoteForm() {
    const form = document.createElement('div');
    form.innerHTML = `
        <input type="text" id="newQuoteText" placeholder="Quote text" />
        <input type="text" id="newQuoteCategory" placeholder="Category" />
        <button id="addQuoteBtn">Add Quote</button>
    `;
    document.body.appendChild(form);
    document.getElementById('addQuoteBtn').addEventListener('click', addQuote);
}

// Export quotes as JSON
function exportToJsonFile() {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "quotes.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importFromJsonFile(event) {
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
        try {
            const importedQuotes = JSON.parse(e.target.result);
            if (Array.isArray(importedQuotes)) {
                quotes.push(...importedQuotes);
                saveQuotes();
                populateCategories();
                filterQuotes();
                alert('Quotes imported successfully!');
            } else {
                alert('Invalid JSON format.');
            }
        } catch {
            alert('Failed to parse JSON.');
        }
    };
    fileReader.readAsText(event.target.files[0]);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Add category filter dropdown
    let filter = document.getElementById('categoryFilter');
    if (!filter) {
        filter = document.createElement('select');
        filter.id = 'categoryFilter';
        filter.onchange = filterQuotes;
        document.body.insertBefore(filter, document.body.firstChild);
    }

    await loadQuotes();
    populateCategories();

    // Restore last selected filter and show quotes
    const lastCategory = localStorage.getItem(LAST_CATEGORY_KEY) || 'all';
    filter.value = lastCategory;
    filterQuotes();

    document.getElementById('newQuote').addEventListener('click', showRandomQuote);

    // Add sync button
    const syncBtn = document.createElement('button');
    syncBtn.textContent = 'Sync Quotes';
    syncBtn.onclick = syncQuotes;
    document.body.appendChild(syncBtn);

    // Add export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Quotes';
    exportBtn.onclick = exportToJsonFile;
    document.body.appendChild(exportBtn);

    // Add import input
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.id = 'importFile';
    importInput.accept = '.json';
    importInput.onchange = importFromJsonFile;
    document.body.appendChild(importInput);

    // Set up automatic sync every 30 seconds
    setInterval(async () => {
        console.log('Auto-syncing quotes...');
        const success = await syncQuotes();
        if (success) {
            console.log('Quotes synced with server!');
        }
    }, 30000);

    // Optionally, show last viewed quote from session storage
    const lastIndex = sessionStorage.getItem(LAST_QUOTE_INDEX_KEY);
    if (lastIndex !== null && quotes[lastIndex]) {
        const container = document.getElementById('quoteDisplay');
        const quote = quotes[lastIndex];
        container.innerHTML = `
            <blockquote>
                "${quote.text}"
                <footer><em>${quote.category}</em></footer>
            </blockquote>
        `;
    }
});