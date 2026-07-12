import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase.js';

const GDRIVE_ENABLED = import.meta.env.VITE_ENABLE_GDRIVE === 'true';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const PICKER_API_KEY = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return session.access_token;
}

let pickerScriptLoaded = false;
let pickerScriptLoading = false;
const pickerLoadCallbacks = [];

function loadPickerScript() {
  return new Promise((resolve, reject) => {
    if (pickerScriptLoaded) return resolve();
    pickerLoadCallbacks.push({ resolve, reject });
    if (pickerScriptLoading) return;
    pickerScriptLoading = true;

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('picker', () => {
        pickerScriptLoaded = true;
        pickerScriptLoading = false;
        pickerLoadCallbacks.forEach((cb) => cb.resolve());
        pickerLoadCallbacks.length = 0;
      });
    };
    script.onerror = () => {
      pickerScriptLoading = false;
      const err = new Error('Failed to load Google Picker');
      pickerLoadCallbacks.forEach((cb) => cb.reject(err));
      pickerLoadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export default function useGoogleDrive() {
  const [connected, setConnected] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);
  const popupRef = useRef(null);

  // Check connection status shortly after mount, deferred to browser-idle so
  // it doesn't compete with first-paint data fetches on the critical
  // initial-load path (this hits a cold-start serverless function). The
  // picker/download flows independently re-verify the connection at point of
  // use, so a slightly-late status here is harmless.
  useEffect(() => {
    if (!GDRIVE_ENABLED) {
      setConnected(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/gdrive/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res.ok) {
          const { connected: c } = await res.json();
          setConnected(c);
        }
      } catch {
        // Fail silently — treat as disconnected
        if (!cancelled) setConnected(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const useRIC = typeof window.requestIdleCallback === 'function';
    const handle = useRIC
      ? window.requestIdleCallback(run, { timeout: 3000 })
      : setTimeout(run, 1200);

    return () => {
      cancelled = true;
      if (useRIC) window.cancelIdleCallback?.(handle);
      else clearTimeout(handle);
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/gdrive/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { connected: c } = await res.json();
        setConnected(c);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    function handleMessage(e) {
      if (e.origin !== window.location.origin) return;
      if (popupRef.current && e.source !== popupRef.current) return;
      if (e.data?.type === 'gdrive-connected') {
        popupRef.current = null;
        refreshStatus();
      } else if (e.data?.type === 'gdrive-error') {
        popupRef.current = null;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshStatus]);

  const connect = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/gdrive/auth-url', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to get auth URL');
      const { url } = await res.json();

      // Open popup (centered)
      const w = 500, h = 600;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      popupRef.current = window.open(
        url, 'gdrive-auth',
        `width=${w},height=${h},left=${left},top=${top},popup=yes`,
      );
    } catch (err) {
      console.error('GDrive connect failed:', err);
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const token = await getAccessToken();
      await fetch('/api/gdrive/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnected(false);
    } catch (err) {
      console.error('GDrive disconnect failed:', err);
      throw err;
    }
  }, []);

  const openPicker = useCallback(async (onSelect) => {
    // Get a valid access token for the Picker
    const supaToken = await getAccessToken();
    const res = await fetch('/api/gdrive/picker-token', {
      headers: { Authorization: `Bearer ${supaToken}` },
    });
    if (!res.ok) throw new Error('Failed to get picker token');
    const data = await res.json();

    if (data.connected === false) {
      setConnected(false);
      throw new Error('Google Drive is not connected');
    }

    // Load the Picker script lazily
    await loadPickerScript();

    // Build and show the Picker
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .setMode(window.google.picker.DocsViewMode.LIST);

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setTitle('Attach a resume')
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setOAuthToken(data.accessToken)
      .setDeveloperKey(PICKER_API_KEY)
      .setAppId(GOOGLE_CLIENT_ID?.split('-')[0]) // numeric project ID prefix
      .setCallback((result) => {
        if (result.action === window.google.picker.Action.PICKED) {
          const doc = result.docs[0];
          onSelect({
            externalId: doc.id,
            filename: doc.name,
            externalMimeType: doc.mimeType,
            externalIconUrl: doc.iconUrl || null,
            fileSize: doc.sizeBytes ? Number(doc.sizeBytes) : null,
          });
        }
      })
      .build();

    picker.setVisible(true);
  }, []);

  return {
    enabled: GDRIVE_ENABLED,
    connected,
    loading,
    connect,
    disconnect,
    openPicker,
    refreshStatus,
  };
}
