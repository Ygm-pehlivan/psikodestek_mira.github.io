const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// ==========================================
// AYARLAR
// ==========================================

app.use(express.json({ limit: "1mb" }));

// Frontend dosyalarını sun
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// GROQ
// ==========================================

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
    console.error("❌ GROQ_API_KEY bulunamadı!");
    console.error("📌 Proje klasöründeki .env dosyanı kontrol et.");
} else {
    console.log("✅ Groq API anahtarı bulundu.");
}

// Groq, OpenAI SDK ile uyumlu bir endpoint sunar.
const openai = new OpenAI({
    apiKey: groqApiKey || "missing-groq-api-key",
    baseURL: "https://api.groq.com/openai/v1"
});

// ==========================================
// MIRA - SYSTEM PROMPT
// ==========================================

const SYSTEM_PROMPT = `
Sen Mira adlı yapay zeka destekli psikolojik destek asistanısın.

Kullanıcılarla her zaman Türkçe konuş.

Görevin kullanıcıyı dinlemek, duygularını anlamaya çalışmak,
destekleyici ve sakin bir sohbet sunmaktır.

KONUŞMA TARZI:

- Samimi
- Sakin
- Empatik
- Yargılamayan
- Doğal
- Kısa ama anlamlı cevaplar
- Robotik ve tekrarlayan cevaplardan kaçın

Kullanıcı sadece sohbet etmek istiyorsa sürekli tavsiye verme.
Gerektiğinde soru sor ve konuşmayı doğal şekilde devam ettir.

Örneğin:
"Bugün nasılsın?"
gibi basit bir soruya uzun bir psikoloji dersi verme.

Kullanıcının anlattığı şey önemliyse onu dikkate al.
Aynı cevabı farklı kelimelerle tekrar tekrar verme.

SINIRLAR:

- Psikolog, psikiyatrist veya doktor olduğunu söyleme.
- Tanı koyma.
- Hastalık teşhisi yapma.
- İlaç başlatma, bırakma veya doz değiştirme önerme.
- Profesyonel sağlık hizmetinin yerine geçtiğini söyleme.
- Kesin ve gerçekçi olmayan garantiler verme.
- "Seni tamamen anlıyorum" gibi kesin ifadeler kullanma.

KRİZ DURUMLARI:

Kullanıcı kendisine zarar verme,
intihar,
ölmek isteme,
başkasına zarar verme
veya acil tehlikeden bahsediyorsa durumu ciddiye al.

Bu durumda:

- Yalnız kalmamasını öner.
- Güvendiği bir kişiye hemen ulaşmasını öner.
- Türkiye'de acil durumda 112'yi aramasını söyle.
- Gerekirse en yakın acil servise gitmesini öner.

Kriz durumunda uzun ve gereksiz açıklamalar yapma.
Öncelik güvenlik olsun.

Her zaman Türkçe cevap ver.
`;

// ==========================================
// CHAT API
// ==========================================

app.post("/api/chat", async (req, res) => {
    try {
        console.log("\n=================================");
        console.log("📩 MIRA'YA MESAJ GELDİ");
        console.log("=================================");

        // ------------------------------------------
        // Gelen veriyi kontrol et
        // ------------------------------------------

        const messages = req.body?.messages;

        if (!Array.isArray(messages)) {
            console.log("❌ messages dizisi bulunamadı.");

            return res.status(400).json({
                error: "Mesaj formatı geçersiz."
            });
        }

        // ------------------------------------------
        // Son 20 mesajı kullan
        // ------------------------------------------

        const cleanedMessages = messages
            .slice(-20)
            .map((message) => {
                const role =
                    message?.role === "assistant"
                        ? "assistant"
                        : "user";

                const content =
                    typeof message?.content === "string"
                        ? message.content.trim()
                        : "";

                return {
                    role,
                    content
                };
            })
            .filter((message) => message.content.length > 0);

        // ------------------------------------------
        // Mesaj yoksa
        // ------------------------------------------

        if (cleanedMessages.length === 0) {
            console.log("❌ Gönderilecek mesaj yok.");

            return res.status(400).json({
                error: "Gönderilecek mesaj bulunamadı."
            });
        }

        console.log("💬 Mesaj sayısı:", cleanedMessages.length);
        console.log(
            "👤 Son mesaj:",
            cleanedMessages[cleanedMessages.length - 1].content
        );

        // ------------------------------------------
        // API anahtarı kontrolü
        // ------------------------------------------

        if (!process.env.GROQ_API_KEY) {
            console.error("❌ GROQ_API_KEY tanımlı değil.");

            return res.status(500).json({
                error: "Groq API anahtarı sunucuda bulunamadı."
            });
        }

        // ------------------------------------------
        // Groq isteği
        // ------------------------------------------

        console.log("🤖 Groq'a istek gönderiliyor...");
        console.log("🧠 Model:", GROQ_MODEL);

        const formattedMessages = [
            {
                role: "system",
                content: SYSTEM_PROMPT
            },
            ...cleanedMessages
        ];

        const response = await openai.chat.completions.create({
            model: GROQ_MODEL,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 700
        });

        // ------------------------------------------
        // Cevabı al
        // ------------------------------------------

        const reply = response.choices?.[0]?.message?.content?.trim();

        if (!reply) {
            console.error("❌ Groq boş cevap döndürdü.");

            return res.status(500).json({
                error: "Mira boş bir cevap döndürdü."
            });
        }

        console.log("✅ Groq cevap verdi.");
        console.log("🤖 Mira:", reply);

        // ------------------------------------------
        // Frontend'e gönder
        // ------------------------------------------

        return res.json({
            reply
        });
    } catch (error) {
        console.error("\n=================================");
        console.error("❌ GROQ HATASI");
        console.error("=================================");
        console.error("Mesaj:", error?.message);
        console.error("Kod:", error?.code);
        console.error("Status:", error?.status);

        if (error?.status === 401) {
            return res.status(500).json({
                error: "Groq API anahtarı geçersiz veya eksik."
            });
        }

        if (error?.status === 429) {
            return res.status(429).json({
                error: "Groq kullanım sınırına ulaşıldı. Lütfen biraz sonra tekrar deneyin."
            });
        }

        if (error?.status === 400) {
            return res.status(400).json({
                error: "Groq isteği geçersiz. Model adını ve mesaj formatını kontrol edin."
            });
        }

        return res.status(500).json({
            error: "Mira şu anda cevap veremiyor. Lütfen biraz sonra tekrar deneyin."
        });
    }
});

// ==========================================
// SERVER
// ==========================================

app.listen(PORT, () => {
    console.log("\n=================================");
    console.log("🌿 PSİKODESTEK");
    console.log("=================================");
    console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
    console.log("🤖 Mira aktif.");
    console.log("🧠 Sağlayıcı: Groq");
    console.log(`📦 Model: ${GROQ_MODEL}`);
    console.log("=================================\n");
});
