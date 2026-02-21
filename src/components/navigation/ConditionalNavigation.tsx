'use client';

import { usePathname } from 'next/navigation';
import { MainNavigation } from './MainNavigation';

interface ConditionalNavigationProps {
  children: React.ReactNode;
}

export function ConditionalNavigation({ children }: ConditionalNavigationProps) {
  const pathname = usePathname();
  
  // Páginas especiais que NÃO precisam de MainNavigation
  const excludedRoutes = [
    '/login',
    '/signup',
    '/404',
    '/500',
    '/whitepaper'
  ];

  
  // Verificar se a rota atual deve ser excluída
  const shouldExcludeNavigation = excludedRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );
  
  return (
    <>
      {/* Mostrar MainNavigation em TODAS as páginas exceto as excluídas */}
      {!shouldExcludeNavigation && <MainNavigation />}
      {children}
    </>
  );
}