import { Metaplex, PublicKey } from "@metaplex-foundation/js";
import { Connection } from "@solana/web3.js";
import { findWhitelistPDA, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";
import { getWhitelistByUuid } from "./getWhitelistByUuid";

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
  const whitelist = getWhitelistByUuid(uuid);

  console.log(`Tensor WL account`, whitelist.toBase58());

  const wl = await wlSdk.fetchWhitelist(whitelist);
  return wl.voc || null;
};
