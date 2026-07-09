'use client';

import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app-download-config';
import { AppleStoreBadge, GooglePlayBadge } from './StoreBadges';
import styles from './AppSidebarPromo.module.css';

export default function AppSidebarPromo() {
  return (
    <div className={styles.card}>
      <Link href="/app" className={styles.header}>
        <span className={styles.iconWrap}>
          <Image src="/icon.png" alt="" width={30} height={30} />
        </span>
        <span className={styles.brand}>로아로골</span>
        <span className={styles.title}>앱 출시</span>
      </Link>
      <div className={styles.badges}>
        <AppleStoreBadge href={APP_STORE_URL} compact />
        <GooglePlayBadge href={PLAY_STORE_URL} compact />
      </div>
    </div>
  );
}
