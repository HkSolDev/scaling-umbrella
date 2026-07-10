# TxLINE Prediction Market — Anchor Program

Local development and testing use [Surfpool](https://docs.surfpool.run/) instead of `solana-test-validator` for faster startup and hot-reload.

## Prerequisites

- [Anchor](https://www.anchor-lang.com/) CLI
- [Surfpool](https://docs.surfpool.run/) (`curl -sL https://run.surfpool.run/ | bash`)
- Solana wallet at `~/.config/solana/id.json` (default Anchor provider)

## Surfpool dev workflow (two terminals)

### Terminal 1 — start Surfnet (leave running)

```bash
cd anchor
anchor build
surfpool start --legacy-anchor-compatibility --offline --no-tui --watch
```

| Flag | Purpose |
|------|---------|
| `--legacy-anchor-compatibility` | Settings for Anchor 0.31 test suites |
| `--offline` | No mainnet fetch — fastest for local vault tests |
| `--no-tui` | Logs in the terminal instead of the dashboard |
| `--watch` | Redeploy when `target/deploy/*.so` changes |

RPC listens on `http://127.0.0.1:8899`.

Do **not** pass `--no-deploy` unless you plan to deploy manually with `anchor deploy`.

### Devnet fork (real USDC + devnet accounts)

Use this when markets or tests need **devnet USDC** or other devnet state (lazy-cloned on first access):

```bash
cd anchor
anchor build
surfpool start --network devnet --legacy-anchor-compatibility --no-tui --watch
```

| Mode | Command | USDC mint available? |
|------|---------|-------------------|
| Offline local | `--offline` | No — use program `collateral_mint` PDA in tests |
| Devnet fork | `--network devnet` | Yes — `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Custom RPC | `--rpc-url https://your-devnet-rpc.com` | Yes — better rate limits |

Devnet fork still runs locally on `:8899`; your program deploys to Surfnet, while existing devnet accounts (USDC, Token program, etc.) are fetched when needed.

**Client / test — pass USDC as `predictionMint`:**

```typescript
import { PublicKey } from "@solana/web3.js";

export const USDC_DEVNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

await program.methods.createMarket(/* ... */)
  .accounts({
    predictionMint: USDC_DEVNET,
    // ...
  })
  .rpc();
```

For **offline** Surfpool, use your vault collateral mint instead — do not comment out mint checks; pass a different pubkey per environment.

### Terminal 2 — run tests

```bash
cd anchor
anchor test --skip-local-validator --skip-build
```

| Flag | Purpose |
|------|---------|
| `--skip-local-validator` | Use Surfpool on `:8899` instead of starting `solana-test-validator` |
| `--skip-build` | Skip Rust compile when `.so` is already built (omit after program changes) |

After changing Rust or `declare_id!`:

```bash
anchor build
# wait for --watch redeploy, or restart surfpool
anchor test --skip-local-validator
```

### Run a single test file

```bash
anchor test --skip-local-validator --skip-build --run tests/initialize.ts
```

## Verify Surfpool is running

```bash
curl http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

Expected: JSON with `"surfnet-version"`.

## Restart Surfpool (clean ledger)

Surfpool keeps account state between test runs. `initialize_vault` uses `init` and **fails** if the vault PDA already exists (`account already in use`).

```bash
kill $(lsof -t -i :8899)
surfpool start --legacy-anchor-compatibility --offline --no-tui --watch
```

Restart when:

- Re-testing `initialize_vault` on a fresh chain
- Vault seeds or program ID changed
- Stale deploy / `DeclaredProgramIdMismatch` (4100)

For day-to-day work: init once, then run deposit and other tests without restarting.

## CI-style one-liner

```bash
cd anchor
anchor build
surfpool start --legacy-anchor-compatibility --offline --ci &
sleep 2
anchor test --skip-local-validator --skip-build
```

## Test layout

```
tests/
  initialize.ts      # instruction tests (matched by Anchor.toml glob)
  helpers/             # shared setup — not run as test files
    provider.ts
    pdas.ts
    airdrop.ts
    vault.ts
```

`Anchor.toml` runs only top-level tests:

```toml
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/*.ts"
```

Put new instruction tests in `tests/` (e.g. `tests/deposit-lp.ts`). Keep helpers under `tests/helpers/`.

## Manual deploy (optional)

If Surfpool was started with `--no-deploy`:

```bash
anchor deploy --provider.cluster localnet
# or
surfpool run deployment
```

## Default `anchor test` (without Surfpool)

Starts `solana-test-validator`, deploys, runs tests, then stops the validator (slower):

```bash
anchor test
```