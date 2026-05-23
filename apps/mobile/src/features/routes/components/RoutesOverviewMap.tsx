import React from 'react';
import { Platform } from 'react-native';

export interface RoutesOverviewMapProps {
  routes: import('../types').Route[];
  onDeleteRoute?: (routeId: string) => void;
  onEditRoute?: (routeId: string) => void;
  onInteractionEnd?: () => void;
  onInteractionStart?: () => void;
}

const RoutesOverviewMapBase = (Platform.OS === 'web'
  ? require('./RoutesOverviewMap.web').RoutesOverviewMap
  : require('./RoutesOverviewMap.native').RoutesOverviewMap) as React.ComponentType<RoutesOverviewMapProps>;

export const RoutesOverviewMap = React.memo(RoutesOverviewMapBase);