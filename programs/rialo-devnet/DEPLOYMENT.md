# Rialo-Devnet — Deployment

Anchor lending program on **Solana Devnet**.

- **Program ID:** `5PB3w7dzxaRvc6pYJyhPTzuiwro5F8f4LMLW1dkAK7cU`
- **Deploy tx:** `3aMWSoYD6ym8tTTW5WRdG1f6kmagDywhCwu8xhpZMHB1JbV1WZXBgugYiA1tqTwSjrFSSdG6tF7Z8btQ3M5WYpwE`
- **Upgrade authority:** `HfdmaZx5tkA8jH6gby8G2YcpUQTh2DVCdg213z7KV8sv` (`~/.config/solana/id.json`)
- Saved to `.env.local` as `NEXT_PUBLIC_PROGRAM_ID`.

## Instructions
`initialize_pool`, `deposit`, `borrow`, `repay`, `withdraw`
(borrow capped at pool LTV; withdraw keeps debt within LTV).

## Pools (initialized on-chain)
| Asset | Mint | LTV | Liq. threshold | Pool PDA | Vault PDA |
|-------|------|-----|----------------|----------|-----------|
| SOL (wSOL) | So11111111111111111111111111111111111111112 | 80% | 85% | HWiMRAEmZD7jGdLD75guZETinvpMo9vGetKah31pKhd8 | HGskj3pbMGeYeFBKCNrABVGYx6d37XoThFnQiCrQYKzp |
| USDC | 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | 90% | 95% | HniAAqGy1D9vVbdeKP8kFpzJ29XE3sru5BvdDCSRAZAY | J2BGGUFaUF1EUyLhXHhs3jUrA3SFtLgQ5HYqBJN4YrNo |
| USDT | 8AfaGuuwj2fKpNYmn7FZFYqc6Dx4KwrWH9FjRwiBKZod | 90% | 95% | 2dXrMsTzmfZUVd6KZbjk5tzb7LgpwBdQXF1PZqdQPZ9G | 85waKZYLnDBjcVt7ihm3DRpUSfsBM9XQ9WQDpn9DLpcK |
| RLO  | 375pbiYRJYS22XuHqAD6KSWQroVnF41ayoLvKtPp4Du6 | 75% | 80% | 4z4QUqYFKK3bQpZpiT126EuDpnvs88GVTv55Cu5Y89zQ | 3nPP9cS921Znddf9gy4SgxVEkiTczoWWjAs22o3tW1ev |

PDAs: `pool = ["pool", mint]`, `vault = ["vault", mint]`, `position = ["position", pool, user]`.

## Rebuild & redeploy
This machine has no MSVC C++ toolchain, so the build uses the Solana
platform-tools `lld-link` + MSVC import libs fetched by `xwin` (no admin needed):

```bash
export PATH="$HOME/.cargo/bin:$HOME/.cache/solana/v1.53/platform-tools/llvm/bin:/c/Users/User/mingw64/bin:$PATH"
export LIB="C:/Users/User/.xwin/crt/lib/x86_64;C:/Users/User/.xwin/sdk/lib/um/x86_64;C:/Users/User/.xwin/sdk/lib/ucrt/x86_64"
export MSYS_NO_PATHCONV=1
cd programs/rialo-devnet && cargo-build-sbf          # -> ../../target/deploy/rialo_devnet.so
solana program deploy ../../target/deploy/rialo_devnet.so \
  --program-id ../../target/deploy/rialo_devnet-keypair.json --url devnet
node ../../scripts/init-pools.mjs                    # initialize pools (idempotent)
```

`.cargo/config.toml` points the host msvc linker at `lld-link.exe`.

## Frontend
`lib/rialoProgram.ts` builds real `deposit/borrow/repay/withdraw` instructions.
`app/borrow/page.tsx` → `submitOnChain` calls the program (falling back to a
memo tx when a token account / liquidity / position isn't present), so the
existing borrow UX is unchanged.
