// Create a new Raydium CPMM pool on Solana Devnet.
// Usage: node scripts/create-raydium-pool.mjs <mintA> <amountA_ui> <decA> <mintB> <amountB_ui> <decB>
// Example (USDC-new / RLO): node scripts/create-raydium-pool.mjs \
//   9tW7QNDWTV2G2HEK4TZJpwEep1CFMfew2R4fUTzMKoZV 4840 6 \
//   375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6 5000 9
import { Connection, Keypair } from "@solana/web3.js";
import {
  Raydium, TxVersion, DEVNET_PROGRAM_ID, getCpmmPdaAmmConfigId,
} from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import { readFileSync } from "fs";
import os from "os";
import path from "path";

function loadKeypair() {
  const p = process.env.ANCHOR_WALLET || path.join(os.homedir(), ".config", "solana", "id.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));
}

const [, , mintAStr, amtAStr, decAStr, mintBStr, amtBStr, decBStr] = process.argv;
if (!mintAStr || !mintBStr) {
  console.error("Usage: node scripts/create-raydium-pool.mjs <mintA> <amtA> <decA> <mintB> <amtB> <decB>");
  process.exit(1);
}
const decA = Number(decAStr), decB = Number(decBStr);
const amtA = new BN(String(Math.round(Number(amtAStr) * 10 ** decA)));
const amtB = new BN(String(Math.round(Number(amtBStr) * 10 ** decB)));

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const owner = loadKeypair();

const raydium = await Raydium.load({
  connection: conn,
  owner,
  cluster: "devnet",
  disableFeatureCheck: true,
  disableLoadToken: true,
  blockhashCommitment: "confirmed",
});

// Resolve token info (mint, decimals, programId) for both sides.
const mintAInfo = await raydium.token.getTokenInfo(mintAStr);
const mintBInfo = await raydium.token.getTokenInfo(mintBStr);

// Devnet CPMM fee config (index 0), with the id overridden to the devnet PDA.
const feeConfigs = await raydium.api.getCpmmConfigs();
feeConfigs.forEach((c) => {
  c.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, c.index).publicKey.toBase58();
});

console.log("Creating CPMM pool on devnet…");
console.log("  mintA:", mintAStr, "amount:", amtAStr, "(dec", decA + ")");
console.log("  mintB:", mintBStr, "amount:", amtBStr, "(dec", decB + ")");

const { execute, extInfo } = await raydium.cpmm.createPool({
  programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
  poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
  mintA: mintAInfo,
  mintB: mintBInfo,
  mintAAmount: amtA,
  mintBAmount: amtB,
  startTime: new BN(0),
  feeConfig: feeConfigs[0],
  associatedOnly: false,
  ownerInfo: { useSOLBalance: true },
  txVersion: TxVersion.V0,
});

const { txId } = await execute({ sendAndConfirm: true });
console.log("\n✓ Pool created. tx:", txId);
const keys = extInfo.address;
console.log("poolId   :", keys.poolId.toString());
console.log("vaultA   :", keys.vaultA.toString());
console.log("vaultB   :", keys.vaultB.toString());
console.log("lpMint   :", keys.lpMint.toString());
console.log("configId :", keys.configId.toString());
console.log("\nJSON:", JSON.stringify({
  poolId: keys.poolId.toString(),
  programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM.toString(),
  vaultA: keys.vaultA.toString(),
  vaultB: keys.vaultB.toString(),
  mintA: mintAStr, mintB: mintBStr,
  lpMint: keys.lpMint.toString(),
}, null, 2));
