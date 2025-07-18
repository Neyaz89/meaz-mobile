import React, { memo, useCallback } from 'react';
import { FlatList, FlatListProps } from 'react-native';

interface OptimizedFlatListProps<T> extends FlatListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
}

function OptimizedFlatListComponent<T>({
  data,
  keyExtractor,
  renderItem,
  ...props
}: OptimizedFlatListProps<T>) {
  const getItemLayout = useCallback(
    (data: T[] | null | undefined, index: number) => ({
      length: 100, // Estimated item height
      offset: 100 * index,
      index,
    }),
    []
  );

  const memoizedRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => renderItem({ item, index }),
    [renderItem]
  );

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={memoizedRenderItem}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      {...props}
    />
  );
}

export const OptimizedFlatList = memo(OptimizedFlatListComponent) as <T>(
  props: OptimizedFlatListProps<T>
) => React.ReactElement;