import { writeFile } from "fs";
import { makeCollectionOrderbook } from "../src";
import { conn, swapSdk, wlSdk } from "../src/common";

require("dotenv").config();

const MADLADS_UUID = "bd366797-5599-417a-be03-1e43a7e3fb90";
const RETARDIO_COUSINS_UUID = "ac3c5fb8-e8b5-41e5-b744-7df52b38ddbd";

const main = async () => {
  const orderbook = await makeCollectionOrderbook({
    conn,
    swapSdk,
    wlSdk,
    COLLECTION_UUID: MADLADS_UUID,
    precision: 0.001,
    withListings: true, // increase time ~x5
  });

  console.log(orderbook.groupedAsks, orderbook.groupedBids);
  console.log(`Floor: ${orderbook.minAskPrice}, top bid: ${orderbook.maxBidPrice}, spread: ${orderbook.spread} SOL`);

  writeFile("./orderbook.json", JSON.stringify(orderbook, null, 2), (err) => {});
};

main();
