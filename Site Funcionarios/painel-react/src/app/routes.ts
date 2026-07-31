import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './components/LoginPage';

const Dashboard = withSuspense(lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard }))));
const PublicSiteEditor = withSuspense(lazy(() => import('./components/PublicSiteEditor').then((module) => ({ default: module.PublicSiteEditor }))));
const TeamSiteEditor = withSuspense(lazy(() => import('./components/TeamSiteEditor').then((module) => ({ default: module.TeamSiteEditor }))));
const RolesManager = withSuspense(lazy(() => import('./components/RolesManager').then((module) => ({ default: module.RolesManager }))));
const StaffManager = withSuspense(lazy(() => import('./components/StaffManager').then((module) => ({ default: module.StaffManager }))));
const Inscriptions = withSuspense(lazy(() => import('./components/Inscriptions').then((module) => ({ default: module.Inscriptions }))));
const Accreditation = withSuspense(lazy(() => import('./components/Accreditation').then((module) => ({ default: module.Accreditation }))));
const Reports = withSuspense(lazy(() => import('./components/Reports').then((module) => ({ default: module.Reports }))));
const Settings = withSuspense(lazy(() => import('./components/Settings').then((module) => ({ default: module.Settings }))));
const NotFound = withSuspense(lazy(() => import('./components/NotFound').then((module) => ({ default: module.NotFound }))));

function withSuspense(Component: React.ComponentType) {
  return function SuspendedRoute() {
    return React.createElement(
      Suspense,
      {
        fallback: React.createElement(
          'div',
          { className: 'min-h-[60vh] content-center text-center text-sm text-muted-foreground' },
          'Carregando...'
        ),
      },
      React.createElement(Component)
    );
  };
}

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    path: '/',
    Component: AdminLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'site-publico', Component: PublicSiteEditor },
      { path: 'site-equipe', Component: TeamSiteEditor },
      { path: 'cargos', Component: RolesManager },
      { path: 'funcionarios', Component: StaffManager },
      { path: 'inscricoes', Component: Inscriptions },
      { path: 'credenciamento', Component: Accreditation },
      { path: 'relatorios', Component: Reports },
      { path: 'configuracoes', Component: Settings },
    ],
  },
  { path: '*', Component: NotFound },
], { basename: '/funcionarios' });