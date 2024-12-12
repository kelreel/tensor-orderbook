import { CurveType, HUNDRED_PCT_BPS } from "@tensor-oss/tensorswap-sdk";
import Big from "big.js";

type Direction = "up" | "down";

export const shiftPriceByDelta = (
  curveType: CurveType,
  startingPrice: Big,
  delta: Big,
  direction: Direction,
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

export const shiftPriceByDeltaArr = (
  curveType: CurveType,
  startingPrice: Big,
  delta: Big,
  direction: Direction,
  times: number
): Big[] => {
  const prices: Big[] = [];
  for (let i = 1; i <= times; i++) {
    prices.push(shiftPriceByDelta(curveType, startingPrice, delta, direction, i));
  }
  return prices;
}
