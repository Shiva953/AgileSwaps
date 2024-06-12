"use client"

import React, {useMemo} from "react"
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { LedgerWalletAdapter, PhantomWalletAdapter, UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import Swap from "@/components/SwapInterface";
require('@solana/wallet-adapter-react-ui/styles.css');

export default function Home() {
  const network = WalletAdapterNetwork.Mainnet;
    // You can also provide a custom RPC endpoint.
    // const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY! || '';
    const endpoint = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    const wallets = useMemo(
        () => [
            new UnsafeBurnerWalletAdapter(),new PhantomWalletAdapter(),new LedgerWalletAdapter()
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton />
            <main className="flex flex-col items-center justify-between">
              <div>
              <Swap/>
              </div>
            </main>
          </WalletModalProvider>
        </WalletProvider>
        </ConnectionProvider>
  );
}
