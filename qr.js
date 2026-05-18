import Toxic_Tech, { 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pino from 'pino';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function makeid(len = 8) {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

router.get('/', async (req, res) => {
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
        tempPath = path.join('/tmp', 'toxic-qr-' + sessionId);
        fs.mkdirSync(tempPath, { recursive: true });
    }

    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(tempPath);

        const qrSocket = Toxic_Tech({
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

        qrSocket.ev.on('creds.update', saveCreds);

        qrSocket.ev.on('connection.update', async (update) => {
            const { connection, qr } = update;
            
            if (qr) {
                const qrBuffer = await QRCode.toBuffer(qr);
                if (!res.headersSent) {
                    res.setHeader('Content-Type', 'image/png');
                    res.send(qrBuffer);
                }
            }
            
            if (connection === 'open') {
                console.log('✅ fee QR connected successfully');
                
                try {
                    await qrSocket.sendMessage(qrSocket.user.id, {
                        text: `╭───(    FEE-XMD    )───
├───≫ Wᴇʟᴄᴏᴍᴇ ≪───
├ 
├ Hello! 👋 You're now connected
├ to Fee-Xmd Bot via QR.
├ 
├ Please wait a moment while we
├ generate your session ID.
├ 
├ It will be sent shortly... 🙂
╰──────────────────☉
> ©𝐏ᴏᴡᴇʀᴇᴅ Bʏ fredi`
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
                        
                        const sentSession = await qrSocket.sendMessage(qrSocket.user.id, {
                            text: base64
                        });
                        
                        const infoMessage = `╭───(    FEE-XMD    )───
├───≫ Cᴏɴɴᴇᴄᴛᴇᴅ Sᴜᴄᴄᴇssғᴜʟʟʏ ≪───
├ 
├ 🔥 DEVICE CONNECTED SUCCESSFULLY 🔥
├ 
├ 📦 Your session ID is ready!
├ 
├ 🔐 Please copy and store it securely.
├ You'll need it to deploy your
├ Fee-XMD bot.
├ 
├ 🌟 Let the celebration begin with
├ Fee-Xmd power!
├ 
╰──────────────────☉
> ©𝐏ᴏᴡᴇʀᴇᴅ Bʏ frediEzra

┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈

📌 *Need Assistance? Reach Out Anytime:*  
• 👑 *Owner:* https://wa.me/255752593977  
• 💬 *Group Chat:* https://chat.whatsapp.com/ICPNmeOX3DoAE0Wy8eCc32  
• 📢 *Channel:* https://whatsapp.com/channel/0029VbBkXG5Dp2Q9Cyhbb02Q  
• 📸 *Instagram:* https://www.instagram.com/frediezra
• 👤 *Facebook:* https://www.facebook.com/FrediEzra
• 🔔 *TikTok:* https://www.tiktok.com/frediezra1
• 💻 *GitHub Repo:* https://github.com/Fred1e/Fee-Xmd

🧠 *Support Toxic-MD Project:*  
⭐ Star & 🍴 Fork the repo to stay updated with new features!

🩷 *#Thanks | #FrediBots | #fredi_ezra;

                        await qrSocket.sendMessage(qrSocket.user.id, { 
                            text: infoMessage 
                        }, { quoted: sentSession });
                    }
                } catch (error) {
                    console.error("Error sending session:", error);
                }
                
                await delay(2000);
                await qrSocket.ws.close();
                
                setTimeout(() => {
                    if (fs.existsSync(tempPath)) {
                        fs.rmSync(tempPath, { recursive: true, force: true });
                    }
                }, 5000);
            }
        });

        setTimeout(async () => {
            try {
                await qrSocket.ws.close();
            } catch (e) {}
            if (fs.existsSync(tempPath)) {
                fs.rmSync(tempPath, { recursive: true, force: true });
            }
        }, 120000);

    } catch (error) {
        console.error("Error in QR endpoint:", error);
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: `╭───(    FEE-XMD    )───
├───≫ Qʀ Gᴇɴᴇʀᴀᴛɪᴏɴ Fᴀɪʟᴇᴅ ≪───
├ 
├ Couldn't generate QR code.
├ ${error.message || 'Unknown error'}
├ 
├ Please try again later.
╰──────────────────☉
> fedi`
            });
        }
    }
});

export default router;