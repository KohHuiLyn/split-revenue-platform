import React from 'react';
import type { AppProps } from 'next/app';
import { Epilogue, DM_Sans } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Navigation } from '@/components/Navigation';
import '../styles/globals.css';

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${dmSans.className} ${epilogue.variable}`}>
      <AuthProvider>
        <Navigation />
        <Component {...pageProps} />
      </AuthProvider>
    </div>
  );
}