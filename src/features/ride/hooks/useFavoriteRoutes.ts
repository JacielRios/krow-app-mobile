import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { routeApi, SaveFavoriteRoutePayload } from '../api/routeApi';

export function useFavoriteRoutes() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['favorite-routes'],
    queryFn: routeApi.favorites,
  });
  const createMutation = useMutation({
    mutationFn: routeApi.createFavorite,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['favorite-routes'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      routeId,
      payload,
    }: {
      routeId: string;
      payload: SaveFavoriteRoutePayload;
    }) => routeApi.updateFavorite(routeId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['favorite-routes'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: routeApi.deleteFavorite,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['favorite-routes'] }),
  });

  return {
    favorites: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
    createFavorite: createMutation.mutateAsync,
    updateFavorite: updateMutation.mutateAsync,
    deleteFavorite: deleteMutation.mutateAsync,
    saving: createMutation.isPending || updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}
