import { Connection, PublicKey } from "@solana/web3.js";
import { TensorSwapSDK, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";
import { getPools } from "./getPools";
import { getSingleListings, SingleListing } from "./getSingleListings";
import { writeFile } from "fs";

type OrderType = "bid" | "ask";

type GroupedOrder = {
  price: number;
  nftCount: number;
  type: OrderType;
};

type Order = {
  pubkey: PublicKey;
  initialPrice: number;
  nftCount: number;
  type: OrderType;
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
  collectionUuid: string;
  withListings?: boolean;
  precision?: number;
};

export const makeCollectionOrderbook = async ({
  conn,
  swapSdk,
  wlSdk,
  collectionUuid,
  withListings = false,
  precision = 0.001,
}: Params): Promise<Orderbook> => {
  // TODO: also use mm orders from pools
  const { bids } = await getPools(conn, swapSdk, collectionUuid);

  writeFile("./bids.json", JSON.stringify(bids, null, 2), (err) => {});

  let listings: SingleListing[] = [];
  if (withListings) {
    listings = await getSingleListings({ conn, swapSdk, wlSdk, collectionUuid: collectionUuid });
  }

  const groupedBidOrders = new Map<number, number>();
  const groupedAskOrders = new Map<number, number>();

  bids.forEach((bid) => {
    bid.steps.forEach((price) => {
      price = Math.round((price * 1) / precision) / (1 / precision);
      if (groupedBidOrders.has(price)) {
        groupedBidOrders.set(price, groupedBidOrders.get(price)! + 1);
      } else {
        groupedBidOrders.set(price, 1);
      }
    });
  });

  listings.forEach(({ solPrice }) => {
    const price = Math.round((solPrice * 1) / precision) / (1 / precision);
    if (groupedAskOrders.has(price)) {
      groupedAskOrders.set(price, groupedAskOrders.get(price)! + 1);
    } else {
      groupedAskOrders.set(price, 1);
    }
  });

  const groupedBids = [...groupedBidOrders.entries()].map(([price, nftCount]) => ({
    price,
    nftCount,
    type: "bid" as OrderType,
  }));
  groupedBids.sort((a, b) => b.price - a.price);

  const groupedAsks = [...groupedAskOrders.entries()].map(([price, nftCount]) => ({
    price,
    nftCount,
    type: "ask" as OrderType,
  }));
  groupedAsks.sort((a, b) => a.price - b.price);

  const maxBidPrice = groupedBids[0]?.price;
  const minAskPrice = groupedAsks[0]?.price || 0;
  const spread = minAskPrice ? minAskPrice - maxBidPrice : 0;

  return {
    spread,
    minAskPrice,
    maxBidPrice,
    groupedBids,
    groupedAsks,
    bids: bids.map((bid) => ({
      pubkey: bid.pubkey,
      initialPrice: bid.initialPrice,
      nftCount: bid.allowedCount,
      type: "bid",
    })),
    asks: listings.map((listing) => ({
      pubkey: listing.pubkey,
      initialPrice: listing.solPrice,
      nftCount: 1,
      type: "ask",
    })),
  };
};
