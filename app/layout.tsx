import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: '老年肺癌患者症状群智能评估与全病程管理系统',
  description: '苏州市立医院 · 老年肺癌症状群智能评估与全病程管理',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
