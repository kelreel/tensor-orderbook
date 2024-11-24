import { Connection, PublicKey } from "@solana/web3.js";
import { TENSORSWAP_ADDR, TensorSwapSDK, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";
import { conn, swapSdk, wlSdk } from "./common";
import { COLLECTION_UUID, getWhitelistByUuid } from "./utils";
import { writeFile } from "fs";

type Params = {
  conn: Connection;
  swapSdk: TensorSwapSDK;
  wlSdk: TensorWhitelistSDK;
  collectionUuid: string;
};

// listen wl txs
const listerTxs = async ({ conn, swapSdk, wlSdk, collectionUuid }: Params) => {
  const whitelist = getWhitelistByUuid(collectionUuid);
  conn.onLogs(whitelist, async (logs, context) => {
    const { signature } = logs;
    try {
      const txDetails = await conn.getTransaction(signature, {
        commitment: "confirmed",
      });

      if (!txDetails) return;
      writeFile(
        `./${signature}.json`,
        JSON.stringify({ signature, txDetails, message: txDetails.transaction.message }, null, 2),
        (err) => {}
      );

      console.log(txDetails.transaction.message.instructions);
    } catch (err) {
      console.error("Error processing transaction:", err);
    }
  });
};

listerTxs({ conn, swapSdk, wlSdk, collectionUuid: COLLECTION_UUID.PROJECT89 });
