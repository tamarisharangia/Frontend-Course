import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { createSyncKey, disableSync, enableSync, getSyncKey, KEY_RE, syncLink, syncNow, useSyncStatus } from '../lib/sync';

export function SyncPanel() {
  const status = useSyncStatus();
  const [key, setKey] = useState(getSyncKey);
  const [input, setInput] = useState('');
  const [qr, setQr] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!key || !showQr) return;
    QRCode.toString(syncLink(key), { type: 'svg', margin: 1, width: 200 }).then(setQr).catch(() => setQr(''));
  }, [key, showQr]);

  const turnOn = (k: string) => {
    setKey(k);
    void enableSync(k);
  };

  const copy = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(syncLink(key));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const statusText =
    status.state === 'syncing' ? 'Синхронизируем…'
    : status.state === 'ok' ? (status.at ? `✓ Синхронизировано в ${new Date(status.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Синхронизация включена')
    : status.state === 'error' ? `⚠ ${status.message}`
    : '';

  if (!key) {
    return (
      <div className="card stack">
        <h3>Синхронизация между устройствами</h3>
        <p className="muted small" style={{ margin: 0 }}>
          Проходите курс и с компьютера, и с телефона: прогресс, решения заданий и чек-листы будут объединяться автоматически.
          Аккаунт не нужен — устройства связывает секретный ключ.
        </p>
        <div><button className="btn btn-primary" onClick={() => turnOn(createSyncKey())}>Включить синхронизацию</button></div>
        <hr style={{ margin: 'var(--space-2xs) 0' }} />
        <label className="small">
          Уже включили на другом устройстве? Вставьте ключ или ссылку:
          <input type="text" value={input} placeholder="32 символа или ссылка …#sync=…" onChange={(e) => setInput(e.target.value.trim())} />
        </label>
        <div>
          <button className="btn" disabled={!KEY_RE.test(extractKey(input))} onClick={() => turnOn(extractKey(input))}>Подключить</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card stack">
      <div className="row">
        <h3 style={{ margin: 0 }}>Синхронизация между устройствами</h3>
        <span className="spacer" />
        <span className={`badge ${status.state === 'error' ? 'badge-warn' : 'badge-done'}`}>Включена</span>
      </div>
      <p className="small" role="status" style={{ margin: 0, color: status.state === 'error' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{statusText}</p>
      <p className="muted small" style={{ margin: 0 }}>
        Чтобы подключить телефон, откройте на нём ссылку ниже или отсканируйте QR-код камерой. Ключ работает как пароль — не публикуйте его.
      </p>
      <div className="row">
        <button className="btn btn-primary" onClick={() => setShowQr(!showQr)}>{showQr ? 'Скрыть QR-код' : 'Показать QR-код'}</button>
        <button className="btn" onClick={copy}>{copied ? 'Скопировано ✓' : 'Скопировать ссылку'}</button>
        <button className="btn btn-ghost" onClick={() => void syncNow()} disabled={status.state === 'syncing'}>Синхронизировать сейчас</button>
      </div>
      {showQr && qr && (
        <div style={{ background: '#fff', padding: 'var(--space-xs)', borderRadius: 'var(--radius-m)', width: 'fit-content' }} dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR-код для подключения телефона" />
      )}
      <details className="small">
        <summary style={{ cursor: 'pointer' }}>Показать ключ</summary>
        <code style={{ wordBreak: 'break-all' }}>{key}</code>
      </details>
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (!confirm('Отключить синхронизацию на этом устройстве? Прогресс здесь сохранится, но перестанет обновляться с других устройств.')) return;
          disableSync();
          setKey(null);
        }}>Отключить на этом устройстве</button>
      </div>
    </div>
  );
}

function extractKey(text: string) {
  const m = text.match(/[a-f0-9]{32}/);
  return m ? m[0] : '';
}
