// comandos-novos.js
const axios = require('axios');
const fs = require('fs-extra');
const { sms } = require("./msg");

// Fake vCard para quoting
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "©IZUKA MINI BOT ✅",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=258833406646:+258833406646\nEND:VCARD`
        }
    }
};

// Newsletter context comum
const newsletterContext = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363401819417685@newsletter',
        newsletterName: 'IZUKA MINI BOT',
        serverMessageId: -1
    }
};

// Comando PLAY com botões de escolha
async function play(socket, m, args, config) {
    try {
        await socket.sendMessage(m.sender, { react: { text: '🎵', key: m.key } });

        const query = args.join(' ').trim();
        
        if (!query) {
            return await socket.sendMessage(m.sender, {
                text: `🎵 *ᴜsᴀɢᴇ:* ${config.PREFIX}play <nome da música>\n\n*ᴇxᴇᴍᴘʟᴏ:* ${config.PREFIX}play Happy Nation`
            }, { quoted: fakevCard });
        }

        // Primeiro, buscar informações da música
        await socket.sendMessage(m.sender, {
            text: `🔍 *Procurando por:* "${query}"...`
        }, { quoted: fakevCard });

        const searchUrl = `https://api.vreden.my.id/api/v1/download/play/audio?query=${encodeURIComponent(query)}`;
        
        const response = await axios.get(searchUrl, { timeout: 30000 });
        const data = response.data;

        if (!data.status || !data.result || !data.result.download) {
            throw new Error('Música não encontrada');
        }

        const metadata = data.result.metadata;
        const download = data.result.download;

        // Criar mensagem com botões de escolha
        const messageWithButtons = {
            image: { url: metadata.image },
            caption: `🎵 *${metadata.title}*\n\n` +
                    `👤 *Artista:* ${metadata.author.name}\n` +
                    `⏱️ *Duração:* ${metadata.timestamp}\n` +
                    `📊 *Visualizações:* ${metadata.views.toLocaleString()}\n` +
                    `🎚️ *Qualidade disponível:* ${download.availableQuality.join('kbps, ')}kbps\n\n` +
                    `*Escolha o formato de download:*`,
            buttons: [
                {
                    buttonId: `${config.PREFIX}play_audio_${metadata.videoId}`,
                    buttonText: { displayText: '🎵 ÁUDIO' },
                    type: 1
                },
                {
                    buttonId: `${config.PREFIX}play_document_${metadata.videoId}`,
                    buttonText: { displayText: '📄 DOCUMENTO' },
                    type: 1
                },
                {
                    buttonId: `${config.PREFIX}play_voice_${metadata.videoId}`,
                    buttonText: { displayText: '🎤 VOZ' },
                    type: 1
                }
            ],
            headerType: 1
        };

        await socket.sendMessage(m.sender, messageWithButtons, { quoted: fakevCard });

        // Salvar dados temporariamente para os botões
        if (!global.playCache) global.playCache = new Map();
        global.playCache.set(metadata.videoId, {
            metadata: metadata,
            download: download,
            query: query,
            timestamp: Date.now()
        });

        // Limpar cache após 10 minutos
        setTimeout(() => {
            if (global.playCache.has(metadata.videoId)) {
                global.playCache.delete(metadata.videoId);
            }
        }, 10 * 60 * 1000);

    } catch (error) {
        console.error('Play command error:', error);
        await socket.sendMessage(m.sender, {
            text: `❌ *Erro ao buscar música:*\n${error.message || 'Tente novamente mais tarde'}`
        }, { quoted: fakevCard });
    }
}

// Handler para botão ÁUDIO
async function playAudio(socket, m, args, config) {
    try {
        const videoId = args[0];
        if (!videoId || !global.playCache || !global.playCache.has(videoId)) {
            return await socket.sendMessage(m.sender, {
                text: '❌ *Sessão expirada!* Use o comando play novamente.'
            }, { quoted: fakevCard });
        }

        const cache = global.playCache.get(videoId);
        await socket.sendMessage(m.sender, {
            text: `⬇️ *Baixando áudio...*\n\n"${cache.metadata.title}"`
        }, { quoted: fakevCard });

        // Baixar o áudio
        const audioResponse = await axios.get(cache.download.url, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        const audioBuffer = Buffer.from(audioResponse.data);

        // Enviar como áudio
        await socket.sendMessage(m.sender, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${cache.metadata.title}.mp3`,
            contextInfo: newsletterContext
        }, { quoted: fakevCard });

        await socket.sendMessage(m.sender, {
            react: { text: '✅', key: m.key }
        });

    } catch (error) {
        console.error('Play Audio error:', error);
        await socket.sendMessage(m.sender, {
            text: '❌ *Erro ao baixar áudio!* Tente novamente.'
        }, { quoted: fakevCard });
    }
}

// Handler para botão DOCUMENTO
async function playDocument(socket, m, args, config) {
    try {
        const videoId = args[0];
        if (!videoId || !global.playCache || !global.playCache.has(videoId)) {
            return await socket.sendMessage(m.sender, {
                text: '❌ *Sessão expirada!* Use o comando play novamente.'
            }, { quoted: fakevCard });
        }

        const cache = global.playCache.get(videoId);
        await socket.sendMessage(m.sender, {
            text: `⬇️ *Baixando como documento...*\n\n"${cache.metadata.title}"`
        }, { quoted: fakevCard });

        // Baixar o áudio
        const audioResponse = await axios.get(cache.download.url, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        const audioBuffer = Buffer.from(audioResponse.data);

        // Enviar como documento
        await socket.sendMessage(m.sender, {
            document: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${cache.metadata.title}.mp3`,
            caption: `🎵 *${cache.metadata.title}*\n👤 ${cache.metadata.author.name}`,
            contextInfo: newsletterContext
        }, { quoted: fakevCard });

        await socket.sendMessage(m.sender, {
            react: { text: '✅', key: m.key }
        });

    } catch (error) {
        console.error('Play Document error:', error);
        await socket.sendMessage(m.sender, {
            text: '❌ *Erro ao baixar documento!* Tente novamente.'
        }, { quoted: fakevCard });
    }
}

// Handler para botão VOZ
async function playVoice(socket, m, args, config) {
    try {
        const videoId = args[0];
        if (!videoId || !global.playCache || !global.playCache.has(videoId)) {
            return await socket.sendMessage(m.sender, {
                text: '❌ *Sessão expirada!* Use o comando play novamente.'
            }, { quoted: fakevCard });
        }

        const cache = global.playCache.get(videoId);
        await socket.sendMessage(m.sender, {
            text: `⬇️ *Baixando como mensagem de voz...*\n\n"${cache.metadata.title}"`
        }, { quoted: fakevCard });

        // Baixar o áudio
        const audioResponse = await axios.get(cache.download.url, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        const audioBuffer = Buffer.from(audioResponse.data);

        // Enviar como voz (PTT)
        await socket.sendMessage(m.sender, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: true,
            fileName: `${cache.metadata.title}.mp3`,
            contextInfo: newsletterContext
        }, { quoted: fakevCard });

        await socket.sendMessage(m.sender, {
            react: { text: '✅', key: m.key }
        });

    } catch (error) {
        console.error('Play Voice error:', error);
        await socket.sendMessage(m.sender, {
            text: '❌ *Erro ao baixar voz!* Tente novamente.'
        }, { quoted: fakevCard });
    }
}

// Exportar todas as funções
module.exports = {
    fakevCard,
    newsletterContext,
    
    // Comandos principais
    play,
    playAudio,
    playDocument,
    playVoice,

    // Mapeamento de comandos para uso no handler principal
    commandMap: {
        'play': play,
        'play_audio': playAudio,
        'play_document': playDocument,
        'play_voice': playVoice
    }
};