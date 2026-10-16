import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

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

  if (installed) return <p className="field-hint">Loc Party is installed on this phone.</p>;
  if (!prompt) return null;

  return (
    <div className="card flat">
      <h3>Install the app</h3>
      <p className="field-hint">Add Loc Party to your home screen so announcements can reach this phone.</p>
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
    </div>
  );
}
