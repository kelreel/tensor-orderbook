import { AccountInfo, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TSWAP_PROGRAM_ID } from "@tensor-hq/tensor-common";
import { SingleListingAnchor, TensorSwapSDK, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";
import { writeFile } from "fs";
import { conn, swapSdk, wlSdk } from "./common";
import { getCollectionAccountFromUuid } from "./utils";
import { getAllMints } from "./utils/getAllMints";

type Params = {
  conn: Connection;
  swapSdk: TensorSwapSDK;
  wlSdk: TensorWhitelistSDK;
  COLLECTION_UUID: string;
};

type SingleListing = {
  solPrice: number;
  pubkey: PublicKey;
};

export const getSingleListings = async ({
  conn,
  swapSdk,
  wlSdk,
  COLLECTION_UUID,
}: Params): Promise<SingleListing[]> => {
  let startDate = performance.now();
  const collectionAccount = await getCollectionAccountFromUuid(COLLECTION_UUID, wlSdk);
  console.log(`Collection acc: ${collectionAccount?.toBase58()}`);

  if (!collectionAccount) {
    throw new Error(`Collection account not found for uuid ${COLLECTION_UUID}`);
  }

  console.log("fetching listings... it may take a while");

  // offset 8 - owner,
  // offset 40 - nftMint
  const accounts = await conn.getParsedProgramAccounts(TSWAP_PROGRAM_ID, {
    filters: [
      {
        dataSize: 145,
      },
    ],
  });

  const listingAccounts = accounts
    .map((a) => {
      const decoded = swapSdk.decode(a.account as AccountInfo<Buffer>);
      if (!decoded) {
        return null;
      }
      return {
        ...decoded,
        pubkey: a.pubkey,
      };
    })
    .filter((a) => a?.name === "singleListing") as unknown as {
    name: "singleListing";
    account: SingleListingAnchor;
    pubkey: PublicKey;
  }[];
  let endDate = performance.now();

  endDate = performance.now();
  console.log(
    `found ${listingAccounts.length} single listings for all collections, took (${
      Math.round(((endDate - startDate) / 1000) * 100) / 100
    } sec)`
  );

  startDate = performance.now();
  const nftMints = new Set(await getAllMints(collectionAccount));
  const filteredListingAccounts = listingAccounts.filter(
    (acc) => acc.name === "singleListing" && nftMints.has(acc.account.nftMint.toBase58())
  );
  endDate = performance.now();

  console.log(
    `Selected ${filteredListingAccounts.length} listings for current collection, took (${
      Math.round(((endDate - startDate) / 1000) * 100) / 100
    } sec)`
  );

  return filteredListingAccounts
    .map((a) => ({ pubkey: a.pubkey, solPrice: a.account.price.toNumber() / LAMPORTS_PER_SOL }))
    .sort((a, b) => a.solPrice - b.solPrice);
};

getSingleListings({ conn, swapSdk, wlSdk, COLLECTION_UUID: "bd366797-5599-417a-be03-1e43a7e3fb90" }).then((data) => {
  writeFile(`./listings-${new Date().toISOString()}.json`, JSON.stringify(data, null, 2), (err) => {});
});
