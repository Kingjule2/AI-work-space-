const OFFICE = 'http://127.0.0.1:19821';
let forwarding = false;
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'JADIDULU_SNAPSHOT') return;
  if (!sender.tab || !sender.url?.startsWith('http://127.0.0.1:19820/')) return;
  if (forwarding) { respond({ skipped: true }); return; }
  forwarding = true;
  (async () => {
    const { pairingCode, enabled } = await chrome.storage.local.get(['pairingCode', 'enabled']);
    if (!enabled || !pairingCode) return { disabled: true };
    if (message.error) {
      await chrome.storage.local.set({ bridgeStatus: message.error, lastError: true });
      await fetch(`${OFFICE}/api/bridge`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': pairingCode }, body: JSON.stringify({ disconnected: true }), signal: AbortSignal.timeout(8000) });
      return { error: message.error };
    }
    const response = await fetch(`${OFFICE}/api/bridge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': pairingCode },
      body: JSON.stringify(message.snapshot), signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || `Office returned ${response.status}.`); }
    const result = await response.json();
    await chrome.storage.local.set({ bridgeStatus: `Connected · ${result.agents} Wakers received`, lastError: false, lastSynced: Date.now() });
    await chrome.action.setBadgeText({ text: 'ON' });
    await chrome.action.setBadgeBackgroundColor({ color: '#758b5c' });
    return result;
  })().then(respond).catch(async error => {
    await chrome.storage.local.set({ bridgeStatus: error.message, lastError: true });
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#b7904b' });
    respond({ error: error.message });
  }).finally(() => forwarding = false);
  return true;
});
