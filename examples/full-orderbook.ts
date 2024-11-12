import { writeFile } from "fs";
import { COLLECTION_UUID, makeCollectionOrderbook } from "../src";
import { conn, swapSdk, wlSdk } from "../src/common";

const main = async () => {
  const orderbook = await makeCollectionOrderbook({
    conn,
    swapSdk,
    wlSdk,
    collectionUuid: COLLECTION_UUID.MADLADS,
    precision: 0.001,
    withListings: true, // increase time ~x5
  });

  console.log(orderbook.groupedAsks, orderbook.groupedBids);
  console.log(`Floor: ${orderbook.minAskPrice}, top bid: ${orderbook.maxBidPrice}, spread: ${orderbook.spread} SOL`);

  writeFile("./orderbook.json", JSON.stringify(orderbook, null, 2), (err) => {});
};

main();
