import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'MatalAI — a little less artificial',description:'A playful AI drinking companion.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
