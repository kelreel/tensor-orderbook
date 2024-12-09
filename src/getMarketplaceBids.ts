import { Connection, PublicKey } from "@solana/web3.js";
import { getWhitelistByUuid } from "./utils";

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
