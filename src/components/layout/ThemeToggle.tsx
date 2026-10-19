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
  xs: { track: 'h-7 w-14', knob: 'h-5 w-5', shift: 'translate-x-7', icon: 'h-3 w-3', knobIcon: 'h-3.5 w-3.5' },
  sm: { track: 'h-8 w-16', knob: 'h-6 w-6', shift: 'translate-x-8', icon: 'h-3.5 w-3.5', knobIcon: 'h-4 w-4' },
  lg: { track: 'h-11 w-[84px]', knob: 'h-9 w-9', shift: 'translate-x-10', icon: 'h-4 w-4', knobIcon: 'h-5 w-5' },
};

// Interruptor claro/escuro: o botão desliza para o lado do tema ativo (sol = claro, lua = escuro).
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
        'group relative inline-flex shrink-0 items-center rounded-full border bg-[linear-gradient(180deg,#1a2133_0%,#0b0f19_100%)] p-1',
        'shadow-[inset_0_2px_6px_rgba(0,0,0,.55)] motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#087ef5] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0f1422]',
        isDark
          ? 'border-[#1d4ed8]/70 shadow-[inset_0_2px_6px_rgba(0,0,0,.55),0_0_14px_-2px_rgba(59,130,246,.55)]'
          : 'border-[#f59e0b]/70 shadow-[inset_0_2px_6px_rgba(0,0,0,.55),0_0_14px_-2px_rgba(245,158,11,.55)]',
        s.track,
        className,
      )}
    >
      {/* Ícones do trilho (lado inativo) */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
        <Sun className={cn(s.icon, 'text-[#fbbf24] motion-safe:transition-opacity', isDark ? 'opacity-70' : 'opacity-0')} />
        <Moon className={cn(s.icon, 'text-[#93c5fd] motion-safe:transition-opacity', isDark ? 'opacity-0' : 'opacity-70')} />
      </span>

      {/* Botão deslizante com o ícone do tema ativo */}
      <span
        aria-hidden="true"
        className={cn(
          'relative grid place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#2c3854_0%,#0d1324_70%)] ring-2',
          'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(.34,1.56,.64,1)]',
          isDark
            ? cn(s.shift, 'ring-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,.75)]')
            : 'translate-x-0 ring-[#f59e0b] shadow-[0_0_12px_rgba(245,158,11,.75)]',
          s.knob,
        )}
      >
        {isDark
          ? <Moon className={cn(s.knobIcon, 'fill-[#dbeafe] text-[#dbeafe] drop-shadow-[0_0_4px_rgba(147,197,253,.9)]')} />
          : <Sun className={cn(s.knobIcon, 'text-[#fbbf24] drop-shadow-[0_0_4px_rgba(251,191,36,.9)]')} />}
      </span>
    </button>
  );
};
