import { writeFile } from "fs";
import { COLLECTION_UUID, makeCollectionOrderbook } from "../src";
import { conn, swapSdk, wlSdk } from "../src/common";

const main = async () => {
  const orderbook = await makeCollectionOrderbook({
    conn,
    swapSdk,
    wlSdk,
    collectionUuid: COLLECTION_UUID.MADLADS,
    precision: 0.01,
    withListings: false,
  });

  console.log(`Top Bids:`, orderbook.groupedBids);

  writeFile("./examples/bids-orderbook.json", JSON.stringify(orderbook, null, 2), (err) => {});
};

main();
