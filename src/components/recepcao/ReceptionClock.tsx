import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

type ClockData = {
  day: string;
  month: string;
  weekday: string;
  shortWeekday: string;
  time: string;
};

const timeZone = 'America/Sao_Paulo';

const getClockData = (date: Date): ClockData => {
  const dateParts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: 'short',
    weekday: 'long',
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((item) => item.type === type)?.value ?? '';
  const weekday = part('weekday').replace(/-feira$/i, '').toLocaleUpperCase('pt-BR');

  return {
    day: part('day'),
    month: part('month').replace('.', '').slice(0, 3).toLocaleUpperCase('pt-BR'),
    weekday,
    shortWeekday: weekday.slice(0, 3),
    time: new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  };
};

export const ReceptionClock = () => {
  const [clock, setClock] = useState(() => getClockData(new Date()));

  useEffect(() => {
    const updateClock = () => setClock(getClockData(new Date()));
    const delayToNextMinute = 60_000 - (Date.now() % 60_000);
    let minuteInterval: number | undefined;
    const initialTimeout = window.setTimeout(() => {
      updateClock();
      minuteInterval = window.setInterval(updateClock, 60_000);
    }, delayToNextMinute);

    return () => {
      window.clearTimeout(initialTimeout);
      if (minuteInterval) window.clearInterval(minuteInterval);
    };
  }, []);

  return (
    <section
      aria-label="Data e hora atuais de Brasília"
      className="flex h-[110px] w-full max-w-[352px] overflow-hidden rounded-[10px] border border-[#dce4f0] bg-white shadow-[0_10px_22px_-12px_rgba(18,44,82,.35)] dark:border-slate-700 dark:bg-[#121826]"
    >
      <div className="relative flex w-[45%] min-w-0 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#123b5b_0%,#071f36_100%)] px-[18px] text-white">
        <span aria-hidden="true" className="absolute left-2 top-1/2 grid h-[25px] w-[25px] -translate-y-1/2 place-items-center rounded-full bg-white/10 max-[359px]:hidden text-white/70">
          <ChevronLeft className="h-3.5 w-3.5" />
        </span>
        <div className="text-center leading-none">
          <div className="text-[42px] font-bold tracking-[-0.06em]">{clock.day}</div>
          <div className="mt-1 text-[17px] font-bold tracking-[0.03em]">{clock.month}</div>
          <div className="mt-2 whitespace-nowrap text-[9px] font-semibold tracking-[0.045em] text-white/70">
            <span className="hidden min-[400px]:inline">{clock.weekday}</span>
            <span className="min-[400px]:hidden">{clock.shortWeekday}</span>
          </div>
        </div>
        <span aria-hidden="true" className="absolute right-2 top-1/2 grid h-[25px] w-[25px] -translate-y-1/2 place-items-center rounded-full bg-white/10 max-[359px]:hidden text-white/70">
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 text-center text-[#102238] min-[400px]:px-4 dark:text-slate-100">
        <time className="text-[clamp(34px,11vw,46px)] font-medium leading-none tracking-[-0.055em]" dateTime={clock.time}>
          {clock.time}
        </time>
        <span className="mt-2 text-[10px] font-bold tracking-[0.03em] text-[#627289] dark:text-slate-400">HORÁRIO DE BRASÍLIA</span>
      </div>
    </section>
  );
};
