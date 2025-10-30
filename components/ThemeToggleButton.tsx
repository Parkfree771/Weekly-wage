'use client';

import { useTheme } from './ThemeProvider';
import styles from './ThemeToggleButton.module.css';
import Image from 'next/image';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={styles.toggleButton}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Image
        src={theme === 'light' ? '/icon-moon.svg' : '/icon-sun.svg'}
        alt={theme === 'light' ? 'Dark mode' : 'Light mode'}
        width={20}
        height={20}
        className={styles.icon}
      />
    </button>
  );
}
