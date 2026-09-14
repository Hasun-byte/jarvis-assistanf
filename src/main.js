import { registerPlugin } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Custom native plugin implemented in android/app/.../DeviceControlPlugin.java
const DeviceControl = registerPlugin('DeviceControl');

const $ = (id) => document.getElementById(id);
const chatEl = $('chat');
const orb = $('orb');
const statusEl = $('status');

const STORAGE_KEY = 'jarvis_settings_v1';
const HISTORY_KEY = 'jarvis_history_v1';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { provider: 'anthropic', apiKey: '', autoSpeak: true };
  } catch {
    return { provider: 'anthropic', apiKey: '', autoSpeak: true };
  }
}
function saveSettings(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

let settings = loadSettings();
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

// ---------- UI helpers ----------
function addMessage(text, cls) {
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}
function renderHistory() {
  chatEl.innerHTML = '';
  history.forEach((m) => addMessage(m.text, m.role === 'user' ? 'user' : 'ai'));
}
renderHistory();
if (history.length === 0) {
  addMessage('Halo, saya Jarvis. Saya bisa mengobrol dan mengontrol beberapa fungsi perangkat Anda: senter, volume, dan membuka aplikasi. Ketuk ⚙ untuk atur API key AI terlebih dahulu.', 'system');
}

function setStatus(text) { statusEl.textContent = text; }

// ---------- Settings modal ----------
const modal = $('settingsModal');
$('settingsBtn').onclick = () => {
  $('providerSelect').value = settings.provider;
  $('apiKeyInput').value = settings.apiKey || '';
  $('autoSpeak').checked = settings.autoSpeak !== false;
  modal.classList.remove('hidden');
};
$('closeSettings').onclick = () => {
  settings.provider = $('providerSelect').value;
  settings.apiKey = $('apiKeyInput').value.trim();
  settings.autoSpeak = $('autoSpeak').checked;
  saveSettings(settings);
  modal.classList.add('hidden');
};
$('grantNotifBtn').onclick = async () => {
  try { await DeviceControl.openNotificationAccessSettings(); }
  catch (e) { addMessage('Tidak bisa membuka pengaturan notifikasi: ' + e.message, 'system'); }
};
$('grantOverlayBtn').onclick = async () => {
  try { await DeviceControl.openOverlaySettings(); }
  catch (e) { addMessage('Tidak bisa membuka pengaturan overlay: ' + e.message, 'system'); }
};

// ---------- System prompt: tells the AI how to request device actions ----------
const SYSTEM_PROMPT = `Kamu adalah Jarvis, asisten AI pribadi di ponsel Android milik pengguna, bergaya seperti asisten Iron Man: singkat, sopan, sedikit witty.
Kamu HARUS selalu membalas HANYA dengan satu objek JSON valid, tanpa teks lain di luar JSON, dengan bentuk persis:
{"reply": "<kalimat balasan untuk ditampilkan & diucapkan>", "action": null}
atau jika pengguna meminta kontrol perangkat, isi "action" dengan salah satu bentuk berikut:
{"type":"flashlight","value":"on"}  // atau "off"
{"type":"volume","value":<0-100>}
{"type":"open_app","query":"<nama aplikasi yang disebut user, misal whatsapp>"}
Jika tidak ada perintah kontrol perangkat, gunakan "action": null.
Jangan pernah menulis apapun di luar objek JSON tersebut.`;

async function callAnthropic(userText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [...historyToMessages(), { role: 'user', content: userText }]
    })
  });
  if (!res.ok) throw new Error('Anthropic API error: ' + res.status + ' ' + (await res.text()));
  const data = await res.json();
  const textBlock = (data.content || []).find((c) => c.type === 'text');
  return textBlock ? textBlock.text : '{"reply":"Maaf, saya tidak mendapat balasan.","action":null}';
}

async function callOpenAI(userText) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + settings.apiKey
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...historyToMessages(),
        { role: 'user', content: userText }
      ],
      max_tokens: 400
    })
  });
  if (!res.ok) throw new Error('OpenAI API error: ' + res.status + ' ' + (await res.text()));
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '{"reply":"Maaf, saya tidak mendapat balasan.","action":null}';
}

const GEMINI_MODEL = 'gemini-2.5-flash';

async function callGemini(userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${settings.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [...historyToGeminiContents(), { role: 'user', parts: [{ text: userText }] }],
      generationConfig: { maxOutputTokens: 400 }
    })
  });
  if (!res.ok) throw new Error('Gemini API error: ' + res.status + ' ' + (await res.text()));
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return text || '{"reply":"Maaf, saya tidak mendapat balasan.","action":null}';
}

function historyToGeminiContents() {
  // Gemini uses role "model" instead of "assistant", and no "system" role in contents
  return history.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));
}

function historyToMessages() {
  // last 10 turns for context economy
  return history.slice(-10).map((m) => ({ role: m.role, content: m.text }));
}

async function askAI(userText) {
  if (!settings.apiKey) {
    addMessage('Belum ada API key. Buka ⚙ Pengaturan dan masukkan API key AI Anda dulu.', 'system');
    return;
  }
  setStatus('Berpikir...');
  try {
    const raw =
      settings.provider === 'openai' ? await callOpenAI(userText) :
      settings.provider === 'gemini' ? await callGemini(userText) :
      await callAnthropic(userText);
    let parsed;
    try {
      const jsonStr = raw.trim().replace(/^```json|```$/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { reply: raw, action: null };
    }
    addMessage(parsed.reply, 'ai');
    history.push({ role: 'user', text: userText });
    history.push({ role: 'assistant', text: raw });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));

    if (settings.autoSpeak && parsed.reply) {
      TextToSpeech.speak({ text: parsed.reply, lang: 'id-ID', rate: 1.0 }).catch(() => {});
    }
    if (parsed.action) await runAction(parsed.action);
  } catch (e) {
    addMessage('Terjadi kesalahan: ' + e.message, 'system');
  } finally {
    setStatus('Siap membantu');
  }
}

// ---------- Executing device actions via native plugin ----------
async function runAction(action) {
  try {
    if (action.type === 'flashlight') {
      await DeviceControl.setFlashlight({ on: action.value === 'on' });
      addMessage('⚡ Senter ' + (action.value === 'on' ? 'dinyalakan' : 'dimatikan'), 'action');
    } else if (action.type === 'volume') {
      const pct = Math.max(0, Math.min(100, Number(action.value) || 0));
      await DeviceControl.setVolume({ percent: pct });
      addMessage('🔊 Volume diatur ke ' + pct + '%', 'action');
    } else if (action.type === 'open_app') {
      const r = await DeviceControl.openApp({ query: action.query || '' });
      addMessage(r && r.success ? '📱 Membuka ' + r.appName : '⚠ Aplikasi "' + action.query + '" tidak ditemukan', 'action');
    }
  } catch (e) {
    addMessage('⚠ Gagal menjalankan aksi perangkat: ' + e.message, 'action');
  }
}

// ---------- Send (text) ----------
$('sendBtn').onclick = sendText;
$('textInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendText(); });
function sendText() {
  const input = $('textInput');
  const val = input.value.trim();
  if (!val) return;
  addMessage(val, 'user');
  input.value = '';
  askAI(val);
}

// ---------- Voice input ----------
let listening = false;
$('micBtn').onclick = async () => {
  if (listening) return;
  try {
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') {
      const req = await SpeechRecognition.requestPermissions();
      if (req.speechRecognition !== 'granted') {
        addMessage('Izin mikrofon ditolak.', 'system');
        return;
      }
    }
    listening = true;
    orb.classList.add('listening');
    $('micBtn').classList.add('active');
    setStatus('Mendengarkan...');

    SpeechRecognition.addListener('partialResults', () => {});
    const result = await SpeechRecognition.start({ language: 'id-ID', maxResults: 1, partialResults: false, popup: false });
    const text = result?.matches?.[0];
    if (text) {
      addMessage(text, 'user');
      askAI(text);
    }
  } catch (e) {
    addMessage('Gagal menggunakan mikrofon: ' + e.message, 'system');
  } finally {
    listening = false;
    orb.classList.remove('listening');
    $('micBtn').classList.remove('active');
    setStatus('Siap membantu');
  }
};
