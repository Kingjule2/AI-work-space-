const status = document.querySelector('#status');
async function refresh() {
  const data = await chrome.storage.local.get(['pairingCode', 'bridgeStatus', 'enabled', 'lastSynced']);
  if (!document.querySelector('#code').value && data.pairingCode) document.querySelector('#code').value = data.pairingCode;
  status.textContent = data.enabled ? data.lastSynced && Date.now() - data.lastSynced > 20000 ? 'No recent update. Keep the logged-in QoderWake tab open.' : data.bridgeStatus || 'Waiting for the QoderWake tab…' : 'Disconnected';
}
document.querySelector('#connect').onclick = async () => {
  const pairingCode = document.querySelector('#code').value.trim();
  if (!/^[a-f0-9]{48}$/.test(pairingCode)) { status.textContent = 'Paste the full pairing code from the estate connection dialog.'; return; }
  await chrome.storage.local.set({ pairingCode, enabled: true, bridgeStatus: 'Waiting for the QoderWake tab…', lastSynced: 0 });
  const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:19820/*' });
  if (!tabs.length) { status.textContent = 'Open your QoderWake tab first, then click Connect.'; return; }
  let reached = false;
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, { type: 'JADIDULU_REFRESH' }); reached = true; } catch { /* Tabs opened before installation need a normal reload. */ }
  }
  status.textContent = reached ? 'Connecting to your estate…' : 'Refresh your QoderWake tab, then click Connect again.';
};
document.querySelector('#disconnect').onclick = async () => {
  const { pairingCode } = await chrome.storage.local.get('pairingCode');
  await chrome.storage.local.set({ enabled: false, bridgeStatus: 'Disconnected', lastSynced: 0 });
  await chrome.action.setBadgeText({ text: '' });
  status.textContent = 'Disconnected';
  if (pairingCode) try { await fetch('http://127.0.0.1:19821/api/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': pairingCode }, body: JSON.stringify({ disconnected: true }), signal: AbortSignal.timeout(5000) }); } catch { status.textContent = 'Disconnected. The office will mark the bridge stale within 20 seconds.'; }
};
chrome.storage.onChanged.addListener(refresh);
refresh();
