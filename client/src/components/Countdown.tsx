import React, { useState, useEffect } from 'react';
import CountdownBox from './CountdownBox';
import '../pages/Home.css';

interface CountdownProps {
  endDate: Date;
}

const Countdown: React.FC<CountdownProps> = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="countdown-boxes">
      <CountdownBox text="Dias" number={timeLeft.days} />
      <CountdownBox text="Horas" number={timeLeft.hours} />
      <CountdownBox text="Minutos" number={timeLeft.minutes} />
      <CountdownBox text="Segundos" number={timeLeft.seconds} />
    </div>
  );
};

export default Countdown;
