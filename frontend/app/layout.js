import './globals.css';

export const metadata = { title: 'SWARF Public', description: 'Approved SWARF projects and resources' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
