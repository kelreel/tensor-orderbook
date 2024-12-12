export const chunkArrayInGroups = <T>(arr: T[], size: number): T[][] => {
  if (size <= 0) {
    throw new Error("Size must be a positive number.");
  }

  return arr.reduce((result: T[][], item, index) => {
    const chunkIndex = Math.floor(index / size);
    
    if (!result[chunkIndex]) {
      result[chunkIndex] = [];
    }
    
    result[chunkIndex].push(item);
    return result;
  }, []);
};
