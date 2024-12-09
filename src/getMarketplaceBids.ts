import { Connection, PublicKey } from "@solana/web3.js";
import { COLLECTION_UUID, getWhitelistByUuid } from "./utils";
import { conn } from "./common";
import { writeFile } from "fs";

const TensorCNFT = new PublicKey(`TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp`);

export const getMarketplaceBids = async (conn: Connection, collectionUuid: string) => {
  const whitelist = getWhitelistByUuid(collectionUuid);

  return await conn.getParsedProgramAccounts(TensorCNFT, {
    filters: [
      {
        dataSize: 426,
      },
      {
        memcmp: {
          bytes: whitelist.toBase58(), // whitelist
          offset: 75,
        },
      },
    ],
  });
};

// getMarketplaceBids(conn, COLLECTION_UUID.PROJECT89).then((data) => {
//   console.log(data);
//   writeFile("bids.json", JSON.stringify(data, null, 2), (err) => {});
// });
