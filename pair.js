import Toxic_Tech, { 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    fetchLatestBaileysVersion,
    generateWAMessageFromContent, 
    proto 
} from '@whiskeysockets/baileys';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function cleanNumber(input) {
    let num = input.replace(/[\s\-\(\)\+\.]/g, '');
    num = num.replace(/[^0-9]/g, '');
    if (num.startsWith('00')) {
        num = num.slice(2);
    }
    return num;
}

function makeid(len = 6) {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

router.get('/', async (req, res) => {
    const { number } = req.query;
    
    try {
        if (!number) {
            return res.json({
                status: 'error',
                message: `╭━━━ᕙ    ᖴᗴᗴ-᙭ᗰᗪツ    ᕗ━━━
├━━━≫ Pᴀɪʀɪɴɢ ≪━━━
├ 
├ Oi genius, give me a number
├ to pair with. You think I can
├ read your mind?
├ 
├ Example: /code?number= 255752593977
├ 
├ Spaces, dashes, plus signs...
├ I'll clean that mess up for you.
╰━━━━━━━━━━━━━━━━ᕗ
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 fredi_ezra`
            });
        }

        const cleanedNumber = cleanNumber(number);

        if (cleanedNumber.length < 6 || cleanedNumber.length > 15) {
            return res.json({
                status: 'error',
                message: `╭━━━ᕙ    ᖴᗴᗴ-᙭ᗰᗪツ    ᕗ━━━
├━━━≫ Iɴᴠᴀʟɪᴅ Nᴜᴍʙᴇʀ ≪━━━
├ 
├ That number is garbage.
├ Cleaned: ${cleanedNumber}
├ Need 6-15 digits with country code.
├ Try again with a real number.
╰━━━━━━━━━━━━━━━━ᕗ
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 fredi_ezra`
            });
        }

        const sessionId = makeid(8);
        let tempPath;
        
        try {
            const basePath = path.join(__dirname, 'temp');
            if (!fs.existsSync(basePath)) {
                fs.mkdirSync(basePath, { recursive: true });
            }
            tempPath = path.join(basePath, sessionId);
            fs.mkdirSync(tempPath, { recursive: true });
        } catch (dirErr) {
            tempPath = path.join('/tmp', 'toxic-pair-' + sessionId);
            fs.mkdirSync(tempPath, { recursive: true });
        }

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(tempPath);

        const pairSocket = Toxic_Tech({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
            getMessage: async () => undefined,
            markOnlineOnConnect: true,
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 30000,
            defaultQueryTimeoutMs: 60000,
            transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
            retryRequestDelayMs: 10000
        });

        pairSocket.ev.on('creds.update', saveCreds);

        await delay(3000);
        const code = await pairSocket.requestPairingCode(cleanedNumber);

        if (!code) throw new Error("Pairing code generation failed. The number might not be on WhatsApp.");

        const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;

        // Send pairing code response
        res.json({
            status: 'success',
            number: cleanedNumber,
            code: formattedCode,
            rawCode: code,
            message: `╭━━━ᕙ    ᖴᗴᗴ-᙭ᗰᗪツ    ᕗ━━━
├━━━≫ Pᴀɪʀɪɴɢ Cᴏᴅᴇ ≪━━━
├ 
├ Number: ${cleanedNumber}
├ Code: *${formattedCode}*
├ 
├ Copy the code and paste it
├ in your WhatsApp linked
├ devices section.
├ 
├ The code expires quickly so
├ move your slow ass.
╰━━━━━━━━━━━━━━━━ᕗ
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 fredi_ezra`
        });

        // Handle WhatsApp connection and session sending
        pairSocket.ev.on('connection.update', async (update) => {
            const { connection } = update;
            
            if (connection === 'open') {
                console.log('✅ ᖴᗴᗴ-᙭ᗰᗪツ connected successfully');
                
                try {
                    // Send welcome message
                    await pairSocket.sendMessage(pairSocket.user.id, {
                        text: `╭━━━ᕙ    ᖴᗴᗴ-᙭ᗰᗪツ    ᕗ━━━
├━━━≫ Wᴇʟᴄᴏᴍᴇ ≪━━━
├ 
├ Hello! 👋 You're now connected
├ to ᖴᗴᗴ-᙭ᗰᗪツ Bot.
├ 
├ Please wait a moment while we
├ generate your session ID.
├ 
├ It will be sent shortly... 🙂
╰━━━━━━━━━━━━━━━━ᕗ
> ©𝐏𝐨𝐰ᴇʀᴇᴅ Bʏ fredi_ezra`
                    });
                    
                    await delay(15000);
                    
                    const credsPath = path.join(tempPath, "creds.json");
                    let sessionData = null;
                    let attempts = 0;
                    
                    while (attempts < 10 && !sessionData) {
                        if (fs.existsSync(credsPath)) {
                            const data = fs.readFileSync(credsPath);
                            if (data && data.length > 50) {
                                sessionData = data;
                                break;
                            }
                        }
                        await delay(4000);
                        attempts++;
                    }
                    
                    if (sessionData) {
                        const base64 = Buffer.from(sessionData).toString('base64');
                        
                        const sentSession = await pairSocket.sendMessage(pairSocket.user.id, {
                            text: base64
                        });
                        
                        const infoMessage = `╭━━━ᕙ    ᖴᗴᗴ-᙭ᗰᗪツ    ᕗ━━━
├━━━≫ Cᴏɴɴᴇᴄᴛᴇᴅ Sᴜᴄᴄᴇssғᴜʟʟʏ ≪━━━
├ 
├ 🔥 DEVICE CONNECTED SUCCESSFULLY 🔥
├ 
├ 📦 Your session ID is ready!
├ 
├ 🔐 Please copy and store it securely.
├ You'll need it to deploy your
├ ᖴᗴᗴ-᙭ᗰᗪツ bot.
├ 
├ 🌟 Let the celebration begin with
├ ᖴᗴᗴ-᙭ᗰᗪツ power!
├ 
╰━━━━━━━━━━━━━━━━ᕗ
> ©𝐏ᴏᴡᴇʀᴇᴅ Bʏ fredi_ezra

┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈

📌 *Need Assistance? Reach Out Anytime:*  
• 👑 *Owner:* https://wa.me/255752593977  
• 💬 *Group Chat:* https://chat.whatsapp.com/ICPNmeOX3DoAE0Wy8eCc32  
• 📢 *Channel:* https://whatsapp.com/channel/0029VbBkXG5Dp2Q9Cyhbb02Q  
• 📸 *Instagram:* https://www.instagram.com/frediezra
• 👤 *Facebook:* https://www.facebook.com/FrediEzra
• 🔔 *TikTok:* https://www.tiktok.com/frediezra1
• 💻 *GitHub Repo:* https://github.com/Fred1e/Fee-Xmd

🧠 *Support ᖴᗴᗴ-᙭ᗰᗪツ Project:*  
⭐ Star & 🍴 Fork the repo to stay updated with new features!

🩷 *#Thanks | #FeeXmd | #fredi_ezra*`;

                        await pairSocket.sendMessage(pairSocket.user.id, { 
                            text: infoMessage 
                        }, { quoted: sentSession });
                    }
                } catch (error) {
                    console.error("Error sending session:", error);
                }
                
                await delay(2000);
                await pairSocket.ws.close();
                
                setTimeout(() => {
                    if (fs.existsSync(tempPath)) {
                        fs.rmSync(tempPath, { recursive: true, force: true });
                    }
                }, 5000);
            }
        });

        setTimeout(async () => {
            try {
                await pairSocket.ws.close();
            } catch (e) {}
        }, 60000);

    } catch (error) {
        console.error("Error in pair endpoint:", error);
        res.status(500).json({
            status: 'error',
            message: `╭━━━ᕙ    ᖴᗴᗴ-᙭ᗰᗪツ    ᕗ━━━
├━━━≫ Pᴀɪʀɪɴɢ Fᴀɪʟᴇᴅ ≪━━━
├ 
├ Couldn't generate the code.
├ ${error.message || 'Unknown error'}
├ 
├ Make sure the number is valid
├ and actually on WhatsApp.
├ Then try again, if you can
├ manage that.
╰━━━━━━━━━━━━━━━━ᕗ
> ©𝐏ᴏᴡᴇʀᴇᴅ Bʏ frediEzra`
        });
    }
});

export default router;