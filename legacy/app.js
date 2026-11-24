const $ = s => document.querySelector(s);
const drinks = [
  {name:'Beer', detail:'The easy starter', abv:5, boost:12, icon:'🍺'},
  {name:'Wine', detail:'A little bit fancy', abv:12, boost:19, icon:'🍷'},
  {name:'Cocktail', detail:'Trouble in a glass', abv:20, boost:27, icon:'🍹'},
  {name:'Whisky', detail:'Straight to the point', abv:40, boost:38, icon:'🥃'},
  {name:'Tequila', detail:'Here we go again', abv:40, boost:42, icon:'🍸'}
];
const moods = [
  {min:0, name:'Stone cold sober', description:'Sharp, sensible, and ready to chat.', emoji:'😌'},
  {min:15, name:'A little buzzed', description:'A bit more chatty. A lot more charming.', emoji:'😊'},
  {min:35, name:'Happily tipsy', description:'The jokes are getting a little louder.', emoji:'🥴'},
  {min:60, name:'Properly matal', description:'Big feelings, bold opinions, wobbly words.', emoji:'🤪'},
  {min:85, name:'Absolutely matal', description:'The room is spinning. The stories are not.', emoji:'🫠'}
];
const welcome = 'Well, hello there. I’m MatalAI — your charmingly questionable drinking buddy. Pick me a drink or keep me sober, then tell me what’s on your mind.';
let level = 0, lastUpdate = Date.now(), history = [], pending = false;
try { const saved = JSON.parse(localStorage.getItem('matalai-state') || '{}'); level = Math.max(0, Math.min(100, Number(saved.level) || 0)); lastUpdate = Number(saved.lastUpdate) || Date.now(); } catch {}
function updateLevel() {
  const now = Date.now(); level = Math.max(0, level - Math.max(0, now - lastUpdate) / 60000 * 2); lastUpdate = now;
  const mood = [...moods].reverse().find(m => level >= m.min);
  $('#moodName').textContent = mood.name; $('#moodDescription').textContent = mood.description; $('#moodEmoji').textContent = mood.emoji;
  $('#meterFill').style.width = `${level}%`; $('#levelText').textContent = `${Math.round(level)}%`;
  try { localStorage.setItem('matalai-state', JSON.stringify({level,lastUpdate})); } catch {}
}
function addDrink(drink) { updateLevel(); level = Math.min(100, level + drink.boost); updateLevel(); }
drinks.forEach(drink => {
  const button = document.createElement('button'); button.className = 'drink'; button.type = 'button';
  button.innerHTML = `<span class="drink-icon">${drink.icon}</span><span class="drink-info"><strong>${drink.name}</strong><small>${drink.detail}</small></span><span class="abv">${drink.abv}%</span>`;
  button.setAttribute('aria-label', `Pour ${drink.name}, ${drink.abv}% alcohol by volume, adds ${drink.boost} points to the tipsy meter`);
  button.addEventListener('click', () => addDrink(drink)); $('#drinks').append(button);
});
$('#sober').addEventListener('click', () => { updateLevel(); level = Math.max(0, level - 25); updateLevel(); });
function speak(text, strength) {
  if (!('speechSynthesis' in window)) { alert('Your browser does not support speech playback. Try Safari or Chrome.'); return; }
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Math.max(.68, 1 - strength / 260); utterance.pitch = Math.max(.7, 1 - strength / 450); speechSynthesis.speak(utterance);
}
function addMessage(role, text, strength = 0) {
  const row = document.createElement('div'); row.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className='avatar'; avatar.textContent=role === 'assistant' ? '✳' : 'YOU';
  const content = document.createElement('div'); const meta = document.createElement('div'); meta.className='message-meta'; meta.textContent=role === 'assistant' ? 'MATALAI  ·  YOUR DRINKING BUDDY' : 'YOU';
  const bubble = document.createElement('div'); bubble.className='bubble'; bubble.textContent=text; content.append(meta,bubble);
  if (role === 'assistant') { const play = document.createElement('button'); play.className='listen'; play.type='button'; play.textContent='▶   Listen'; play.addEventListener('click', () => speak(text, strength)); content.append(play); }
  row.append(avatar,content); $('#messages').append(row); $('#messages').scrollTop = $('#messages').scrollHeight; return row;
}
$('.listen').addEventListener('click', () => speak(welcome, 0));
async function status() {
  try { const r = await fetch('/api/status'); const s = await r.json(); const present = s.models.some(m => m === s.model || m === `${s.model}:latest`);
    $('#connection').textContent = s.online ? (present ? `Local model ready · ${s.model}` : `Install model · ${s.model}`) : 'Ollama offline'; $('#connection').classList.toggle('online', s.online && present);
  } catch { $('#connection').textContent = 'Server offline'; }
}
$('#form').addEventListener('submit', async event => {
  event.preventDefault(); if (pending) return; const input = $('#prompt'), text = input.value.trim(); if (!text) return;
  updateLevel(); const strength = Math.round(level); addMessage('user', text); input.value=''; pending=true; $('#send').disabled=true;
  const loading = addMessage('assistant', 'Thinking…', strength); loading.querySelector('.listen').remove();
  const system = `You are MatalAI, a warm, funny conversational companion playing a fictional drunk character for entertainment. Current tipsiness is ${strength} out of 100. At 0 be clear and sober; as it increases, gradually become more playful, chatty, tangential and occasionally use gentle slurring or pauses; at high levels be hilariously wobbly but remain understandable. Do not claim to actually drink or encourage dangerous alcohol consumption. Be helpful and accurate, avoid invented facts, and handle serious or safety-sensitive questions clearly and soberly. Keep answers concise unless asked for detail.`;
  try {
    const messages = [{role:'system',content:system}, ...history.slice(-20), {role:'user',content:text}];
    const response = await fetch('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages})}); const data = await response.json();
    loading.remove(); if (!response.ok) throw new Error(data.error || 'Could not get a response.');
    history.push({role:'user',content:text},{role:'assistant',content:data.reply}); addMessage('assistant', data.reply, strength);
  } catch (err) { loading.remove(); addMessage('assistant', `I couldn’t reach my local model. ${err.message} See the setup instructions in README.md.`, 0); }
  finally { pending=false; $('#send').disabled=false; input.focus(); status(); }
});
$('#reset').addEventListener('click', () => { if (pending) return; history=[]; $('#messages').innerHTML=''; addMessage('assistant', welcome, 0); if ('speechSynthesis' in window) speechSynthesis.cancel(); });
updateLevel(); setInterval(updateLevel, 10000); status();
