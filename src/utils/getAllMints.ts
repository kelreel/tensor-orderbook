import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { PublicKey } from "@solana/web3.js";

const umi = createUmi(process.env.network_url || "").use(dasApi());

export const getAllMints = async (collectionAccount: PublicKey) => {
  const nftMints: string[] = [];

  let chunk = await umi.rpc.getAssetsByGroup({
    groupKey: "collection",
    groupValue: collectionAccount.toBase58(),
    page: 1,
    limit: 1000,
  });
  nftMints.push(...chunk.items.map((a) => a.id));
  let page = 1;

  console.log(`[DAS-API] fetched NFTs mints: ${chunk.items.length} (page: ${page})`);

  while (chunk.limit === chunk.total) {
    chunk = await umi.rpc.getAssetsByGroup({
      groupKey: "collection",
      groupValue: collectionAccount?.toBase58(),
      page: page++,
    });

    nftMints.push(...chunk.items.map((a) => a.id));
    console.log(chunk.total, chunk.limit);

    console.log(`[DAS-API] fetched NFTs mints: ${nftMints.length}, (page: ${page})`);
  }

  return nftMints;
};
