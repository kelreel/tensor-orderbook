import { Metaplex, PublicKey } from "@metaplex-foundation/js";
import { Connection } from "@solana/web3.js";
import { findWhitelistPDA, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";

export const getCollectionAccountFromNftMint = async (
  nftMintAddress: PublicKey,
  conn: Connection
): Promise<PublicKey | null> => {
  const metaplex = Metaplex.make(conn);
  const nft = await metaplex.nfts().findByMint({ mintAddress: nftMintAddress });

  return nft?.collection?.address || null;
};

export const getCollectionAccountFromUuid = async (
  uuid: string,
  wlSdk: TensorWhitelistSDK
): Promise<PublicKey | null> => {
  const uuidArray = Buffer.from(uuid.replaceAll("-", "")).toJSON().data;
  const whitelist = findWhitelistPDA({ uuid: uuidArray })[0];

  console.log(`Tensor WL account`, whitelist.toBase58());

  const wl = await wlSdk.fetchWhitelist(whitelist);
  return wl.voc || null;
};

// (async function () {
//   const collectionAccount = await getCollectionAccountFromNftMint(
//     new PublicKey("AZHVLDhX76wf6na7Nk6YFAHoqfSkxCTkHXQTnbGzzWAZ"), // madlad
//     conn
//   );
//   console.log(collectionAccount);
// })();
