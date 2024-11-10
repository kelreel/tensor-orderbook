export const chunkArrayInGroups = <T>(arr: T[], size: number): T[][] => {
  const result = [];
  let temp = [];

  for (let a = 0; a < arr.length; a++) {
    // @ts-ignore
    temp.push(arr[a]);
    if (a % size === size - 1) {
      // @ts-ignore
      result.push(temp);
      temp = [];
    }
  }
  // @ts-ignore
  if (temp.length > 0) result.push(temp);
  return result;
};
