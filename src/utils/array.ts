export const chunkArrayInGroups = <T>(arr: T[], size: number): T[][] => {
  if (size <= 0) {
    throw new Error("Size must be a positive number.");
  }

  const result: T[][] = [];
  let temp: T[] = [];

  arr.forEach((item, index) => {
    temp.push(item);
    if ((index + 1) % size === 0) {
      result.push(temp);
      temp = [];
    }
  });

  if (temp.length > 0) {
    result.push(temp);
  }

  return result;
};
