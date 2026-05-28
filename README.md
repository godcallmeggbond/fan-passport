# Fan Passport

<p align="center">
  <img src="./assets/fan-passport-avatar.svg" alt="Fan Passport logo" width="128" />
</p>

Fan Passport is a lightweight World Cup fan ID on X Layer. It gives each wallet one non-transferable supporter passport, records the team they choose, and lets them collect match-day stamps, quest marks, XP, and badges.

The project is intentionally simple: no betting pool, no deposits, no odds, no reward token. It is a public participation record that can be used as a small on-chain fan profile during the X Cup campaign.

## Live Build

- App: <https://fan-passport.vercel.app>
- X Layer contract: `0xE68c85462e444A84d6Ce0842f4c79740680951e3`
- Explorer: <https://www.okx.com/web3/explorer/xlayer/address/0xE68c85462e444A84d6Ce0842f4c79740680951e3>
- Deployment transaction: `0xdf52d837528fbce25f6fbe4d76a398fbe70538676c46c57609ee07690edd788c`

## Product Flow

1. Connect an OKX Wallet or MetaMask wallet.
2. Switch to X Layer mainnet.
3. Pick a national side before issuing the passport.
4. Mint one passport for the connected wallet.
5. Return on match days to stamp the passport.
6. Complete small fan quests to add marks and increase XP.

The passport is soulbound in practice: transfer and approval functions revert, so the credential stays attached to the wallet that created it.

## Contract Behavior

- `mintPassport(teamId)` creates one passport per wallet.
- `checkIn()` adds a daily visit stamp after the cooldown.
- `completeQuest(questType)` records one-time quest stamps.
- `getPassport(fan)` returns the profile fields shown by the web app.
- `grantXp(fan, amount)` lets the contract owner add manual XP for campaign operations.

The frontend reads `deployment.json` on load, so the live site starts with the deployed X Layer mainnet contract without requiring users to paste an address.

## Local Run

```bash
npm install
npm run check:js
npm run serve
```

Open the printed local URL and connect a wallet. If the deployed contract cannot be loaded, the app still has a local preview mode for UI testing.

## Deploy Again

Create a local `.env` from the example file and use a temporary deployer wallet:

```bash
cp .env.example .env
npm run deploy
```

The deploy script compiles `contracts/XCupFanPassport.sol`, sends it to X Layer, and rewrites `deployment.json` with the new contract address and transaction hash.

## X Layer Mainnet

- Chain ID: `196`
- RPC: `https://rpc.xlayer.tech`
- Explorer: `https://www.okx.com/web3/explorer/xlayer`

## Repository Layout

- `index.html` - single-page passport desk interface
- `styles.css` - paper passport visual system
- `app.js` - wallet connection, network switching, contract calls, and local preview state
- `contracts/XCupFanPassport.sol` - standalone Solidity contract
- `scripts/deploy.mjs` - compile and deploy helper
- `deployment.json` - current X Layer mainnet deployment metadata
