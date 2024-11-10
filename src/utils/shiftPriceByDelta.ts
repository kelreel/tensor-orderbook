import { CurveType } from "@tensor-oss/tensorswap-sdk";
import Big from "big.js";

const HUNDRED_PCT_BPS = 100_00;

export const shiftPriceByDelta = (
  curveType: CurveType,
  startingPrice: Big,
  delta: Big,
  direction: "up" | "down",
  times: number
): Big => {
  switch (curveType) {
    case CurveType.Exponential:
      switch (direction) {
        // price * (1 + delta)^trade_count
        case "up":
          return startingPrice.mul(new Big(1).add(delta.div(HUNDRED_PCT_BPS)).pow(times));
        case "down":
          return startingPrice.div(new Big(1).add(delta.div(HUNDRED_PCT_BPS)).pow(times));
      }
      break;
    case CurveType.Linear:
      switch (direction) {
        case "up":
          return startingPrice.add(delta.mul(times));
        case "down":
          return startingPrice.sub(delta.mul(times));
      }
  }
};
