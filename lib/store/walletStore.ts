import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ConnectorType } from '../types/borrow';
import { toast } from './toastStore';
import { getProvider, connectWallet, connectMetaMaskSnap, getBalanceSol, requestDevnetAirdrop, shortAddress, clearActiveWallet, type WalletName } from '../wallet';

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

        // MetaMask signs Solana through the official Solana Snap. Selecting it
        // opens the MetaMask popup to install/approve the Snap — once approved,
        // MetaMask holds a REAL Solana account and signs real on-chain txs
        // (treasury swap/borrow settle for real, just like Phantom/Solflare).
        if (connector === 'MetaMask') {
          try {
            toast.info('Enable Solana on MetaMask', 'Approve the Solana Snap install/permission in the MetaMask popup…');
            const address = await connectMetaMaskSnap();
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
            getProvider('MetaMask')?.on?.('disconnect', () => get().disconnect());
            toast.success(
              'MetaMask connected (Solana Snap)',
              `${shortAddress(address)} • real Solana Devnet`
            );
            if (sol === 0) {
              toast.info('No Devnet SOL', 'Fund this MetaMask Solana account from a faucet to pay fees.');
            }
          } catch (err) {
            const e = err as { code?: number; message?: string };
            set({ connecting: false });
            toast.error(
              'MetaMask Snap connection failed',
              e?.message || 'Install MetaMask and approve the Solana Snap to continue.'
            );
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
        clearActiveWallet();
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
