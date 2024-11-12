import { Connection, PublicKey } from "@solana/web3.js";
import { TensorSwapSDK, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";
import { getPools } from "./getPools";
import { getSingleListings, SingleListing } from "./getSingleListings";

type OrderType = "bid" | "ask";

type GroupedOrder = {
  price: number;
  amount: number;
  type: OrderType;
};

type Order = GroupedOrder & {
  pubkey: PublicKey;
};

type Orderbook = {
  groupedBids: GroupedOrder[];
  groupedAsks: GroupedOrder[];
  bids: Order[];
  asks: Order[];
  maxBidPrice: number;
  minAskPrice: number;
  spread: number;
};

type Params = {
  conn: Connection;
  swapSdk: TensorSwapSDK;
  wlSdk: TensorWhitelistSDK;
  COLLECTION_UUID: string;
  withListings?: boolean;
  precision?: number;
};

export const makeCollectionOrderbook = async ({
  conn,
  swapSdk,
  wlSdk,
  COLLECTION_UUID,
  withListings = false,
  precision = 0.001,
}: Params): Promise<Orderbook> => {
  // TODO: also use mm orders (pools)
  const { bids } = await getPools(conn, swapSdk, COLLECTION_UUID);

  let listings: SingleListing[] = [];

  if (withListings) {
    listings = await getSingleListings({ conn, swapSdk, wlSdk, COLLECTION_UUID });
  }

  const groupedBidOrders: Record<number, number> = {};
  const groupedAskOrders: Record<number, number> = {};

  bids.forEach((bid) => {
    bid.nums.steps.forEach((price) => {
      price = Math.round((price * 1) / precision) / (1 / precision);
      if (groupedBidOrders[price]) {
        groupedBidOrders[price] += 1;
      } else {
        groupedBidOrders[price] = 1;
      }
    });
  });

  listings.forEach(({ solPrice }) => {
    const price = Math.round((solPrice * 1) / precision) / (1 / precision);
    if (groupedAskOrders[price]) {
      groupedAskOrders[price] += 1;
    } else {
      groupedAskOrders[price] = 1;
    }
  });

  const groupedBids = Object.entries(groupedBidOrders)
    .sort((a, b) => b[1] - a[1])
    .map(([price, amount]) => ({
      price: Number(price),
      amount,
      type: "bid" as OrderType,
    }));

  const groupedAsks = Object.entries(groupedAskOrders)
    .sort((a, b) => a[1] - b[1])
    .map(([price, amount]) => ({
      price: Number(price),
      amount,
      type: "ask" as OrderType,
    }));

  const maxBidPrice = groupedBids[0].price;
  const minAskPrice = groupedAsks[0].price || 0;
  const spread = minAskPrice ? minAskPrice - maxBidPrice : 0;

  return {
    groupedBids,
    groupedAsks,
    bids: bids.map((bid) => ({
      type: "bid",
      pubkey: bid.pubkey,
      price: bid.nums.initialPrice,
      amount: bid.nums.totalAmount,
    })),
    asks: listings.map((listing) => ({
      type: "ask",
      pubkey: listing.pubkey,
      price: listing.solPrice,
      amount: 1,
    })),
    maxBidPrice,
    minAskPrice,
    spread,
  };
};
