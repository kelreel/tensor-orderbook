import { writeFile } from "fs";
import { conn, swapSdk } from "./common";
import { getPools } from "./getPools";
import { makeOrderbook } from "./utils/makeOrderbook";

const RETARDIO_COUSINS_UUID = "ac3c5fb8-e8b5-41e5-b744-7df52b38ddbd"; // retardio cousins

export const main = async () => {
  const { bids, listings } = await getPools(conn, swapSdk, RETARDIO_COUSINS_UUID);

  const sortedBids = [...bids].sort((a, b) => b.nums.initialPrice - a.nums.initialPrice);

  const orderbook = makeOrderbook(bids, 0.01);
  console.log(orderbook);

  writeFile(`./bids-${new Date().toISOString()}.json`, JSON.stringify(sortedBids, null, 2), (err) => {
    if (err) {
      console.error(err);
    }
  });

  writeFile(`./listings-${new Date().toISOString()}.json`, JSON.stringify(listings, null, 2), (err) => {
    if (err) {
      console.error(err);
    }
  });
};

main();
