
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const typingIndicator = document.getElementById("typingIndicator");
const quickOptions = document.getElementById("quickOptions");
const characterCount = document.getElementById("characterCount");
const clearChatButton = document.getElementById("clearChatButton");
const themeButton = document.getElementById("themeButton");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalContent = document.getElementById("modalContent");

const CHAT_STORAGE_KEY = "psikodestek_chat";
const THEME_STORAGE_KEY = "psikodestek_theme";
const JOURNAL_STORAGE_KEY = "psikodestek_journal";

let isTyping = false;

// GitHub Pages frontend'inin bağlanacağı yayınlanmış backend.
const API_BASE_URL = "https://psikodestek-mira-github-io.onrender.com";


/* =====================================================
   INIT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("🌿 Psikodestek başlatılıyor...");

    loadTheme();
    loadChat();
    setupEventListeners();
    updateCharacterCount();
    autoResizeTextarea();

    console.log("✅ Chat sistemi hazır.");

});


/* =====================================================
   EVENTS
===================================================== */

function setupEventListeners() {

    if (sendButton) {
        sendButton.addEventListener("click", () => {
            sendMessage();
        });
    }

    if (messageInput) {
        messageInput.addEventListener("keydown", event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        });

        messageInput.addEventListener("input", () => {

            updateCharacterCount();
            autoResizeTextarea();

        });
    }


    document
        .querySelectorAll(".quick-option")
        .forEach(button => {

            button.addEventListener("click", () => {

                const text =
                    button.dataset.message ||
                    button.textContent.trim();

                sendMessage(text);

            });

        });


    if (clearChatButton) {
        clearChatButton.addEventListener(
            "click",
            clearChat
        );
    }


    if (themeButton) {
        themeButton.addEventListener(
            "click",
            toggleTheme
        );
    }


    if (modalClose) {
        modalClose.addEventListener(
            "click",
            closeModal
        );
    }


    if (modalOverlay) {

        modalOverlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === modalOverlay
                ) {

                    closeModal();

                }

            }
        );

    }


    document
        .querySelectorAll(".support-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const type =
                        card.dataset.support;

                    if (type === "breathing") {
                        openBreathingExercise();
                    }

                    if (type === "journal") {
                        openJournal();
                    }

                }
            );

        });

}


/* =====================================================
   SEND MESSAGE
===================================================== */

async function sendMessage(customMessage = null) {

    if (isTyping) {
        console.log("⏳ Zaten cevap bekleniyor.");
        return;
    }


    const text =
        customMessage !== null
            ? String(customMessage).trim()
            : messageInput.value.trim();


    if (!text) {
        return;
    }


    console.log("📤 Kullanıcı mesajı:", text);


    // Kullanıcı mesajını ekle
    addMessage(text, "user");


    // Input temizle
    if (messageInput) {
        messageInput.value = "";
        updateCharacterCount();
        resetTextareaHeight();
    }


    // Hızlı seçenekleri gizle
    if (quickOptions) {
        quickOptions.style.display = "none";
    }


    saveChat();


    isTyping = true;

    if (sendButton) {
        sendButton.disabled = true;
    }

    showTyping();


    try {

        /*
         * Ekrandaki tüm konuşmayı alıyoruz.
         */
        const chatHistory = getChatHistory();


        console.log("📚 Gönderilecek sohbet geçmişi:");
        console.log(chatHistory);


        console.log("🌐 Render backend /api/chat adresine istek gönderiliyor...");


        const response = await fetch(
            `${API_BASE_URL}/api/chat`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    messages: chatHistory
                })
            }
        );


        console.log(
            "📥 Sunucu HTTP durumu:",
            response.status
        );


        /*
         * Sunucudan gelen cevabı JSON olarak oku.
         */
        const data = await response.json();


        console.log(
            "🤖 Sunucudan gelen cevap:",
            data
        );


        /*
         * HTTP hatası
         */
        if (!response.ok) {

            throw new Error(
                data.error ||
                `Sunucu hatası (${response.status})`
            );

        }


        /*
         * Backend'in server.js dosyasında:
         *
         * res.json({
         *     reply
         * });
         *
         * kullandığımız için burada data.reply
         * okuyoruz.
         */

        const aiReply =
            data.reply;


        /*
         * Boş cevap kontrolü
         */
        if (
            !aiReply ||
            typeof aiReply !== "string" ||
            !aiReply.trim()
        ) {

            console.error(
                "❌ AI cevabı boş veya hatalı:",
                data
            );

            throw new Error(
                "Yapay zekadan boş cevap geldi."
            );

        }


        console.log(
            "✅ Mira'nın cevabı:",
            aiReply
        );


        hideTyping();


        addMessage(
            aiReply,
            "ai"
        );


        saveChat();


    } catch (error) {

        console.error(
            "❌ CHAT HATASI:",
            error
        );


        hideTyping();


        /*
         * Kullanıcıya teknik hata yerine
         * anlaşılır mesaj gösteriyoruz.
         */

        addMessage(
            "Şu anda Mira'ya bağlanırken bir sorun oluştu. Lütfen biraz sonra tekrar deneyebilir misin? 🌿",
            "ai"
        );

    }


    isTyping = false;

    if (sendButton) {
        sendButton.disabled = false;
    }

    scrollToBottom();

}


/* =====================================================
   GET CHAT HISTORY
===================================================== */

function getChatHistory() {

    const elements =
        messages.querySelectorAll(
            ".message-row"
        );


    const history = [];


    elements.forEach(row => {

        const message =
            row.querySelector(".message");


        if (!message) {
            return;
        }


        const isUser =
            row.classList.contains(
                "user-row"
            );


        const content =
            message.textContent.trim();


        if (!content) {
            return;
        }


        history.push({

            role:
                isUser
                    ? "user"
                    : "assistant",

            content:
                content

        });

    });


    return history;

}


/* =====================================================
   ADD MESSAGE
===================================================== */

function addMessage(text, sender) {

    if (!messages) {
        return;
    }


    const row =
        document.createElement("div");


    row.className =
        `message-row ${
            sender === "user"
                ? "user-row"
                : "ai-row"
        }`;


    const avatar =
        document.createElement("div");


    avatar.className =
        `avatar ${
            sender === "user"
                ? "user-avatar"
                : "ai-avatar"
        }`;


    avatar.textContent =
        sender === "user"
            ? "🙂"
            : "🌿";


    const content =
        document.createElement("div");


    content.className =
        "message-content";


    if (sender === "ai") {

        const name =
            document.createElement("div");


        name.className =
            "message-name";


        name.textContent =
            "Mira";


        content.appendChild(name);

    }


    const message =
        document.createElement("div");


    message.className =
        `message ${
            sender === "user"
                ? "user-message"
                : "ai-message"
        }`;


    /*
     * Güvenlik:
     * AI cevabını HTML olarak çalıştırmıyoruz.
     */
    message.textContent =
        String(text || "");


    const time =
        document.createElement("div");


    time.className =
        "message-time";


    time.textContent =
        getCurrentTime();


    content.appendChild(message);
    content.appendChild(time);

    row.appendChild(avatar);
    row.appendChild(content);

    messages.appendChild(row);


    scrollToBottom();

}


/* =====================================================
   TYPING
===================================================== */

function showTyping() {

    if (!typingIndicator) {
        return;
    }


    typingIndicator.classList.add(
        "visible"
    );


    scrollToBottom();

}


function hideTyping() {

    if (!typingIndicator) {
        return;
    }


    typingIndicator.classList.remove(
        "visible"
    );

}


/* =====================================================
   SCROLL
===================================================== */

function scrollToBottom() {

    if (!messages) {
        return;
    }


    messages.scrollTop =
        messages.scrollHeight;


    setTimeout(() => {

        messages.scrollTop =
            messages.scrollHeight;

    }, 50);

}


/* =====================================================
   TIME
===================================================== */

function getCurrentTime() {

    return new Date().toLocaleTimeString(
        "tr-TR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =====================================================
   STORAGE
===================================================== */

function saveChat() {

    if (!messages) {
        return;
    }


    const elements =
        messages.querySelectorAll(
            ".message-row"
        );


    const chat = [];


    elements.forEach(row => {

        const message =
            row.querySelector(".message");


        if (!message) {
            return;
        }


        chat.push({

            sender:
                row.classList.contains(
                    "user-row"
                )
                    ? "user"
                    : "ai",

            text:
                message.textContent

        });

    });


    localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(chat)
    );

}


function loadChat() {

    const saved =
        localStorage.getItem(
            CHAT_STORAGE_KEY
        );


    if (!saved) {
        return;
    }


    try {

        const chat =
            JSON.parse(saved);


        if (!Array.isArray(chat)) {
            return;
        }


        messages.innerHTML = "";


        chat.forEach(item => {

            addMessage(
                item.text,
                item.sender
            );

        });


        if (quickOptions) {
            quickOptions.style.display =
                "none";
        }


    } catch (error) {

        console.error(
            "❌ Chat yüklenemedi:",
            error
        );

    }

}


/* =====================================================
   CLEAR CHAT
===================================================== */

function clearChat() {

    const confirmed =
        confirm(
            "Tüm sohbet geçmişini silmek istediğine emin misin?"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem(
        CHAT_STORAGE_KEY
    );


    messages.innerHTML = "";


    addMessage(
        "Merhaba 🌿 Bugün burada olman bile kendin için küçük bir adım. Nasıl hissediyorsun?",
        "ai"
    );


    if (quickOptions) {
        quickOptions.style.display =
            "flex";
    }

}


/* =====================================================
   CHARACTER COUNT
===================================================== */

function updateCharacterCount() {

    if (!messageInput || !characterCount) {
        return;
    }


    characterCount.textContent =
        `${messageInput.value.length} / 2000`;

}


/* =====================================================
   TEXTAREA
===================================================== */

function autoResizeTextarea() {

    if (!messageInput) {
        return;
    }


    messageInput.style.height =
        "auto";


    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            150
        ) + "px";

}


function resetTextareaHeight() {

    if (!messageInput) {
        return;
    }


    messageInput.style.height =
        "40px";

}


/* =====================================================
   THEME
===================================================== */

function toggleTheme() {

    if (!themeButton) {
        return;
    }


    document.body.classList.toggle(
        "dark"
    );


    const isDark =
        document.body.classList.contains(
            "dark"
        );


    localStorage.setItem(
        THEME_STORAGE_KEY,
        isDark
            ? "dark"
            : "light"
    );


    updateThemeIcon();

}


function loadTheme() {

    const theme =
        localStorage.getItem(
            THEME_STORAGE_KEY
        );


    if (theme === "dark") {

        document.body.classList.add(
            "dark"
        );

    }


    updateThemeIcon();

}


function updateThemeIcon() {

    if (!themeButton) {
        return;
    }


    const isDark =
        document.body.classList.contains(
            "dark"
        );


    themeButton.textContent =
        isDark
            ? "🌙"
            : "☀️";

}


/* =====================================================
   MODAL
===================================================== */

function openModal(content) {

    if (!modalOverlay || !modalContent) {
        return;
    }


    modalContent.innerHTML =
        content;


    modalOverlay.classList.add(
        "visible"
    );

}


function closeModal() {

    if (!modalOverlay) {
        return;
    }


    modalOverlay.classList.remove(
        "visible"
    );

}


/* =====================================================
   BREATHING
===================================================== */

function openBreathingExercise() {

    openModal(`

        <div class="breathing-container">

            <h2>🌬️ Birlikte nefes alalım</h2>

            <p>
                Birkaç dakika boyunca nefesine
                odaklanmayı deneyelim.
            </p>

            <div
                class="breath-circle"
                id="breathCircle"
            >

                <span
                    class="breath-text"
                    id="breathText"
                >
                    Hazır mısın?
                </span>

            </div>

            <div
                class="breath-counter"
                id="breathCounter"
            >
                1. tur
            </div>

        </div>

    `);


    startBreathingExercise();

}


function startBreathingExercise() {

    const circle =
        document.getElementById(
            "breathCircle"
        );


    const text =
        document.getElementById(
            "breathText"
        );


    const counter =
        document.getElementById(
            "breathCounter"
        );


    if (
        !circle ||
        !text ||
        !counter
    ) {
        return;
    }


    let round = 1;


    function inhale() {

        if (!circle.isConnected) {
            return;
        }


        circle.className =
            "breath-circle inhale";


        text.textContent =
            "Nefes al";


        setTimeout(
            hold,
            4000
        );

    }


    function hold() {

        if (!circle.isConnected) {
            return;
        }


        circle.className =
            "breath-circle hold";


        text.textContent =
            "Tut";


        setTimeout(
            exhale,
            4000
        );

    }


    function exhale() {

        if (!circle.isConnected) {
            return;
        }


        circle.className =
            "breath-circle exhale";


        text.textContent =
            "Nefes ver";


        setTimeout(() => {

            if (!circle.isConnected) {
                return;
            }


            round++;


            counter.textContent =
                `${round}. tur`;


            inhale();

        }, 6000);

    }


    setTimeout(
        inhale,
        500
    );

}


/* =====================================================
   JOURNAL
===================================================== */

function openJournal() {

    const saved =
        localStorage.getItem(
            JOURNAL_STORAGE_KEY
        ) || "";


    openModal(`

        <div class="journal-container">

            <h2>✍️ Duygularını yaz</h2>

            <p>
                Buraya sadece kendin için birkaç
                cümle yazabilirsin.
            </p>

            <textarea
                id="journalInput"
                placeholder="Bugün içimden geçenler..."
            ></textarea>

            <button
                class="save-journal"
                id="saveJournal"
                type="button"
            >
                Kaydet
            </button>

        </div>

    `);


    const input =
        document.getElementById(
            "journalInput"
        );


    if (input) {
        input.value = saved;
    }


    const saveButton =
        document.getElementById(
            "saveJournal"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveJournal
        );

    }

}


function saveJournal() {

    const input =
        document.getElementById(
            "journalInput"
        );


    if (!input) {
        return;
    }


    localStorage.setItem(
        JOURNAL_STORAGE_KEY,
        input.value
    );


    const button =
        document.getElementById(
            "saveJournal"
        );


    if (button) {

        button.textContent =
            "✓ Kaydedildi";

    }


    setTimeout(
        closeModal,
        700
    );

}

