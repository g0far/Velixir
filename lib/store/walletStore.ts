import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ConnectorType } from '../types/borrow';
import { toast } from './toastStore';
import { getProvider, connectWallet, getBalanceSol, requestDevnetAirdrop, shortAddress, type WalletName } from '../wallet';
import { SOLANA_DEVNET_CONFIG } from '../solana';

// Solana has no numeric chainId like EVM. We keep a sentinel so the existing
// "wrong network" checks across the UI continue to type-check; the dApp always
// transacts against Devnet through its own RPC, so a connected wallet is always
// considered on-network.
export const SOLANA_DEVNET_CHAIN_ID = 103;
// Back-compat alias for components still importing the old name.
export const BASE_SEPOLIA_CHAIN_ID = SOLANA_DEVNET_CHAIN_ID;

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Plausible-looking base58 devnet address for the simulated session.
function randomSolanaAddress(): string {
  let out = '';
  for (let i = 0; i < 44; i++) out += BASE58[Math.floor(Math.random() * BASE58.length)];
  return out;
}

interface WalletState {
  connected: boolean;
  connecting: boolean;
  address: string;
  chainId: number | null;
  balance: string; // SOL, formatted
  connector: ConnectorType | null;
  isSimulated: boolean;
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  connect: (connector: ConnectorType) => Promise<void>;
  disconnect: () => void;
  switchToBaseSepolia: () => Promise<void>; // name kept for call-site compatibility (confirms Devnet)
  refreshBalance: () => Promise<void>;
  airdrop: () => Promise<void>;
  isWrongNetwork: () => boolean;
  displayAddress: () => string;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Start in a simulated-connected Devnet session so the borrow flow is
      // usable out of the box. Connecting Phantom flips isSimulated → false and
      // unlocks real on-chain transactions.
      connected: true,
      connecting: false,
      address: randomSolanaAddress(),
      chainId: SOLANA_DEVNET_CHAIN_ID,
      balance: '0.0000',
      connector: null,
      isSimulated: true,
      modalOpen: false,

      setModalOpen: (v) => set({ modalOpen: v }),

      isWrongNetwork: () => {
        const { connected, chainId } = get();
        return connected && chainId !== null && chainId !== SOLANA_DEVNET_CHAIN_ID;
      },

      displayAddress: () => shortAddress(get().address),

      connect: async (connector) => {
        set({ connecting: true, modalOpen: false });

        // MetaMask connects to the user's REAL EVM account (no dummy address).
        // It can't sign Solana natively, so the on-chain flows stay simulated,
        // but the connected identity is the genuine MetaMask address.
        if (connector === 'MetaMask') {
          const eth = (typeof window !== 'undefined'
            ? (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (e: string, cb: (...a: unknown[]) => void) => void; isMetaMask?: boolean } }).ethereum
            : undefined);
          if (!eth) {
            set({ connecting: false });
            toast.error(
              'MetaMask not found',
              'Install the MetaMask extension to connect your account.'
            );
            return;
          }
          try {
            const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
            const addr = accounts?.[0];
            if (!addr) throw new Error('No MetaMask account authorized.');

            // Immediately prompt MetaMask to add the Solana Devnet RPC network.
            // (Solana isn't an EVM chain, so MetaMask may not finalize the add —
            // we surface the prompt as the concept asks and keep the session alive.)
            try {
              await eth.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x67', // 103 — matches SOLANA_DEVNET_CHAIN_ID sentinel
                    chainName: 'Solana Devnet',
                    rpcUrls: [SOLANA_DEVNET_CONFIG.rpcUrl],
                    nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 18 },
                    blockExplorerUrls: ['https://explorer.solana.com/?cluster=devnet'],
                  },
                ],
              });

              // Switch the active network so the MetaMask extension home lands
              // directly on Solana Devnet after connecting.
              try {
                await eth.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x67' }],
                });
              } catch {
                /* best effort — newer MetaMask auto-switches after adding */
              }
              toast.success('Solana Devnet added', 'MetaMask switched to the Solana Devnet network.');
            } catch (addErr) {
              const ae = addErr as { code?: number; message?: string };
              if (ae?.code === 4001) {
                toast.info('Network add dismissed', 'You can add Solana Devnet later from MetaMask.');
              } else {
                toast.info(
                  'Solana Devnet RPC prompted',
                  'MetaMask is an EVM wallet — the session runs on simulated Devnet.'
                );
              }
            }

            set({
              connected: true,
              connecting: false,
              address: addr,
              chainId: SOLANA_DEVNET_CHAIN_ID,
              balance: '1000.0000',
              connector,
              isSimulated: true,
            });
            eth.on?.('accountsChanged', (...args: unknown[]) => {
              const accs = args[0] as string[] | undefined;
              if (!accs || accs.length === 0) get().disconnect();
              else set({ address: accs[0] });
            });
            toast.success(
              'MetaMask connected',
              `${shortAddress(addr)} • simulated Solana Devnet session (1000 SOL).`
            );
          } catch (err) {
            const e = err as { message?: string };
            set({ connecting: false });
            toast.error('Connection failed', e?.message || 'Request rejected in MetaMask.');
          }
          return;
        }

        // EVM-origin wallets aren't native to Solana, so they connect as funded
        // dummy Devnet sessions (1000 SOL) for demoing the flows.
        const DUMMY_CONNECTORS: ConnectorType[] = ['WalletConnect'];
        if (DUMMY_CONNECTORS.includes(connector)) {
          await new Promise((r) => setTimeout(r, 700));
          set({
            connected: true,
            connecting: false,
            address: randomSolanaAddress(),
            chainId: SOLANA_DEVNET_CHAIN_ID,
            balance: '1000.0000',
            connector,
            isSimulated: true,
          });
          toast.success(
            'Wallet connected (dummy)',
            `${connector} • simulated Solana Devnet session funded with 1000 SOL.`
          );
          return;
        }

        const preferred = connector as WalletName; // here connector ∈ {Phantom, Solflare}
        const provider = getProvider(preferred);

        // No Phantom/Solflare available (e.g. extension not installed / inside an
        // iframe): fall back to a simulated Devnet session so the demo still works.
        if (!provider) {
          await new Promise((r) => setTimeout(r, 700));
          set({
            connected: true,
            connecting: false,
            address: randomSolanaAddress(),
            chainId: SOLANA_DEVNET_CHAIN_ID,
            balance: (Math.random() * 3 + 0.5).toFixed(4),
            connector,
            isSimulated: true,
          });
          toast.warning(
            'Wallet connected (simulated)',
            `${connector} not detected — using a simulated Solana Devnet session. Install ${connector} for real on-chain transactions.`
          );
          return;
        }

        try {
          const address = await connectWallet(preferred);
          const sol = await getBalanceSol(address);

          set({
            connected: true,
            connecting: false,
            address,
            chainId: SOLANA_DEVNET_CHAIN_ID,
            balance: sol.toFixed(4),
            connector,
            isSimulated: false,
          });

          // Keep state in sync with Phantom.
          provider.removeAllListeners?.('accountChanged');
          provider.on?.('accountChanged', (pk: unknown) => {
            const key = (pk as { toString(): string } | null)?.toString();
            if (!key) get().disconnect();
            else {
              set({ address: key });
              get().refreshBalance();
            }
          });
          provider.on?.('disconnect', () => get().disconnect());

          toast.success('Wallet connected', `${connector} • ${shortAddress(address)}`);
          if (sol === 0) {
            toast.info('No Devnet SOL', 'Use the Airdrop button (or a Solana faucet) to fund fees.');
          }
        } catch (err) {
          const e = err as { code?: number; message?: string };
          set({ connecting: false });
          toast.error('Connection failed', e?.message || 'Request rejected in wallet.');
        }
      },

      // Solana clusters aren't switchable programmatically the way EVM chains
      // are; the dApp pins Devnet via its RPC. This simply confirms Devnet.
      switchToBaseSepolia: async () => {
        set({ chainId: SOLANA_DEVNET_CHAIN_ID });
        toast.success('Solana Devnet', 'Velixir is connected to Solana Devnet.');
      },

      refreshBalance: async () => {
        const { address, isSimulated, connected } = get();
        if (!connected || isSimulated || !address) return;
        const sol = await getBalanceSol(address);
        set({ balance: sol.toFixed(4) });
      },

      airdrop: async () => {
        const { address, isSimulated, connected } = get();
        if (!connected || !address) {
          toast.error('Not connected', 'Connect Phantom first.');
          return;
        }
        if (isSimulated) {
          set({ balance: (parseFloat(get().balance) + 1).toFixed(4) });
          toast.success('Airdrop (simulated)', '+1 SOL added to your simulated session.');
          return;
        }
        toast.info('Requesting Devnet airdrop', 'Asking the faucet for 1 SOL…');
        const sig = await requestDevnetAirdrop(address, 1);
        if (sig) {
          await get().refreshBalance();
          toast.success('Airdrop received', '+1 Devnet SOL. You can now pay transaction fees.');
        } else {
          toast.error('Airdrop failed', 'Devnet faucet is rate-limited. Try https://faucet.solana.com');
        }
      },

      disconnect: () => {
        try {
          getProvider()?.disconnect();
        } catch {
          /* best effort */
        }
        set({
          connected: false,
          address: '',
          chainId: null,
          balance: '0.0000',
          connector: null,
          isSimulated: false,
        });
        toast.info('Wallet disconnected');
      },
    }),
    {
      name: 'velixir-wallet-sol-v1',
      // Persist only lightweight session info for UX continuity.
      partialize: (s) => ({
        connected: s.connected,
        address: s.address,
        chainId: s.chainId,
        balance: s.balance,
        connector: s.connector,
        isSimulated: s.isSimulated,
      }),
    }
  )
);
