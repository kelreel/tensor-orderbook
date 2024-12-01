import { AccountInfo, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TSWAP_PROGRAM_ID } from "@tensor-hq/tensor-common";
import { SingleListingAnchor, TensorSwapSDK, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";
import { getCollectionAccountFromUuid } from "./utils";
import { getAllMints } from "./utils/getAllMints";

type Params = {
  conn: Connection;
  swapSdk: TensorSwapSDK;
  wlSdk: TensorWhitelistSDK;
  collectionUuid: string;
};

export type SingleListing = {
  solPrice: number;
  pubkey: PublicKey;
};

export const getSingleListings = async ({ conn, swapSdk, wlSdk, collectionUuid }: Params): Promise<SingleListing[]> => {
  let startDate = performance.now();

  const collectionAccount = await getCollectionAccountFromUuid(collectionUuid, wlSdk);
  console.log(`Collection acc: ${collectionAccount?.toBase58()}`);

  if (!collectionAccount) {
    throw new Error(`Collection account not found for uuid ${collectionUuid}`);
  }

  console.log("fetching listings... it may take a while");

  // TODO: also parse TComp bids (v2 migration)

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

  // TODO: fetch only used mints
  // see https://discord.com/channels/953488546608599071/1032404803365642331/1305642380325556365

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
