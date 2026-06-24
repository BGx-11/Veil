import React, { useEffect, useState } from 'react';

export default function ClockWidget() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }));
      const hour = now.getHours();
      setGreeting(hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <h1 className="text-7xl font-light tracking-tight text-[var(--text-primary)]">
        {time}
      </h1>
      <p className="text-sm font-medium text-[var(--text-secondary)] tracking-wide uppercase">
        {greeting} · {date}
      </p>
    </div>
  );
}
