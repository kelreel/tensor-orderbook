import { Account, AccountInfo, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { chunkArrayInGroups } from "./array";
import { conn } from "../common";

export const getLamportsSolBalances = async (accounts: PublicKey[]): Promise<Record<string, number>> => {
  // TODO: ensure we don't hit rate limits and filter duplicates
  const chunks = chunkArrayInGroups(accounts, 100);

  const balancesArr: Array<AccountInfo<Buffer> & { pubkey: PublicKey }> = [];
  const balances: Record<string, number> = {};

  let count = 0;
  for (const [, chunk] of chunks.entries()) {
    let sols = (await conn.getMultipleAccountsInfo(chunk)).filter((acc) => !!acc);
    sols = sols.map((acc, idx) => ({ ...acc, pubkey: chunk[idx] }));
    // @ts-ignore
    balancesArr.push(...sols);
    count += sols.length;

    console.log(`fetched ${count}/${accounts.length} account balances`);
  }

  for (const acc of balancesArr) {
    balances[acc.pubkey!.toBase58()] = acc.lamports;
  }

  return balances;
};
