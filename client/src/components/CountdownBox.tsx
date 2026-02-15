import React from 'react';
import '../pages/Home.css';

interface CountdownBoxProps {
  text: string;
  number: number;
}

const CountdownBox: React.FC<CountdownBoxProps> = ({ text, number }) => {
  return (
    <div className="countdown-box">
      <div className="countdown-value">{number}</div>
      <div className="countdown-label">{text}</div>
    </div>
  );
};

export default CountdownBox;
