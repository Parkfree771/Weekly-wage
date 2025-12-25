'use client';

import { useTheme } from './ThemeProvider';
import styles from '@/app/page.module.css';

export default function ContactForm() {
  const { theme } = useTheme();

  return (
    <iframe
      src="https://tally.so/embed/RGdjgd?alignLeft=1&hideTitle=1&transparentBackground=1"
      className={styles.contactIframe}
      title="문의하기"
      style={{
        filter: theme === 'dark' ? 'invert(0.88) hue-rotate(180deg)' : 'none',
      }}
    />
  );
}
