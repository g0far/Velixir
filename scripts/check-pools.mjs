import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU");
const conn = new Connection("https://api.devnet.solana.com", "confirmed");

const POOLS = {
  SOL:  "So11111111111111111111111111111111111111112",
  USDC: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  USDT: "8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod",
  RLO:  "375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6",
};

for (const [sym, mintStr] of Object.entries(POOLS)) {
  const mint = new PublicKey(mintStr);
  const [pool] = PublicKey.findProgramAddressSync([Buffer.from("pool"), mint.toBuffer()], PROGRAM_ID);
  const info = await conn.getAccountInfo(pool);
  if (!info) { console.log(`${sym}: NOT INITIALIZED (${pool.toBase58()})`); continue; }
  const d = info.data;
  // skip 8 disc + 32 authority + 32 mint + 32 vault + 1 is_native => ltv u16, thr u16
  const off = 8 + 32 + 32 + 32 + 1;
  const ltv = d.readUInt16LE(off);
  const thr = d.readUInt16LE(off + 2);
  console.log(`${sym}: OK pool=${pool.toBase58()} ltv=${ltv}bps thr=${thr}bps len=${d.length}`);
}
