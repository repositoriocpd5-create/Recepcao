import React from 'react';
import { cn } from '@/lib/utils';

const CONECTIVOS = new Set(['de', 'da', 'das', 'do', 'dos', 'e']);

/** Iniciais do primeiro e do último nome (ex.: "Ana Paula Mendonça" → "AM"; "cpdinfra" → "CP"). */
export const iniciaisDoNome = (nome?: string | null) => {
  const partes = (nome || '')
    .trim()
    .split(/\s+/)
    .filter((parte) => parte && !CONECTIVOS.has(parte.toLowerCase()));
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

interface UserAvatarProps {
  nome?: string | null;
  className?: string;
}

/** Avatar do operador: círculo azul institucional com as iniciais do nome. */
export const UserAvatar: React.FC<UserAvatarProps> = ({ nome, className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'grid shrink-0 select-none place-items-center rounded-full bg-gradient-to-br from-[#1e8bff] to-[#0647c4] font-extrabold tracking-wide text-white',
      'ring-2 ring-[#d7e6f6] dark:ring-slate-700',
      className,
    )}
  >
    {iniciaisDoNome(nome)}
  </span>
);
