import { BN } from "@coral-xyz/anchor";
import { getLamportsSolBalances, getWhitelistByUuid, shiftPriceByDelta, shiftPriceByDeltaArr } from "./utils";
import {
  castPoolConfigAnchor,
  computeMakerAmountCount,
  CurveType,
  HUNDRED_PCT_BPS,
  PoolAnchor,
  PoolConfigAnchor,
  PoolStatsAnchor,
  PoolType,
  PoolTypeAnchor,
  TakerSide,
  TensorSwapSDK,
} from "@tensor-oss/tensorswap-sdk";
import Big from "big.js";
import { TSWAP_PROGRAM_ID } from "@tensor-hq/tensor-common";
import { AccountInfo, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export type PoolBid = {
  pubkey: PublicKey;
  owner: PublicKey;
  createdUnixSeconds: number;
  lastTransactedSeconds: number;
  takerSellCount: number;
  takerBuyCount: number;
  nftsHeld: number;
  nftAuthority: PublicKey;
  stats: PoolStatsAnchor;
  margin: PublicKey | null;
  //
  poolConfig: PoolConfigAnchor;
  allowedCount: number; // nfts count allowed to buy
  totalAmount: number; // total bid SOL amount
  initialPrice: number; // initial bid side price
  currentHighestBidPrice: number;
  currentLowestBidPrice: number;

  steps: number[];
};

export const getPools = async (
  conn: Connection,
  swapSdk: TensorSwapSDK,
  collectionUuid: string
): Promise<{
  bids: PoolBid[];
  listings: PoolAnchor[];
}> => {
  let startDate = performance.now();
  const whitelist = getWhitelistByUuid(collectionUuid);

  console.log("Whitelist:", whitelist.toBase58());
  console.log("Fetching pools...");

  const pools = (
    await conn.getParsedProgramAccounts(TSWAP_PROGRAM_ID, {
      filters: [
        {
          dataSize: 293,
        },
        {
          memcmp: {
            bytes: whitelist.toBase58(), // whitelist
            offset: 103,
          },
        },
      ],
    })
  )
    .map((a) => {
      const decoded = swapSdk.decode(a.account as AccountInfo<Buffer>);
      if (!decoded) {
        return null;
      }
      return {
        ...decoded,
        pubkey: a.pubkey,
      };
    })
    .filter((a) => a?.name === "pool") as unknown as {
    name: "pool";
    account: PoolAnchor;
    pubkey: PublicKey;
  }[];

  let endDate = performance.now();

  console.log(
    `[Pools parsing] Fetched ${pools.length} pools, took (${
      Math.round(((endDate - startDate) / 1000) * 100) / 100
    } sec)`
  );

  let bids: PoolBid[] = [];
  let listings: PoolAnchor[] = [];

  const poolSolAccounts = pools
    .filter((p) => p.account.config.poolType !== PoolTypeAnchor.NFT)
    .map(({ account }) => (account.margin !== null ? account.margin : account.solEscrow));

  const balances = await getLamportsSolBalances(poolSolAccounts, conn);

  for (const { account: pool, pubkey } of pools) {
    const config = castPoolConfigAnchor(pool.config);

    if (config.poolType === PoolType.NFT) {
      listings.push(pool);
    } else {
      const solBalanceAccount = pool.margin != null ? pool.margin : pool.solEscrow;

      // retrieve amount of possible bids, total lamports needed for that amount of bids and initial price of the pool
      const { allowedCount, totalAmount, initialPrice } = computeMakerAmountCount({
        config,
        desired: { total: new BN(balances[solBalanceAccount.toBase58()]) },
        maxCountWhenInfinite: 1000,
        takerSide: TakerSide.Sell,
        extraNFTsSelected: 0,
        takerSellCount: pool.takerSellCount,
        takerBuyCount: pool.takerBuyCount,
        maxTakerSellCount: pool.maxTakerSellCount,
        statsTakerSellCount: pool.stats.takerSellCount,
        statsTakerBuyCount: pool.stats.takerBuyCount,
        marginated: pool.margin !== null,
      });

      const minPriceLamports = 0.005 * LAMPORTS_PER_SOL;

      // return early if amount of possible bids is 0 or very small price
      if (
        !allowedCount ||
        !initialPrice ||
        totalAmount.toNumber() < minPriceLamports ||
        initialPrice.toNumber() < minPriceLamports
      ) {
        continue;
      }

      // retrieve initial highest bid price if pool is double sided (config.startingPrice would be the initial lowest list price in that case)
      let startingPriceBidSide: Big;
      if (config.poolType == PoolType.Trade) {
        // on linear curve type, subtract delta once and multiply by (1 - mmFee)
        if (config.curveType == CurveType.Linear) {
          startingPriceBidSide = config.startingPrice
            .sub(config.delta)
            .mul(Big(1).sub(Big(config.mmFeeBps!).div(Big(HUNDRED_PCT_BPS))));
        }

        // on exponential curve type, divide by (1 + delta) once and multiply by (1 - mmFee)
        else if (config.curveType == CurveType.Exponential) {
          startingPriceBidSide = config.startingPrice
            .div(Big(1).add(config.delta.div(Big(HUNDRED_PCT_BPS))))
            .mul(Big(1).sub(Big(config.mmFeeBps!).div(Big(HUNDRED_PCT_BPS))));
        }
      }

      // else if one-sided bidding-only pool, config.startingPrice matches initial highest bid already
      else if (config.poolType == PoolType.Token) {
        startingPriceBidSide = config.startingPrice;
      }

      // get the current lowest bid price by shifting price down by allowedCountWithLimit - 1 (since arg = 0 would be the initial highest bid) + pool.takerSellCount - pool.takerBuyCount (to do x less steps depending on how many bids already got fulfilled)
      const currentLowestBidPrice = shiftPriceByDelta(
        config.curveType,
        startingPriceBidSide!,
        config.delta,
        "down",
        allowedCount - 1 + pool.takerSellCount - pool.takerBuyCount
      );

      let steps = [
        initialPrice!.toNumber() / LAMPORTS_PER_SOL,
        ...shiftPriceByDeltaArr(
          config.curveType,
          startingPriceBidSide!,
          config.delta,
          "down",
          allowedCount - 1 + pool.takerSellCount - pool.takerBuyCount
        ).map((p) => p.toNumber() / LAMPORTS_PER_SOL),
      ];

      if (steps.length > 10 && steps[10] < minPriceLamports / LAMPORTS_PER_SOL) {
        // prevent too long small stairs
        steps = steps.slice(0, 10);
      }

      // get the highest bid price by shifting up or down x times depending on how many bids already got fulfilled
      var currentHighestBidPrice =
        pool.takerSellCount - pool.takerBuyCount >= 0
          ? shiftPriceByDelta(
              config.curveType,
              startingPriceBidSide!,
              config.delta,
              "down",
              pool.takerSellCount - pool.takerBuyCount
            )
          : shiftPriceByDelta(
              config.curveType,
              startingPriceBidSide!,
              config.delta,
              "up",
              (pool.takerSellCount - pool.takerBuyCount) * -1
            );

      bids.push({
        pubkey,
        createdUnixSeconds: pool.createdUnixSeconds.toNumber(),
        lastTransactedSeconds: pool.lastTransactedSeconds.toNumber(),
        owner: pool.owner,
        takerSellCount: pool.takerSellCount,
        takerBuyCount: pool.takerBuyCount,
        nftsHeld: pool.nftsHeld,
        nftAuthority: pool.nftAuthority,
        stats: pool.stats,
        margin: pool.margin,
        poolConfig: pool.config,
        ///
        allowedCount,
        totalAmount: totalAmount.toNumber() / LAMPORTS_PER_SOL,
        initialPrice: initialPrice!.toNumber() / LAMPORTS_PER_SOL,
        currentLowestBidPrice: currentLowestBidPrice.toNumber() / LAMPORTS_PER_SOL,
        currentHighestBidPrice: currentHighestBidPrice.toNumber() / LAMPORTS_PER_SOL,
        ///
        steps,
      });
    }
  }

  bids.sort((a, b) => b.initialPrice - a.initialPrice);

  console.log(`Processed ${bids.length} bids, ${listings.length} listings`);

  return { bids, listings };
};
