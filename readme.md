## Tensor Orderbook

Make TensorSwap orderbook from onchain data (without Tensor API key) with NodeJS.

<div align="center">
  <img width="200px" src="./chart.gif" alt="chart">
</div>
<br />

> [!WARNING]
> The project is at the initial stage of development. The API is unstable and may be inaccurate.
> This is an unofficial Tensor project.

You can use this repository as an example of implementing your Tensor-based projects.

You will need to Solana RPC with Metaplex DAS support (optional), e.g Helius (a free plan is fine).

**Roadmap**:
 - [x] Fetch collection bids, listings and floor price
 - [x] Collection orderbook init from scratch (up to ~1min)
 - [x] Processing of NFTs purchases and sales based on onchain data
 - [ ] Ensure MM orders (pools)
 - [ ] Release as NPM package *
 - [ ] Event-based orderbook updates (significant speedup and reducing rpc requests) *
 - [ ] Floor price, sweeps and sells alerts Telegram bot as real-world example *


\* Currently we're waiting for Tensor programs and SDKs updates.

### How it works

1. Fetch and process pools for collection (approximately 5-10 seconds)
2. Filter for active pools/bids (at least one NFT can be bought)
3. Fetch all TensorSwap `Single Listing` PDAs, retrieve all NFT mints via the Metaplex DAS API, locate their listings, and filter them (approximately 1 minute; optional)
4. Create the orderbook

To keep the orderbook up to date, re-request its creation periodically. Micro-updates based on incoming events are coming soon.


