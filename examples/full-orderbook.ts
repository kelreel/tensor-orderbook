import { writeFile } from "fs";
import { COLLECTION_UUID, makeCollectionOrderbook } from "../src";
import { conn, swapSdk, wlSdk } from "../src/common";

const main = async () => {
  const orderbook = await makeCollectionOrderbook({
    conn,
    swapSdk,
    wlSdk,
    collectionUuid: COLLECTION_UUID.MADLADS,
    precision: 0.1,
    withListings: true, // increase time ~x5
  });

  console.log(`Print top bids, full listings`);
  console.log(orderbook.groupedAsks, orderbook.groupedBids.slice(0, 10));
  console.log(
    `Floor: ${orderbook.minAskPrice}, top bid: ${orderbook.maxBidPrice}, spread: ${
      Math.round(orderbook.spread * 1000) / 1000
    } SOL`
  );

  writeFile("./examples/full-orderbook.json", JSON.stringify(orderbook, null, 2), (err) => {});
};

main();
