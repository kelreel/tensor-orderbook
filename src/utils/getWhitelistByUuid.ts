import { findWhitelistPDA } from "@tensor-oss/tensorswap-sdk";

export const getWhitelistByUuid = (uuid: string) => {
  const uuidArray = Buffer.from(uuid.replaceAll("-", "")).toJSON().data;
  return findWhitelistPDA({ uuid: uuidArray })[0];
};
