import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { TensorSwapSDK, TensorWhitelistSDK } from "@tensor-oss/tensorswap-sdk";
import bs58 from "bs58";

export const keypair = Keypair.fromSecretKey(bs58.decode(process.env.private_key!));
export const conn = new Connection(process.env.network_url!);
export const provider = new AnchorProvider(conn, new Wallet(keypair));
export const swapSdk = new TensorSwapSDK({ provider });
export const wlSdk = new TensorWhitelistSDK({ provider });
