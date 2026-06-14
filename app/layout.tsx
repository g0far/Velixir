import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StarBackgroundClient from "@/components/main/StarBackgroundClient";
import Navbar from "@/components/main/Navbar";
import WalletModal from "@/components/borrow/WalletModal";
import Toaster from "@/components/borrow/Toaster";
import ProfileSync from "@/components/main/ProfileSync";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VELIXIR | Reputation Finance",
  description:
    "Verifiable Economic Layer for Identity & Reputation. Building the trust layer for the next generation of digital finance.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-[#030014] overflow-y-scroll overflow-x-hidden`}
      >
        <ProfileSync />
        <StarBackgroundClient />
        <Navbar />
        {children}
        <WalletModal />
        <Toaster />
      </body>
    </html>
  );
}
