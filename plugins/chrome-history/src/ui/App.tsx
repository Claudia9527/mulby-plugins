import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, RefreshCw, Search } from 'lucide-react';
import { parseInitialKeyword, useMulby, usePluginInit } from './hooks/useMulby';

interface HistoryItem {
  title: string;
  url: string;
  icon: string;
}

interface SearchResult {
  profilePath: string;
  items: HistoryItem[];
  error?: string;
}

function faviconFor(item: HistoryItem) {
  if (item.icon && item.icon !== 'icon/browser.png') {
    return item.icon;
  }
  return 'icon/browser.png';
}

export default function App() {
  const { call, notify, outPlugin } = useMulby();
  const init = usePluginInit();
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [profilePath, setProfilePath] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (value: string) => {
    setLoading(true);
    setError('');
    try {
      const result = (await call('search', value)) as SearchResult;
      setProfilePath(result?.profilePath || '');
      setItems(result?.items || []);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    const initial = parseInitialKeyword(init?.input);
    setKeyword(initial);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [init?.input]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void search(keyword);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [keyword, search]);

  const handleOpen = async (item: HistoryItem) => {
    setBusy(true);
    try {
      const result = await call('open', item.url);
      if (result?.error) {
        notify(result.error, 'error');
        return;
      }
      outPlugin();
    } catch (err) {
      notify(err instanceof Error ? err.message : '打开失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const chooseProfile = async () => {
    setBusy(true);
    try {
      const result = await call('chooseProfilePath');
      if (result?.error) {
        notify(result.error, 'error');
        return;
      }
      if (!result?.cancelled) {
        setProfilePath(result?.profilePath || '');
        await search(keyword);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : '选择目录失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div className="search-control">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索标题或 URL，支持空格分隔多个关键词"
          />
        </div>
        <button className="icon-button" type="button" onClick={() => search(keyword)} title="刷新">
          <RefreshCw size={17} aria-hidden="true" />
        </button>
        <button className="profile-button" type="button" onClick={chooseProfile}>
          <FolderOpen size={17} aria-hidden="true" />
          <span>Profile</span>
        </button>
      </section>

      <div className="profile-path" title={profilePath}>
        {profilePath || '未设置 Profile，默认读取系统 Chrome Profile'}
      </div>

      {error ? <div className="status error">{error}</div> : null}
      {loading && !error ? <div className="status">搜索中...</div> : null}
      {!loading && !error && items.length === 0 ? <div className="status">没有匹配的历史记录</div> : null}

      <section className="result-list" aria-busy={loading || busy}>
        {items.map((item) => (
          <button
            className="history-item"
            type="button"
            key={item.url}
            onClick={() => handleOpen(item)}
          >
            <img
              src={faviconFor(item)}
              alt=""
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).src = 'icon/browser.png';
              }}
            />
            <span className="item-text">
              <strong>{item.title || item.url}</strong>
              <span>{item.url}</span>
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}
