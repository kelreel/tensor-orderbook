import { BidPoolData } from "../getPools";

type Order = {
  price: number;
  amount: number;
};

export const makeOrderbook = (bids: BidPoolData[], precision: number): Order[] => {
  const orders: Record<number, number> = {};

  const sortedBids = [...bids].sort((a, b) => b.nums.initialPrice - a.nums.initialPrice);

  sortedBids.forEach((bid) => {
    bid.nums.steps.forEach((price) => {
      price = Math.round((price * 1) / precision) / (1 / precision);
      if (orders[price]) {
        orders[price] += 1;
      } else {
        orders[price] = 1;
      }
    });
  });

  const orderbook = Object.entries(orders).map(([price, amount]) => ({
    price: parseFloat(price),
    amount: amount,
  }));

  orderbook.sort((a, b) => b.price - a.price);

  return orderbook;
};
