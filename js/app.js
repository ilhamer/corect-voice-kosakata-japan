/**
 * Nihongo Master - Aplikasi Pembelajaran Kosakata Jepang
 * Fitur:
 * - Menampilkan daftar kosakata dari file JSON
 * - Pemutar audio untuk pengucapan
 * - Sistem koreksi pengucapan dengan Web Speech API
 * - Pencarian kosakata (teks dan suara)
 * - Mode latihan acak
 */

// DOM Elements
const vocabListElement = document.getElementById('vocabList');
const searchInput = document.getElementById('searchVocab');
const voiceSearchBtn = document.getElementById('voiceSearchBtn');
const startPracticeBtn = document.getElementById('startPracticeBtn');
const currentWordElement = document.getElementById('currentWord');
const voiceFeedbackElement = document.getElementById('voiceFeedback');

// Global variables
let vocabularyData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadVocabularyData();
    setupEventListeners();
});

/**
 * Load vocabulary data from JSON file
 */
async function loadVocabularyData() {
    try {
        const response = await fetch('data/vocabulary.json');
        if (!response.ok) {
            throw new Error('Gagal memuat data kosakata');
        }
        vocabularyData = await response.json();
        renderVocabularyList(vocabularyData);
    } catch (error) {
        console.error('Error:', error);
        vocabListElement.innerHTML = `
            <div class="error-message">
                <p>Gagal memuat data kosakata. Silakan coba lagi nanti.</p>
            </div>
        `;
    }
}

/**
 * Render vocabulary list to the DOM
 * @param {Array} data - Array of vocabulary items
 */
function renderVocabularyList(data) {
    if (!data || data.length === 0) {
        vocabListElement.innerHTML = '<p>Tidak ada kosakata yang ditemukan.</p>';
        return;
    }

    vocabListElement.innerHTML = data.map(item => `
        <div class="vocab-card" data-id="${item.id}" data-category="${item.category}" data-level="${item.level}">
            <h3>${item.kanji} <span>(${item.hiragana})</span></h3>
            <p class="romaji">${item.romaji}</p>
            <p class="meaning"><strong>Arti:</strong> ${item.meaning}</p>
            <p><strong>Kategori:</strong> ${item.category}</p>
            <p><strong>Level:</strong> ${item.level}</p>
            <div class="audio-controls">
                <button class="play-audio-btn" data-audio="${item.audio}">
                    <i class="fas fa-volume-up"></i> Dengarkan Pengucapan
                </button>
                <audio src="${item.audio}" preload="none"></audio>
            </div>
            <button class="voice-btn" data-word="${item.hiragana}" data-romaji="${item.romaji}">
                <i class="fas fa-microphone-alt"></i> Latih Pengucapan
            </button>
            <div id="feedback-${item.id}" class="voice-feedback"></div>
        </div>
    `).join('');

    // Setup event listeners for dynamically created elements
    setupDynamicEventListeners();
}

/**
 * Setup event listeners for static elements
 */
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // Voice search button
    voiceSearchBtn.addEventListener('click', startVoiceSearch);
    
    // Practice mode button
    startPracticeBtn.addEventListener('click', startRandomPractice);
}

/**
 * Setup event listeners for dynamically created elements
 */
function setupDynamicEventListeners() {
    // Audio playback buttons
    document.querySelectorAll('.play-audio-btn').forEach(button => {
        button.addEventListener('click', function() {
            playVocabularyAudio(this);
        });
    });
    
    // Voice practice buttons
    document.querySelectorAll('.voice-btn').forEach(button => {
        button.addEventListener('click', function() {
            const word = this.getAttribute('data-word');
            const romaji = this.getAttribute('data-romaji');
            const feedbackId = this.nextElementSibling.id;
            practicePronunciation(word, romaji, feedbackId);
        });
    });
}

/**
 * Play vocabulary audio
 * @param {HTMLElement} button - The clicked audio button
 */
function playVocabularyAudio(button) {
    const audioPath = button.getAttribute('data-audio');
    const audioElement = button.nextElementSibling;
    
    // Show loading state
    button.classList.add('audio-loading');
    button.disabled = true;
    
    // Reset audio and play
    audioElement.currentTime = 0;
    audioElement.play()
        .then(() => {
            button.classList.remove('audio-loading');
            button.disabled = false;
        })
        .catch(error => {
            console.error('Error playing audio:', error);
            button.classList.remove('audio-loading');
            button.disabled = false;
            
            const feedbackElement = button.closest('.vocab-card').querySelector('.voice-feedback');
            showFeedback(feedbackElement, 'Error: Tidak dapat memutar audio', 'error');
        });
}

/**
 * Handle search functionality
 */
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        renderVocabularyList(vocabularyData);
        return;
    }
    
    const filteredData = vocabularyData.filter(item => 
        item.kanji.toLowerCase().includes(searchTerm) ||
        item.hiragana.toLowerCase().includes(searchTerm) ||
        item.romaji.toLowerCase().includes(searchTerm) ||
        item.meaning.toLowerCase().includes(searchTerm)
    );
    
    renderVocabularyList(filteredData);
}

/**
 * Start voice search
 */
function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showFeedback(voiceFeedbackElement, 'Browser Anda tidak mendukung Web Speech API. Gunakan Chrome atau Edge terbaru.', 'error');
        return;
    }
    
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'id-ID'; // Bahasa Indonesia untuk pencarian
    recognition.interimResults = false;
    
    showFeedback(voiceFeedbackElement, 'Mendengarkan... Silakan ucapkan kosakata yang ingin dicari.', 'info');
    
    recognition.start();
    
    recognition.onresult = function(event) {
        const searchTerm = event.results[0][0].transcript.toLowerCase();
        searchInput.value = searchTerm;
        
        // Trigger search
        const inputEvent = new Event('input');
        searchInput.dispatchEvent(inputEvent);
    };
    
    recognition.onerror = function(event) {
        showFeedback(voiceFeedbackElement, `Error: ${event.error}`, 'error');
    };
}

/**
 * Start random practice mode
 */
function startRandomPractice() {
    if (vocabularyData.length === 0) {
        showFeedback(voiceFeedbackElement, 'Tidak ada data kosakata yang tersedia.', 'error');
        return;
    }
    
    const randomWord = vocabularyData[Math.floor(Math.random() * vocabularyData.length)];
    
    currentWordElement.innerHTML = `
        <h3>${randomWord.kanji} <span>(${randomWord.hiragana})</span></h3>
        <p class="romaji">${randomWord.romaji}</p>
        <p class="meaning"><strong>Arti:</strong> ${randomWord.meaning}</p>
    `;
    
    voiceFeedbackElement.style.display = 'none';
    
    // Start recognition automatically after 1 second
    setTimeout(() => {
        practicePronunciation(randomWord.hiragana, randomWord.romaji, 'voiceFeedback');
    }, 1000);
}

/**
 * Practice pronunciation with voice recognition
 * @param {string} correctWord - The correct hiragana pronunciation
 * @param {string} romaji - Romaji for reference
 * @param {string} feedbackId - ID of the feedback element
 */

// fungsi tambahan buat detail prononcation correct kode ubah 1
// batas awal

// batas akhir
async function practicePronunciation(correctWord, romaji, feedbackId) {
    const feedbackElement = document.getElementById(feedbackId);
    feedbackElement.style.display = 'none';
    
    if (!('webkitSpeechRecognition' in window)) {
        showFeedback(feedbackElement, 
            'Browser tidak mendukung fitur ini. Gunakan Chrome/Edge terbaru.', 
            'error');
        return;
    }

    try {
        // Ekstrak hanya bagian hiragana (たべる) dari "食べる (たべる)"
        const hiraganaPart = extractHiraganaPart(correctWord);
        
        showFeedback(feedbackElement, 
            `Silakan ucapkan: <span class="hiragana-guide">${hiraganaPart}</span> (${romaji})`, 
            'info');
        
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;
        recognition.maxAlternatives = 5;
        
        recognition.start();
        
        recognition.onresult = async (event) => {
            const results = event.results[0];
            const userSpoken = results[0].transcript.trim();
            
            // Bandingkan hanya dengan hiragana
            const isCorrect = compareWithHiragana(userSpoken, hiraganaPart);
            
            if (isCorrect) {
                showFeedback(feedbackElement,
                    `✅ <strong>Pengucapan Benar!</strong><br>
                    Kamu mengucapkan: ${userSpoken}`,
                    'success');
            } else {
                showFeedback(feedbackElement,
                    `❌ <strong>Perbaiki Pengucapan</strong><br>
                    Kamu mengucapkan: ${userSpoken}<br>
                    Seharusnya: ${hiraganaPart} (${romaji})`,
                    'error');
            }
        };
        
        recognition.onerror = (event) => {
            showFeedback(feedbackElement, 
                `Error: ${getSimpleErrorText(event.error)}`, 
                'error');
        };
        
    } catch (error) {
        console.error('Error:', error);
        showFeedback(feedbackElement,
            'Terjadi kesalahan sistem. Silakan refresh halaman.',
            'error');
    }
}

// Fungsi untuk ekstrak bagian hiragana dari format "kanji (hiragana)"
function extractHiraganaPart(text) {
    // Jika sudah hiragana semua, kembalikan langsung
    if (/^[\u3040-\u309F]+$/.test(text)) return text;
    
    // Jika dalam format "kanji (hiragana)", ekstrak hiragananya
    const match = text.match(/\(([\u3040-\u309F]+)\)/);
    return match ? match[1] : text;
}

// Fungsi untuk membandingkan dengan hiragana
function compareWithHiragana(userInput, correctHiragana) {
    // Normalisasi input user
    const normalizedInput = userInput
        .replace(/\s+/g, '') // Hapus spasi
        .normalize('NFKC');  // Normalisasi karakter
        
    return normalizedInput === correctHiragana;
}


/**
 * Show feedback message
 * @param {HTMLElement} element - The feedback element
 * @param {string} message - The message to display
 * @param {string} type - Type of feedback (success, error, info)
 */
function showFeedback(element, message, type) {
    if (!element) return;
    
    element.innerHTML = message;
    element.className = 'voice-feedback';
    element.classList.add(type);
    element.style.display = 'block';
}

// Expose functions to global scope for debugging if needed
window.app = {
    loadVocabularyData,
    renderVocabularyList,
    playVocabularyAudio,
    practicePronunciation,
    startVoiceSearch,
    startRandomPractice
};