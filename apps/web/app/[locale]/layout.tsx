import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import { Providers } from "@/lib/providers/Providers";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from "@/i18n/routing";

const geistSans = localFont({
    src: "../fonts/GeistVF.woff",
    variable: "--font-geist-sans",
});
const geistMono = localFont({
    src: "../fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
});

export const metadata: Metadata = {
    title: "Movie Recommendr - AI-Powered Movie Recommendations",
    description: "Discover your next favorite movie with AI-powered personalized recommendations",
};

export default async function RootLayout({
    children,
    params: { locale },
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    // Validate that the incoming `locale` parameter is valid
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Set the request locale context
    await setRequestLocale(locale);

    // Providing all messages to the client
    const messages = await getMessages();

    return (
        <html lang={locale}>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>
                {children}
            </Providers>
        </NextIntlClientProvider>
        </body>
        </html>
    );
}