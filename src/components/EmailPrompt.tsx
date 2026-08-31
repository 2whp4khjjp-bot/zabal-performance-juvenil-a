import { useState, type FormEvent } from 'react';
import { Mail, Save, ShieldCheck } from 'lucide-react';

const isValidEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

export function EmailPrompt({ playerName, saving, onSave }: { playerName: string; saving: boolean; onSave: (email: string) => Promise<boolean> }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }
    setError('');
    await onSave(clean);
  };

  return <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="email-title">
    <form className="profile-card" onSubmit={(event) => void submit(event)}>
      <div className="profile-card__icon"><Mail size={30} /></div>
      <p className="eyebrow eyebrow--dark">Completa tu perfil</p>
      <h2 id="email-title">Indica tu correo electrónico, {playerName.split(' ')[0]}</h2>
      <p>Solo tendrás que indicarlo una vez.</p>
      <label htmlFor="player-email"><Mail size={18} /> Correo electrónico</label>
      <input
        id="player-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
        placeholder="nombre@ejemplo.com"
        value={email}
        onChange={(event) => { setEmail(event.target.value); setError(''); }}
        required
        autoFocus
      />
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button button--primary button--wide" type="submit" disabled={!email.trim() || saving}><Save size={19} /> {saving ? 'Guardando…' : 'Guardar correo'}</button>
      <small><ShieldCheck size={14} aria-hidden="true" /> El correo queda guardado de forma privada.</small>
    </form>
  </div>;
}
