import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'sme-theme';
const THEME_EVENT = 'sme-theme-change';
const THEME_COLORS: Record<Theme, string> = { dark: '#0f1422', light: '#ffffff' };

const readTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  // Cor da barra do navegador no celular acompanha o tema.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLORS[theme];
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
};

// Estado do tema compartilhado entre todos os controles da tela.
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => {
    const sync = () => setThemeState(readTheme());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  return {
    theme,
    setTheme: applyTheme,
    toggleTheme: () => applyTheme(readTheme() === 'dark' ? 'light' : 'dark'),
  };
};

interface ThemeToggleProps {
  size?: 'xs' | 'sm' | 'lg';
  className?: string;
}

const SIZES = {
  xs: { track: 'h-7 w-14', knob: 'h-5 w-5', shift: 'translate-x-7', knobIcon: 'h-3.5 w-3.5' },
  sm: { track: 'h-8 w-16', knob: 'h-6 w-6', shift: 'translate-x-8', knobIcon: 'h-4 w-4' },
  lg: { track: 'h-11 w-[84px]', knob: 'h-9 w-9', shift: 'translate-x-10', knobIcon: 'h-5 w-5' },
};

// Ondas concêntricas que saem do botão (centro em 25% = esquerda, 75% = direita).
const ondas = (x: string, cor: string) =>
  `radial-gradient(circle at ${x} 50%, transparent 0 46%, ${cor} 46% 58%, transparent 58% 70%, ${cor} 70% 82%, transparent 82%)`;

// Interruptor claro/escuro: dia = trilho azul com sol amarelo à esquerda; noite = trilho azul-marinho com lua à direita.
export const ThemeToggle = ({ size = 'sm', className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const s = SIZES[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Modo escuro"
      title={isDark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      onClick={toggleTheme}
      className={cn(
        'group relative inline-flex shrink-0 items-center overflow-hidden rounded-full p-1',
        'motion-safe:transition-[background,box-shadow] motion-safe:duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#087ef5] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0f1422]',
        isDark
          ? 'bg-[linear-gradient(90deg,#1c2338_0%,#2e3a57_100%)] shadow-[inset_0_2px_5px_rgba(0,0,0,.5),0_2px_8px_-2px_rgba(15,23,42,.5)]'
          : 'bg-[linear-gradient(90deg,#1f7be6_0%,#5bb4ff_100%)] shadow-[inset_0_2px_5px_rgba(9,58,128,.45),0_2px_8px_-2px_rgba(31,123,230,.55)]',
        s.track,
        className,
      )}
    >
      {/* Ondas concêntricas em volta do botão */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full motion-safe:transition-[background] motion-safe:duration-300"
        style={{ backgroundImage: isDark ? ondas('75%', 'rgba(255,255,255,.05)') : ondas('25%', 'rgba(255,255,255,.12)') }}
      />

      {/* Botão deslizante: sol amarelo (dia) ou lua clara (noite) */}
      <span
        aria-hidden="true"
        className={cn(
          'relative grid place-items-center rounded-full',
          'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(.34,1.56,.64,1)]',
          isDark
            ? cn(s.shift, 'bg-[radial-gradient(circle_at_35%_30%,#f4f6fc_0%,#cfd5ea_75%)] shadow-[0_2px_6px_rgba(0,0,0,.45)]')
            : 'translate-x-0 bg-[radial-gradient(circle_at_35%_30%,#ffe45c_0%,#f6b400_75%)] shadow-[0_2px_6px_rgba(120,70,0,.4)]',
          s.knob,
        )}
      >
        {isDark
          ? <Moon className={cn(s.knobIcon, 'fill-[#e8ebf6] text-[#8f9bc4]')} />
          : <Sun className={cn(s.knobIcon, 'fill-[#ffd23f] text-[#e89a00]')} />}
      </span>
    </button>
  );
};
