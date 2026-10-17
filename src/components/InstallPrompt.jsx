import { useEffect, useState } from 'react';

function runningAsApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => runningAsApp());

  useEffect(() => {
    function onPrompt(event) {
      event.preventDefault();
      setPrompt(event);
    }
    function onInstalled() {
      setPrompt(null);
      setInstalled(true);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  return (
    <div className="card flat">
      <h3>Add Loc Party as an app</h3>
      <p className="field-hint">
        Install this site on your phone so it opens from your home screen. On iPhone, tap Share, then Add to Home
        Screen. On Android, tap the browser menu, then Install app or Add to Home Screen.
      </p>
      {prompt ? (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            prompt.prompt();
            const choice = await prompt.userChoice;
            setPrompt(null);
            if (choice?.outcome === 'accepted') setInstalled(true);
          }}
        >
          Install
        </button>
      ) : null}
    </div>
  );
}
