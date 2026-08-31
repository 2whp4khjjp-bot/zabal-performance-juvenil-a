import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmailPrompt } from './EmailPrompt';

describe('correo electrónico del jugador', () => {
  it('normaliza y guarda un correo válido desde el aviso de acceso', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<EmailPrompt playerName="Adrián Vega" saving={false} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: '  ADRIAN@EJEMPLO.COM  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar correo' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('adrian@ejemplo.com'));
  });

  it('no envía un correo con formato no válido', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<EmailPrompt playerName="Adrián Vega" saving={false} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'correo-invalido' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar correo' }).closest('form')!);

    expect((await screen.findByRole('alert')).textContent).toContain('Introduce un correo electrónico válido.');
    expect(onSave).not.toHaveBeenCalled();
  });
});
