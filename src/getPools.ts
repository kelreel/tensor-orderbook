import { BN } from "@coral-xyz/anchor";
import { getLamportsSolBalances, shiftPriceByDelta, shiftPriceByDeltaArr } from "./utils";
import {
  castPoolConfigAnchor,
  computeMakerAmountCount,
  CurveType,
  findWhitelistPDA,
  HUNDRED_PCT_BPS,
  PoolAnchor,
  PoolType,
  PoolTypeAnchor,
  TakerSide,
  TensorSwapSDK,
} from "@tensor-oss/tensorswap-sdk";
import Big from "big.js";
import { TSWAP_PROGRAM_ID } from "@tensor-hq/tensor-common";
import { AccountInfo, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export type BidPoolDataRaw = PoolAnchor & {
  pubkey: PublicKey;
  allowedCount: number;
  totalAmount: BN;
  initialPrice: BN;
  currentLowestBidPrice: any;
  currentHighestBidPrice: any;
  steps: Big[];
};

export type BidPoolData = BidPoolDataRaw & {
  nums: {
    initialPrice: number;
    currentHighestBidPrice: number;
    currentLowestBidPrice: number;
    allowedCount: number;
    lastTransactedSeconds: number;
    totalAmount: number;
    steps: number[];
  };
};

export const getPools = async (
  conn: Connection,
  swapSdk: TensorSwapSDK,
  COLLECTION_UUID: string
): Promise<{
  bids: BidPoolData[];
  listings: PoolAnchor[];
}> => {
  let startDate = performance.now();
  console.log("fetching pools...");

  const uuidArray = Buffer.from(COLLECTION_UUID.replaceAll("-", "")).toJSON().data;
  const whitelist = findWhitelistPDA({ uuid: uuidArray })[0];

  console.log("whitelist", whitelist.toBase58());

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

  console.log(`found ${pools.length} pools, took (${Math.round(((endDate - startDate) / 1000) * 100) / 100} sec)`);

  let rawBids: BidPoolDataRaw[] = [];
  let listings: PoolAnchor[] = [];

  const bidSolAccounts = pools
    .filter((p) => p.account.config.poolType !== PoolTypeAnchor.NFT)
    .map(({ account }) => (account.margin !== null ? account.margin : account.solEscrow));

  startDate = performance.now();
  const balances = await getLamportsSolBalances(bidSolAccounts, conn);
  endDate = performance.now();

  console.log(
    `fetched ${Object.keys(balances).length} balances, took (${
      Math.round(((endDate - startDate) / 1000) * 100) / 100
    } sec)`
  );

  for (const { account: pool, pubkey } of pools) {
    const config = castPoolConfigAnchor(pool.config);

    if (config.poolType === PoolType.NFT) {
      listings.push(pool);
    } else {
      const solBalanceAccount = pool.margin != null ? pool.margin : pool.solEscrow;

      // retrieve amount of possible bids, total lamports needed for that amount of bids and initial price of the pool
      const { allowedCount, totalAmount, initialPrice } = computeMakerAmountCount({
        desired: { total: new BN(balances[solBalanceAccount.toBase58()]) },
        maxCountWhenInfinite: 1000,
        takerSide: TakerSide.Sell,
        extraNFTsSelected: 0,
        config,
        takerSellCount: pool.takerSellCount,
        takerBuyCount: pool.takerBuyCount,
        maxTakerSellCount: pool.maxTakerSellCount,
        statsTakerSellCount: pool.stats.takerSellCount,
        statsTakerBuyCount: pool.stats.takerBuyCount,
        marginated: pool.margin !== null,
      });

      // return early if amount of possible bids is 0
      if (allowedCount == 0) {
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

      // TODO: refactor, get rid of this
      const steps = [
        new Big(initialPrice!.toNumber()),
        ...shiftPriceByDeltaArr(
          config.curveType,
          startingPriceBidSide!,
          config.delta,
          "down",
          allowedCount - 1 + pool.takerSellCount - pool.takerBuyCount
        ),
      ];

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

      rawBids.push({
        pubkey,
        ...pool,
        allowedCount,
        totalAmount,
        initialPrice: initialPrice as BN,
        currentLowestBidPrice,
        currentHighestBidPrice,
        steps,
      });
    }
  }

  console.log(`Processed ${rawBids.length} bids, ${listings.length} listings`);

  const bids = rawBids
    .map((b) => ({
      ...b,
      nums: {
        initialPrice: b.initialPrice.toNumber() / LAMPORTS_PER_SOL,
        currentHighestBidPrice: b.currentHighestBidPrice.toNumber() / LAMPORTS_PER_SOL,
        currentLowestBidPrice: b.currentLowestBidPrice.toNumber() / LAMPORTS_PER_SOL,
        totalAmount: b.totalAmount.toNumber() / LAMPORTS_PER_SOL,
        allowedCount: b.allowedCount,
        lastTransactedSeconds: b.lastTransactedSeconds.toNumber(),
        steps: b.steps.map((s) => s.toNumber() / LAMPORTS_PER_SOL),
      },
    }))
    .sort((a, b) => b.nums.initialPrice - a.nums.initialPrice);

  return { bids, listings };
};
